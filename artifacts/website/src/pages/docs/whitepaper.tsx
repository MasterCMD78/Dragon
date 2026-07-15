import { Link } from "wouter";
import { Download } from "lucide-react";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

const LAST_UPDATED = "July 15, 2026";
const FOUNDER = "Yahuza Ahmad Kura (CMD)";

const toc = [
  { id: "introduction", label: "Introduction" },
  { id: "vision", label: "Vision" },
  { id: "mission", label: "Mission" },
  { id: "founder", label: "Founder" },
  { id: "ecosystem", label: "The HustleCoin Ecosystem" },
  { id: "security", label: "Security" },
  { id: "token-vision", label: "Token Vision" },
  { id: "token-information", label: "Token Information" },
  { id: "supply-distribution", label: "Supply Distribution" },
  { id: "hsl-utility", label: "HSL Utility" },
  { id: "long-term-vision", label: "Long-Term Vision" },
  { id: "sustainability", label: "Sustainability" },
  { id: "community-principles", label: "Community Principles" },
  { id: "future-development", label: "Future Development" },
  { id: "conclusion", label: "Conclusion" },
];

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "HustleCoin Whitepaper",
  description:
    "The official HustleCoin whitepaper: vision, mission, ecosystem, security, tokenomics, and long-term roadmap for the HSL token.",
  author: { "@type": "Person", name: FOUNDER },
  publisher: { "@type": "Organization", name: "HustleCoin" },
  dateModified: "2026-07-15",
  url: "https://hustlecoin.app/docs/whitepaper",
};

export default function Whitepaper() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Whitepaper | HustleCoin"
        description="The official HustleCoin whitepaper: vision, mission, ecosystem, security, tokenomics, and long-term roadmap for the HSL token. Read online or download the PDF."
        path="/docs/whitepaper"
        eyebrow="Whitepaper"
        title="HustleCoin Whitepaper"
        jsonLd={articleJsonLd}
      >
        {/* Meta row: founder / last updated / download */}
        <div className="not-prose flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/10 bg-card p-5 mb-10">
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">
              Founder: <span className="text-foreground font-medium">{FOUNDER}</span>
            </p>
            <p className="text-muted-foreground">
              Last updated: <span className="text-foreground font-medium">{LAST_UPDATED}</span>
            </p>
          </div>
          <a
            href="/whitepaper.pdf"
            download
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] shrink-0"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </a>
        </div>

        {/* Table of contents */}
        <div className="not-prose rounded-2xl border border-white/10 bg-card p-6 mb-12">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Table of Contents
          </p>
          <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-2 list-decimal list-inside text-sm">
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-primary hover:underline">
                  {t.label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <h2 id="introduction">Introduction</h2>
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

        <h2 id="vision">Vision</h2>
        <p>
          To build a sustainable digital economy where community participation,
          contribution, and engagement create real value.
        </p>
        <p>
          HustleCoin aims to become more than a token. The goal is to create an
          ecosystem where users can earn, grow, compete, and participate in the
          future of decentralized technology.
        </p>

        <h2 id="mission">Mission</h2>
        <p>Our mission is to:</p>
        <ul>
          <li>Reward consistency and engagement.</li>
          <li>Create opportunities for users worldwide.</li>
          <li>Build a strong and active community.</li>
          <li>Introduce users to Web3 technology through a simple and accessible platform.</li>
          <li>Develop a scalable ecosystem capable of supporting future blockchain integration.</li>
        </ul>

        <h2 id="founder">Founder</h2>
        <p>
          <strong>{FOUNDER}</strong> — Founder and Project Lead of HustleCoin.
        </p>
        <p>
          Yahuza Ahmad Kura founded HustleCoin with the vision of creating a
          community-first ecosystem that rewards effort, participation, and
          loyalty. The project focuses on long-term development, transparency,
          and sustainable growth.
        </p>

        <h2 id="ecosystem">The HustleCoin Ecosystem</h2>
        <p>The ecosystem consists of several interconnected features designed to reward user activity.</p>

        <h3>1. Daily Mining</h3>
        <p>
          Users can mine HustleCoin rewards daily through the Telegram Mini App.
          Mining encourages daily engagement, platform retention, and consistent
          participation. Mining rewards may include streak bonuses that reward
          users for maintaining continuous activity.
        </p>

        <h3>2. Task System</h3>
        <p>
          The task system allows users to earn additional rewards by completing
          activities such as social media engagement, community participation,
          promotional campaigns, and educational activities. The task system
          helps users grow their balances while supporting ecosystem expansion.
        </p>

        <h3>3. Referral Program</h3>
        <p>
          Users can invite others into the ecosystem using unique referral links.
          Benefits include community growth, user rewards, and increased
          platform engagement. The referral system is designed to reward both
          the referrer and the new participant while maintaining fairness and
          anti-abuse protections.
        </p>

        <h3>4. Achievements</h3>
        <p>Achievements reward users for reaching important milestones, such as:</p>
        <ul>
          <li>First mining reward</li>
          <li>Consecutive mining streaks</li>
          <li>Task completion milestones</li>
          <li>Referral milestones</li>
          <li>Community participation milestones</li>
        </ul>
        <p>Achievements help increase engagement and create long-term goals for users.</p>

        <h3>5. Leaderboards</h3>
        <p>
          Leaderboards introduce competition and recognition within the
          ecosystem. Users can compete based on mining activity, task
          completion, referrals, and overall participation — helping motivate
          users while showcasing the most active community members.
        </p>

        <h3>6. Community Growth</h3>
        <p>
          HustleCoin places strong emphasis on community building, across the
          Telegram Channel, Telegram Community, X (Twitter), TikTok, and future
          social platforms. The community is considered one of the project's
          most important assets.
        </p>

        <h2 id="security">Security</h2>
        <p>Security remains a core priority for the platform. Measures include:</p>
        <ul>
          <li>Secure user authentication</li>
          <li>Telegram integration security</li>
          <li>Anti-spam systems</li>
          <li>Anti-abuse protections</li>
          <li>Referral validation systems</li>
          <li>Rate limiting protections</li>
        </ul>
        <p>The project continuously improves security as the ecosystem expands.</p>

        <h2 id="token-vision">Token Vision</h2>
        <p>
          HustleCoin is planned to evolve into a blockchain-based asset. The
          long-term objective is integration with the Solana blockchain,
          providing fast transactions, low transaction costs, scalability, and
          accessibility for global users.
        </p>
        <p>
          Blockchain integration will allow the ecosystem to expand beyond the
          Telegram Mini App into broader decentralized applications and
          services.
        </p>

        <h2 id="token-information">Token Information</h2>
        <ul>
          <li><strong>Project Name:</strong> HustleCoin</li>
          <li><strong>Token Name:</strong> HustleCoin</li>
          <li><strong>Token Symbol:</strong> HSL</li>
          <li><strong>Blockchain:</strong> Solana (planned integration)</li>
          <li><strong>Token Type:</strong> Utility &amp; Community Reward Token</li>
          <li><strong>Total Supply:</strong> 10,000,000,000 HSL</li>
        </ul>

        <h2 id="supply-distribution">Supply Distribution</h2>

        <h3>Community Mining Rewards — 40% (4,000,000,000 HSL)</h3>
        <p>Reserved for community mining rewards and long-term ecosystem participation.</p>

        <h3>Community &amp; Referral Rewards — 20% (2,000,000,000 HSL)</h3>
        <p>Reserved for referral rewards, community incentives, promotional campaigns, and user growth programs.</p>

        <h3>Ecosystem Development — 15% (1,500,000,000 HSL)</h3>
        <p>Reserved for platform development, infrastructure, future ecosystem expansion, and product improvements.</p>

        <h3>Treasury Reserve — 10% (1,000,000,000 HSL)</h3>
        <p>Reserved for sustainability, strategic opportunities, and ecosystem support.</p>

        <h3>Partnerships &amp; Marketing — 10% (1,000,000,000 HSL)</h3>
        <p>Reserved for partnerships, marketing initiatives, community expansion, and brand development.</p>

        <h3>Founder Allocation — 5% (500,000,000 HSL)</h3>
        <p>
          Allocated to {FOUNDER}, Founder of HustleCoin. This allocation
          supports long-term project leadership, ecosystem development, and
          strategic growth.
        </p>

        <h2 id="hsl-utility">HSL Utility</h2>
        <p>HSL is designed to serve as the core utility asset of the HustleCoin ecosystem. Potential utilities include:</p>
        <ul>
          <li>Mining rewards</li>
          <li>Referral rewards</li>
          <li>Achievement rewards</li>
          <li>Community incentives</li>
          <li>Governance participation</li>
          <li>Ecosystem services</li>
          <li>Future marketplace integrations</li>
          <li>Solana ecosystem participation</li>
        </ul>

        <h2 id="long-term-vision">Long-Term Vision</h2>
        <p>
          HustleCoin aims to build a strong community-first ecosystem before
          transitioning into a broader blockchain-powered platform. The focus
          remains on community growth, sustainable development, user
          participation, ecosystem utility, and long-term value creation.
        </p>
        <p>
          HSL is intended to become the foundation of the HustleCoin ecosystem
          and support future decentralized applications built around the
          community.
        </p>
        <h3>Utility Goals</h3>
        <p>Future utility may include community rewards, governance participation, ecosystem incentives, digital services, community events, partnerships, and Web3 integrations. The utility of HustleCoin will continue to expand as the ecosystem develops.</p>

        <h2 id="sustainability">Sustainability</h2>
        <p>The project is designed with a long-term mindset. Key principles include:</p>
        <ul>
          <li>Community-first development</li>
          <li>Gradual ecosystem growth</li>
          <li>Responsible expansion</li>
          <li>Continuous innovation</li>
          <li>Sustainable reward mechanisms</li>
        </ul>
        <p>HustleCoin focuses on building lasting value rather than short-term hype.</p>

        <h2 id="community-principles">Community Principles</h2>
        <p>The HustleCoin community is built around respect, transparency, consistency, innovation, collaboration, and growth. Every member plays an important role in the development of the ecosystem.</p>

        <h2 id="future-development">Future Development</h2>
        <p>Future development goals include:</p>
        <ul>
          <li>Expanded task systems</li>
          <li>Enhanced achievements</li>
          <li>Additional reward mechanisms</li>
          <li>Advanced community features</li>
          <li>Ecosystem partnerships</li>
          <li>Solana blockchain integration</li>
          <li>Expanded Web3 functionality</li>
          <li>Mobile-first experiences</li>
        </ul>
        <p>Development will continue based on community feedback and ecosystem needs.</p>

        <h2 id="conclusion">Conclusion</h2>
        <p>
          HustleCoin is a community-driven rewards ecosystem designed to
          encourage participation, consistency, and growth. Through mining,
          tasks, referrals, achievements, and future blockchain integration, the
          project aims to create a sustainable platform that rewards active
          users and supports long-term development.
        </p>
        <p>The vision is simple:</p>
        <p className="text-foreground font-heading font-bold text-xl">
          Mine. Earn. Grow. Repeat.
        </p>
        <p>
          Together, the HustleCoin community is building a stronger future
          powered by participation, innovation, and opportunity.
        </p>

        <hr />
        <p className="text-sm">
          {FOUNDER} — HustleCoin
        </p>

        <div className="not-prose mt-10 flex flex-col sm:flex-row gap-3">
          <a
            href="/whitepaper.pdf"
            download
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            Download the full PDF
          </a>
          <Link
            href="/docs/tokenomics"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium hover:border-primary/30 transition-colors"
          >
            View Tokenomics
          </Link>
        </div>
      </DocArticle>
    </DocsLayout>
  );
}
