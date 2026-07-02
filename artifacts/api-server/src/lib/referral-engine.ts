import {
  db,
  usersTable,
  referralsTable,
  transactionsTable,
  notificationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export const REFERRER_HP = 500;
export const REFEREE_HP = 250;

/** Drizzle transaction client type inferred from the db instance. */
type TxClient = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

interface NewUserInfo {
  id: number;
  telegramId: string;
  balance: number;
}

/**
 * Atomically process a referral inside an existing Drizzle transaction.
 *
 * Validates:
 *  - referrer exists (caller must verify before passing in)
 *  - not a self-referral (caller must verify before passing in)
 *  - no duplicate referral row (defense-in-depth guard inside)
 *
 * On success writes:
 *  1. referrals row (500 / 250)
 *  2. referrer balance +500  + transaction record
 *  3. new-user balance +250  + transaction record
 *  4. notification for referrer
 *  5. notification for new user
 */
export async function processReferralInTx(
  tx: TxClient,
  referrerTelegramId: string,
  newUser: NewUserInfo,
): Promise<void> {
  // Defense-in-depth: ensure no duplicate referral row for this referee
  const existing = await tx
    .select({ id: referralsTable.id })
    .from(referralsTable)
    .where(eq(referralsTable.refereeTelegramId, newUser.telegramId))
    .limit(1);

  if (existing.length > 0) {
    // Referral already recorded — skip silently (idempotent)
    return;
  }

  // Lock & read referrer's current balance
  const [referrer] = await tx
    .select({ id: usersTable.id, balance: usersTable.balance })
    .from(usersTable)
    .where(eq(usersTable.telegramId, referrerTelegramId))
    .limit(1);

  if (!referrer) {
    // Referrer vanished between validation and now — abort
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
}
