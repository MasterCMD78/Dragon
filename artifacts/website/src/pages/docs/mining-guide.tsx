import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

export default function MiningGuide() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Mining Guide | HustleCoin Docs"
        description="How HustleCoin's daily mining, streaks, and multipliers work, and how to maximize your HP earnings."
        path="/docs/mining-guide"
        title="Mining Guide"
        intro="Mining is the core loop of HustleCoin: one tap, once per cycle, rewarded for consistency over time."
      >
        <h2>How mining works</h2>
        <p>
          Every account can mine once per mining cycle. Tapping{" "}
          <strong>Mine</strong> credits HP (Hustle Points) directly to your
          balance. There's no cost, no risk, and no equipment required — mining
          rewards attention and consistency, not spend.
        </p>

        <h2>Streaks</h2>
        <p>
          Mining on consecutive days increases your streak. Higher streaks apply
          a multiplier to your base HP rate, so the same daily action becomes
          more valuable the longer you keep it up.
        </p>
        <p>
          Missing a full day resets your streak back to zero — the biggest gains
          come from steady daily activity rather than occasional bursts.
        </p>

        <h2>Why mining is time-gated</h2>
        <p>
          Mining cycles exist to reward consistent, real engagement rather than
          rapid automated activity. This keeps the leaderboard meaningful and
          protects the value of HP for genuine participants.
        </p>

        <h2>Fair play &amp; anti-bot protection</h2>
        <p>
          HustleCoin actively monitors for multi-accounting, automation, and
          sybil networks around mining and referrals. Accounts found violating
          fair-play rules have their HP reset and are banned from the platform —
          this protects real users' rankings and future ecosystem benefits.
        </p>

        <h2>Maximizing your HP</h2>
        <ul>
          <li>Mine every cycle, every day, to keep your streak alive.</li>
          <li>Complete quests in the Tasks tab for lump-sum HP bonuses.</li>
          <li>Refer active users — see the <Link href="/docs/referral-guide">Referral Guide</Link>.</li>
          <li>Unlock <Link href="/docs/achievements">Achievements</Link> tied to mining milestones.</li>
        </ul>
      </DocArticle>
    </DocsLayout>
  );
}
