import { DocsLayout } from "@/components/docs/DocsLayout";
import { DocArticle } from "@/components/docs/DocArticle";

export default function AchievementsDoc() {
  return (
    <DocsLayout>
      <DocArticle
        seoTitle="Achievements | HustleCoin Docs"
        description="Achievements reward HustleCoin users for reaching mining, task, and referral milestones. See the categories of achievements and how they help you progress."
        path="/docs/achievements"
        title="Achievements"
        intro="Achievements reward users for reaching important milestones and give every account long-term goals beyond the daily mining loop."
      >
        <h2>Why achievements exist</h2>
        <p>
          Achievements turn everyday activity into visible progress. They help
          increase engagement and create long-term goals for users, beyond just
          watching a balance go up.
        </p>

        <h2>Achievement categories</h2>
        <ul>
          <li><strong>First mining reward</strong> — unlocked the moment you make your first mine.</li>
          <li><strong>Consecutive mining streaks</strong> — awarded for hitting streak milestones (e.g. 7, 30, 100 days).</li>
          <li><strong>Task completion milestones</strong> — awarded for completing a number of quests.</li>
          <li><strong>Referral milestones</strong> — awarded for growing your referred network.</li>
          <li><strong>Community participation milestones</strong> — awarded for broader engagement across the ecosystem.</li>
        </ul>

        <h2>Where to track your progress</h2>
        <p>
          Open the <strong>Achievements</strong> tab inside the Mini App to see
          which milestones you've unlocked and which are still in reach. New
          achievement categories are added as the ecosystem grows.
        </p>
      </DocArticle>
    </DocsLayout>
  );
}
