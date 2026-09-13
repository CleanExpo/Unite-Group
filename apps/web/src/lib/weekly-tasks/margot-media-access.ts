import { z } from "zod";
import { readMargotPrivatePacket } from "./margot-packet-reader";
import type { MargotReadStore } from "./margot-private-storage";
import { verifiedMediaAssetSchema } from "./margot-media-asset";
export const mediaRequestSchema = z.object({
  episodeId: z.string().min(1).max(160), batchId: z.string().min(1).max(160),
  version: z.number().int().positive(), packetSHA256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type MediaRequest = z.infer<typeof mediaRequestSchema>;
export function ownedMediaAsset(episode: unknown, ownerId: string) {
  if (!episode || typeof episode !== "object" || !("media" in episode)) return null;
  const media = episode.media;
  if (!media || typeof media !== "object" || !("asset" in media)) return null;
  const parsed = verifiedMediaAssetSchema.safeParse(media.asset);
  return parsed.success && parsed.data.objectPath === `${ownerId}/margot/${parsed.data.sha256}.mp4` ? parsed.data : null;
}
export async function resolveMargotMedia(input: {
  ownerId: string | null; collectionId?: string; store: MargotReadStore; request: unknown;
  sign: (bucket: "media-uploads", objectPath: string) => Promise<string | null>;
}): Promise<{ status: "available"; url: string } | { status: "unauthorised" | "invalid" | "stale" | "unavailable" }> {
  if (!input.ownerId) return { status: "unauthorised" };
  const request = mediaRequestSchema.safeParse(input.request);
  if (!request.success) return { status: "invalid" };
  try {
    const review = await readMargotPrivatePacket(input);
    if (review.source !== "available") return { status: "unavailable" };
    const expected = request.data;
    if (review.batchId !== expected.batchId || review.version !== expected.version || review.packetSHA256 !== expected.packetSHA256) return { status: "stale" };
    const episode = review.packet.episodes.find(e => e.id === expected.episodeId);
    const asset = ownedMediaAsset(episode, input.ownerId);
    if (!asset) return { status: "unavailable" };
    const url = await input.sign(asset.bucket, asset.objectPath);
    if (!url || new URL(url).protocol !== "https:") return { status: "unavailable" };
    const current = await readMargotPrivatePacket(input);
    if (current.source !== "available" || current.batchId !== expected.batchId || current.version !== expected.version || current.packetSHA256 !== expected.packetSHA256) return { status: "stale" };
    return { status: "available", url };
  } catch { return { status: "unavailable" }; }
}
