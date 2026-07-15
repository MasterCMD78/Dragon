import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

export default function ReferralGuide() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Referral Guide | HustleCoin Docs"
        description="How to share your HustleCoin referral link, what rewards referrers and new users earn, and how referral abuse is prevented."
        path="/docs/referral-guide"
        title="Referral Guide"
        intro="Invite friends into the ecosystem with your personal referral link and earn a share of their mining activity."
      >
        <h2>How referrals work</h2>
        <p>
          Every account gets a unique referral link, available from inside the
          Mini App. When someone joins through your link and starts mining, you
          earn a percentage of their mining activity as a referral bonus.
        </p>

        <h2>Why it matters</h2>
        <ul>
          <li><strong>Community growth</strong> — referrals are how the ecosystem expands.</li>
          <li><strong>User rewards</strong> — both the referrer and the new participant benefit.</li>
          <li><strong>Increased engagement</strong> — larger networks mean a more active leaderboard and community.</li>
        </ul>

        <h2>Fairness and anti-abuse</h2>
        <p>
          The referral system is designed to reward genuine growth while
          maintaining fairness. Self-referrals, fake accounts, and sybil referral
          networks are actively detected and penalized — accounts found abusing
          the system have their HP reset and are banned.
        </p>

        <h2>Tips for growing your network</h2>
        <ul>
          <li>Share your link where real people will actually use it — Telegram groups, social posts, communities you're part of.</li>
          <li>Encourage referred users to mine daily; referral rewards scale with their genuine activity, not just sign-ups.</li>
          <li>Track your referral count and rank on the leaderboards, and unlock referral-based <Link href="/docs/achievements">Achievements</Link>.</li>
        </ul>
      </DocArticle>
    </DocsLayout>
  );
}
