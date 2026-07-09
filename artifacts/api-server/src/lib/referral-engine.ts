import {
  db,
  usersTable,
  referralsTable,
  transactionsTable,
  notificationsTable,
  referralEventsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSettingInTx, SETTING_KEYS } from "./settings";

/** Drizzle transaction client type inferred from the db instance. */
type TxClient = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

interface NewUserInfo {
  id: number;
  telegramId: string;
  balance: number;
}

/** Log a referral event step for production debugging. */
async function logReferralEvent(
  tx: TxClient,
  step: string,
  result: string,
  message?: string,
  referrerTelegramId?: string | null,
  refereeTelegramId?: string,
  source?: string,
) {
  try {
    await tx.insert(referralEventsTable).values({
      referrerTelegramId: referrerTelegramId ?? null,
      refereeTelegramId: refereeTelegramId ?? "unknown",
      step,
      result,
      message: message ?? null,
      source: source ?? null,
    });
  } catch {
    // Never let event logging kill the referral transaction
  }
}

/**
 * Atomically process a referral inside an existing Drizzle transaction.
 *
 * Reads configurable amounts from system_settings.
 * Validates:
 *  - referrer exists (caller must verify before passing in)
 *  - not a self-referral (caller must verify before passing in)
 *  - no duplicate referral row (defense-in-depth guard inside)
 *  - welcome_bonus_enabled setting
 *
 * On success writes:
 *  1. referrals row
 *  2. referrer balance + referral_bonus_amount  + transaction record
 *  3. new-user balance + welcome_bonus_amount   + transaction record
 *  4. notification for referrer
 *  5. notification for new user
 *  6. referral_events row at each step (for production debugging)
 */
export async function processReferralInTx(
  tx: TxClient,
  referrerTelegramId: string,
  newUser: NewUserInfo,
  source?: string,
): Promise<void> {
  // Read configurable settings
  const [enabledStr, referrerHpStr, refereeHpStr] = await Promise.all([
    getSettingInTx(tx, SETTING_KEYS.WELCOME_BONUS_ENABLED),
    getSettingInTx(tx, SETTING_KEYS.REFERRAL_BONUS_AMOUNT),
    getSettingInTx(tx, SETTING_KEYS.WELCOME_BONUS_AMOUNT),
  ]);

  const welcomeBonusEnabled = enabledStr !== "false";
  // Use explicit NaN check so a configured value of 0 is respected (not treated
  // as falsy and replaced with the hardcoded default).
  const parsedReferrerHp = parseInt(referrerHpStr, 10);
  const parsedRefereeHp = parseInt(refereeHpStr, 10);
  const REFERRER_HP = isNaN(parsedReferrerHp) ? 500 : Math.max(0, parsedReferrerHp);
  const REFEREE_HP = isNaN(parsedRefereeHp) ? 250 : Math.max(0, parsedRefereeHp);

  if (!welcomeBonusEnabled) {
    await logReferralEvent(
      tx, "bonus_check", "skipped",
      "welcome_bonus_enabled is false — no rewards issued",
      referrerTelegramId, newUser.telegramId, source,
    );
    return;
  }

  // Defense-in-depth: ensure no duplicate referral row for this referee
  const existing = await tx
    .select({ id: referralsTable.id })
    .from(referralsTable)
    .where(eq(referralsTable.refereeTelegramId, newUser.telegramId))
    .limit(1);

  if (existing.length > 0) {
    await logReferralEvent(
      tx, "duplicate_check", "skipped",
      "Referral already recorded for this referee — idempotent skip",
      referrerTelegramId, newUser.telegramId, source,
    );
    return;
  }

  // Lock & read referrer's current balance
  const [referrer] = await tx
    .select({ id: usersTable.id, balance: usersTable.balance })
    .from(usersTable)
    .where(eq(usersTable.telegramId, referrerTelegramId))
    .limit(1);

  if (!referrer) {
    await logReferralEvent(
      tx, "referrer_lookup", "error",
      "Referrer not found in DB — aborting referral",
      referrerTelegramId, newUser.telegramId, source,
    );
    return;
  }

  const referrerBalanceBefore = referrer.balance;
  const referrerBalanceAfter = referrerBalanceBefore + REFERRER_HP;
  const refereeBalanceBefore = newUser.balance;
  const refereeBalanceAfter = refereeBalanceBefore + REFEREE_HP;

  // 1. Insert referral row
  const [referralRow] = await tx
    .insert(referralsTable)
    .values({
      referrerTelegramId,
      refereeTelegramId: newUser.telegramId,
      referrerHpEarned: REFERRER_HP,
      refereeHpEarned: REFEREE_HP,
    })
    .returning({ id: referralsTable.id });

  const referralId = String(referralRow.id);

  // 2. Update referrer balance
  await tx
    .update(usersTable)
    .set({ balance: referrerBalanceAfter, lastActive: new Date() })
    .where(eq(usersTable.telegramId, referrerTelegramId));

  // 3. Update new user balance
  await tx
    .update(usersTable)
    .set({ balance: refereeBalanceAfter })
    .where(eq(usersTable.id, newUser.id));

  // 4. Transaction for referrer
  await tx.insert(transactionsTable).values({
    telegramId: referrerTelegramId,
    type: "referral",
    amount: REFERRER_HP,
    balanceBefore: referrerBalanceBefore,
    balanceAfter: referrerBalanceAfter,
    description: `Referral reward: invited ${newUser.telegramId}`,
    relatedId: referralId,
  });

  // 5. Transaction for new user
  await tx.insert(transactionsTable).values({
    telegramId: newUser.telegramId,
    type: "referral_bonus",
    amount: REFEREE_HP,
    balanceBefore: refereeBalanceBefore,
    balanceAfter: refereeBalanceAfter,
    description: `Referral welcome bonus from ${referrerTelegramId}`,
    relatedId: referralId,
  });

  // 6. Notification for referrer
  await tx.insert(notificationsTable).values({
    telegramId: referrerTelegramId,
    title: "Referral Reward",
    message: `🎉 You earned ${REFERRER_HP} HP for inviting a new member.`,
    type: "referral",
    relatedEntity: referralId,
  });

  // 7. Notification for new user
  await tx.insert(notificationsTable).values({
    telegramId: newUser.telegramId,
    title: "Welcome Bonus",
    message: `🎉 Welcome! You received ${REFEREE_HP} HP as a referral bonus.`,
    type: "referral_bonus",
    relatedEntity: referralId,
  });

  // 8. Success event
  await logReferralEvent(
    tx, "complete", "success",
    `Referrer +${REFERRER_HP} HP, Referee +${REFEREE_HP} HP. referral_id=${referralId}`,
    referrerTelegramId, newUser.telegramId, source,
  );
}
