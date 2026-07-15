import { Link } from "wouter";
import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

const phases = [
  {
    title: "Phase 1: Foundation",
    status: "Completed",
    items: [
      "Core Telegram Bot Development",
      "Mini App UI/UX Design",
      "Basic HP Mining Mechanics",
      "Streak & Reward Systems",
      "Initial Alpha Testing",
    ],
  },
  {
    title: "Phase 2: Growth",
    status: "In Progress",
    items: [
      "Public Launch via Telegram",
      "Referral System Activation",
      "Global Leaderboards",
      "Task & Quest Engine",
      "Marketing Campaigns Initiation",
    ],
  },
  {
    title: "Phase 3: Expansion",
    status: "Planned",
    items: [
      "Advanced Squads/Clans System",
      "Interactive Mini-Games",
      "Partner Integrations",
      "Enhanced Anti-Cheat Mechanics",
      "Community Governance V1",
    ],
  },
  {
    title: "Phase 4: Ecosystem",
    status: "Planned",
    items: [
      "Tokenomics Whitepaper Release",
      "On-chain Integration Preparation",
      "Airdrop Mechanics Detail",
      "Exchange Partnership Announcements",
      "TGE (Token Generation Event)",
    ],
  },
];

export default function RoadmapDoc() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Roadmap | HustleCoin Docs"
        description="HustleCoin's development roadmap across four phases: foundation, growth, expansion, and ecosystem/tokenomics."
        path="/docs/roadmap"
        title="Roadmap"
        intro="HustleCoin executes in phases, prioritizing stability and community growth before scaling into a token economy."
      >
        {phases.map((phase) => (
          <div key={phase.title}>
            <h2>
              {phase.title}{" "}
              <span className="text-sm font-sans font-medium text-primary align-middle">
                ({phase.status})
              </span>
            </h2>
            <ul>
              {phase.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <hr />
        <p>
          See the live, interactive version with progress bars on the{" "}
          <Link href="/roadmap">Roadmap page</Link>, or read the long-term vision
          in the <Link href="/docs/whitepaper">Whitepaper</Link>.
        </p>
      </DocArticle>
    </DocsLayout>
  );
}
