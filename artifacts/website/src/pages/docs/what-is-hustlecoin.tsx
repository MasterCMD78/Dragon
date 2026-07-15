import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

export default function WhatIsHustleCoin() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="What is HustleCoin | HustleCoin Docs"
        description="HustleCoin is a community-driven digital rewards ecosystem built around daily mining, tasks, referrals, and achievements inside Telegram — evolving toward a Solana-based Web3 economy."
        path="/docs/what-is-hustlecoin"
        title="What is HustleCoin"
        intro="A community-driven digital rewards ecosystem, built first inside Telegram and designed to grow into a full Web3 economy."
      >
        <p>
          HustleCoin is a community-driven digital rewards ecosystem designed to
          encourage participation, consistency, learning, and growth within a
          decentralized environment. The project combines mining, tasks,
          achievements, referrals, leaderboards, and community engagement into a
          single platform where users are rewarded for their activity and
          contribution.
        </p>
        <p>
          Unlike many short-term reward projects, HustleCoin is designed as a
          long-term ecosystem focused on building a strong community before
          transitioning into a blockchain-powered economy.
        </p>
        <p>
          The project begins as a Telegram Mini App and is planned to evolve into
          a broader Web3 ecosystem integrated with the Solana blockchain.
        </p>

        <h2>Vision</h2>
        <p>
          To build a sustainable digital economy where community participation,
          contribution, and engagement create real value. HustleCoin aims to
          become more than a token — the goal is an ecosystem where users can
          earn, grow, compete, and participate in the future of decentralized
          technology.
        </p>

        <h2>Mission</h2>
        <ul>
          <li>Reward consistency and engagement.</li>
          <li>Create opportunities for users worldwide.</li>
          <li>Build a strong and active community.</li>
          <li>Introduce users to Web3 technology through a simple, accessible platform.</li>
          <li>Develop a scalable ecosystem capable of supporting future blockchain integration.</li>
        </ul>

        <h2>The Ecosystem, at a glance</h2>
        <ul>
          <li><strong>Daily Mining</strong> — earn HP every mining cycle, with streak bonuses for consistency.</li>
          <li><strong>Task System</strong> — complete social, community, and educational activities for extra rewards.</li>
          <li><strong>Referral Program</strong> — invite others and earn a share of their mining activity.</li>
          <li><strong>Achievements</strong> — unlock milestones across mining, tasks, and referrals.</li>
          <li><strong>Leaderboards</strong> — compete and get recognized for your activity.</li>
          <li><strong>Community</strong> — Telegram, X, TikTok, and future platforms where the ecosystem grows together.</li>
        </ul>

        <h2>Founder</h2>
        <p>
          HustleCoin was founded by <strong>Yahuza Ahmad Kura (CMD)</strong>, with
          the vision of creating a community-first ecosystem that rewards effort,
          participation, and loyalty — focused on long-term development,
          transparency, and sustainable growth.
        </p>

        <hr />
        <p>
          Continue to <Link href="/docs/getting-started">Getting Started</Link> to
          launch the Mini App, or read the full{" "}
          <Link href="/docs/whitepaper">Whitepaper</Link> for the complete vision
          and tokenomics.
        </p>
      </DocArticle>
    </DocsLayout>
  );
}
