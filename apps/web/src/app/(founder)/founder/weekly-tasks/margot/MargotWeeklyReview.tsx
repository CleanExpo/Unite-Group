import type { MargotPrivateReview } from "@/lib/weekly-tasks/margot-packet-reader";
import type { MargotWeeklyPacket } from "@/lib/weekly-tasks/margot-packet";
import styles from "../../command-centre/founder-desk.module.css";

type Review =
  MargotPrivateReview | { source: "local_preview"; packet: MargotWeeklyPacket };
function time(value: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function MargotWeeklyReview({ review }: { review: Review }) {
  if (review.source === "not_configured")
    return (
      <section className={styles.missionDetail} aria-labelledby="weekly-source">
        <h2 id="weekly-source">Weekly packet not connected</h2>
        <p>
          This is the place for your Margot campaign review. A verified current
          weekly packet has not been connected yet.
        </p>
        <p>
          No episode counts or delivery status are available here. The local
          editorial preview remains separate from this screen.
        </p>
        <p>
          Monday is your review day. Your week starts Thursday at 4pm,
          Australia/Brisbane.
        </p>
        <p>
          Viewing this page does not approve, generate, schedule or publish
          anything. Synthex release authority remains a separate decision.
        </p>
      </section>
    );
  if (review.source !== "available" && review.source !== "local_preview")
    return (
      <section className={styles.missionDetail} role="alert">
        <h2>Weekly packet unavailable</h2>
        <p>
          {review.source === "invalid"
            ? "The connected packet failed its identity or content checks."
            : review.source === "missing"
              ? "The configured collection or selected packet was not found."
              : "The private packet could not be read. Please reload to try again."}
        </p>
        <p>
          No episode counts or approval status can be confirmed. An operator can
          check the private connection. Viewing this page changes no approval or
          delivery state.
        </p>
      </section>
    );
  const local = review.source === "local_preview";
  const packet = review.packet;
  const references = packet.episodes.filter((item) =>
    "media" in item
      ? item.media.kind !== "awaiting_render"
      : Boolean(item.videoId),
  ).length;
  return (
    <section
      className={styles.missionDetail}
      aria-label={
        local ? "Local Margot editorial packet" : "Private Margot review packet"
      }
    >
      <h2>{local ? "Local editorial preview" : "Your weekly Margot review"}</h2>
      {local ? (
        <p>
          This packet is a local preview, not a connected campaign or
          publication decision.
        </p>
      ) : (
        <>
          <p>
            Private review only. Watching or reading these episodes does not
            approve, generate, schedule or publish them.
          </p>
          {review.source === "available" && (
            <>
              <p>
                Batch {review.batchId} · version {review.version}
              </p>
              {review.calendar !== "current" && (
                <p role="status">
                  {review.calendar === "stale"
                    ? "This is a previous weekly packet."
                    : "This packet belongs to a future review week."}{" "}
                  The actual review and week dates are shown below.
                </p>
              )}
            </>
          )}
        </>
      )}
      <p>
        Week starts {time(packet.weekStartsAt)} · Australia/Brisbane. Monday
        review: {time(packet.reviewDueAt)} (proposed time).
      </p>
      <p>
        {local
          ? `${references} existing master reference; ${packet.episodes.length - references} unrendered drafts.`
          : `${references} videos available to review; ${packet.episodes.length - references} awaiting render.`}{" "}
        Publication authority remains pending.
      </p>
      <p>
        Synthex distributes; NRPG is the proposed resource home, with relevant
        CARSI links when verified. Accounts and resource destinations are not
        verified by this packet.
      </p>
      {packet.episodes.map((item) => {
        const mediaKind =
          "media" in item
            ? item.media.kind
            : item.videoId
              ? "approved_reference"
              : "awaiting_render";
        const videoId =
          "media" in item
            ? "videoId" in item.media
              ? item.media.videoId
              : undefined
            : item.videoId;
        return (
          <article
            key={item.id}
            className={styles.reviewSpec}
            aria-label={item.title}
          >
            <h3>{item.title}</h3>
            <p>{time(item.slot)} · proposed slot, not scheduled</p>
            {videoId ? (
              <p>
                <a
                  href={`https://app.heygen.com/videos/${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {local
                    ? "Open existing master in HeyGen"
                    : "Open video for review in HeyGen"}
                </a>{" "}
                · Playback access is checked in HeyGen.
              </p>
            ) : (
              <p>Not rendered</p>
            )}
            {!local && (
              <p>
                {mediaKind === "approved_reference"
                  ? "Previously approved reference"
                  : mediaKind === "generated_draft"
                    ? "Generated draft — owner review required"
                    : "Awaiting render"}
                . Release approval remains pending.
              </p>
            )}
            <p>Script review: {item.scriptApproval}. Release: pending.</p>
            <details className={styles.details}>
              <summary>Script</summary>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.script}</p>
            </details>
            <details className={styles.details}>
              <summary>Caption</summary>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.caption}</p>
            </details>
            <details className={styles.details}>
              <summary>{item.resourceTitle}</summary>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.resourceText}</p>
            </details>
          </article>
        );
      })}
    </section>
  );
}
