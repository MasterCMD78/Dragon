import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

const distribution = [
  { label: "Community Mining Rewards", pct: 40, amount: "4,000,000,000 HSL" },
  { label: "Community & Referral Rewards", pct: 20, amount: "2,000,000,000 HSL" },
  { label: "Ecosystem Development", pct: 15, amount: "1,500,000,000 HSL" },
  { label: "Treasury Reserve", pct: 10, amount: "1,000,000,000 HSL" },
  { label: "Partnerships & Marketing", pct: 10, amount: "1,000,000,000 HSL" },
  { label: "Founder Allocation", pct: 5, amount: "500,000,000 HSL" },
];

export default function Tokenomics() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Tokenomics | HustleCoin Docs"
        description="HustleCoin (HSL) token information: total supply, distribution across mining rewards, referrals, ecosystem development, treasury, partnerships, and founder allocation."
        path="/docs/tokenomics"
        title="Tokenomics"
        intro="HSL is planned to become the utility and community-reward token of the HustleCoin ecosystem, built on Solana."
      >
        <h2>Token information</h2>
        <ul>
          <li><strong>Project name:</strong> HustleCoin</li>
          <li><strong>Token name:</strong> HustleCoin</li>
          <li><strong>Token symbol:</strong> HSL</li>
          <li><strong>Blockchain:</strong> Solana (planned integration)</li>
          <li><strong>Token type:</strong> Utility &amp; Community Reward Token</li>
          <li><strong>Total supply:</strong> 10,000,000,000 HSL</li>
        </ul>

        <h2>Supply distribution</h2>
        <div className="not-prose my-8 space-y-3">
          {distribution.map((d) => (
            <div key={d.label} className="rounded-xl border border-white/10 bg-card p-4">
              <div className="flex justify-between items-baseline mb-2 gap-4">
                <span className="font-medium text-sm">{d.label}</span>
                <span className="text-primary font-heading font-bold shrink-0">{d.pct}%</span>
              </div>
              <div className="h-2 w-full bg-black rounded-full overflow-hidden border border-white/5 mb-2">
                <div className="h-full bg-primary" style={{ width: `${d.pct}%` }} />
              </div>
              <span className="text-xs text-muted-foreground">{d.amount}</span>
            </div>
          ))}
        </div>

        <h3>Community Mining Rewards — 40%</h3>
        <p>Reserved for community mining rewards and long-term ecosystem participation.</p>

        <h3>Community &amp; Referral Rewards — 20%</h3>
        <p>Referral rewards, community incentives, promotional campaigns, and user growth programs.</p>

        <h3>Ecosystem Development — 15%</h3>
        <p>Platform development, infrastructure, future ecosystem expansion, and product improvements.</p>

        <h3>Treasury Reserve — 10%</h3>
        <p>Sustainability, strategic opportunities, and ecosystem support.</p>

        <h3>Partnerships &amp; Marketing — 10%</h3>
        <p>Partnerships, marketing initiatives, community expansion, and brand development.</p>

        <h3>Founder Allocation — 5%</h3>
        <p>
          Allocated to Yahuza Ahmad Kura (CMD), Founder of HustleCoin, supporting
          long-term project leadership, ecosystem development, and strategic
          growth.
        </p>

        <h2>HSL utility</h2>
        <p>HSL is designed to serve as the core utility asset of the ecosystem. Potential utilities include:</p>
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

        <hr />
        <p>
          For the full context on how tokenomics fits into the long-term vision,
          read the complete <Link href="/docs/whitepaper">Whitepaper</Link>.
        </p>
      </DocArticle>
    </DocsLayout>
  );
}
