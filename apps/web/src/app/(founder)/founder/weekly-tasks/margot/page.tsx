import { loadMargotContentEvents } from "@/lib/weekly-tasks/margot-content-review.server";
import { loadMargotPrivateReview } from "@/lib/weekly-tasks/margot-packet-reader";
import { MissionControlShell } from "../../command-centre/MissionControlShell";
import { MargotWeeklyReview } from "./MargotWeeklyReview";

export const dynamic = "force-dynamic";

// The parent layout and private reader authenticate; all row reads remain owner-scoped.
export default async function MargotWeeklyPage() {
  const review = await loadMargotPrivateReview();
  const decisions = review.source === "available" ? await loadMargotContentEvents() : undefined;
  return (
    <MissionControlShell
      section="weekly-tasks"
      title="Margot campaign review"
      description="Weekly Tasks · review only"
    >
      <MargotWeeklyReview review={review} decisions={decisions} />
    </MissionControlShell>
  );
}
