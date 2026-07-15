import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

export default function GettingStarted() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Getting Started | HustleCoin Docs"
        description="How to launch the HustleCoin Mini App in Telegram, create your account automatically, and make your first mine."
        path="/docs/getting-started"
        title="Getting Started"
        intro="No wallet, no sign-up form. Your account is created automatically from your Telegram profile the moment you open the app."
      >
        <h2>1. Open the Mini App</h2>
        <p>
          Open the HustleCoin bot in Telegram and launch the Mini App — either
          from{" "}
          <a
            href="https://t.me/HustleCoinMinerBot/hustlecoin"
            target="_blank"
            rel="noopener noreferrer"
          >
            this link
          </a>{" "}
          or by tapping <strong>Open App</strong> anywhere on this site.
        </p>

        <h2>2. Your account is created automatically</h2>
        <p>
          HustleCoin authenticates you through Telegram itself, so there's no
          separate password, wallet connection, or sign-up form. Your profile
          (name, username, avatar) carries over automatically from Telegram.
        </p>

        <h2>3. Make your first mine</h2>
        <p>
          Tap <strong>Mine</strong> once every mining cycle to earn HP (Hustle
          Points). HP is the core unit of value inside the ecosystem — it tracks
          your activity and determines your leaderboard rank.
        </p>

        <h2>4. Build a streak</h2>
        <p>
          Come back and mine on consecutive days to build a streak. Streaks apply
          a multiplier to your base mining rate — see the{" "}
          <Link href="/docs/mining-guide">Mining Guide</Link> for the full
          mechanics.
        </p>

        <h2>5. Grow your network</h2>
        <p>
          Share your personal referral link to invite friends and earn a share of
          their mining activity. Details are in the{" "}
          <Link href="/docs/referral-guide">Referral Guide</Link>.
        </p>

        <h2>What's next</h2>
        <ul>
          <li>Check the <strong>Tasks</strong> tab regularly — new quests are added periodically.</li>
          <li>Track your progress on <strong>Achievements</strong> and the global leaderboards.</li>
          <li>Read the <Link href="/docs/whitepaper">Whitepaper</Link> to understand where the ecosystem is headed.</li>
        </ul>
      </DocArticle>
    </DocsLayout>
  );
}
