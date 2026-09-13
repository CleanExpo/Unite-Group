import { z } from "zod";
const sha256 = z.string().regex(/^[a-f0-9]{64}$/);
export const verifiedMediaAssetSchema = z.object({
  sha256, bucket: z.literal("media-uploads"),
  objectPath: z.string().max(180).regex(/^[a-f0-9-]{36}\/margot\/[a-f0-9]{64}\.mp4$/),
  rendition: z.literal("captioned_mp4"),
}).strict().refine(asset => {
  const owner = asset.objectPath.split("/")[0];
  return z.string().uuid().safeParse(owner).success && asset.objectPath === `${owner}/margot/${asset.sha256}.mp4`;
}, "Media object must bind its owner and byte digest");
export type VerifiedMediaAsset = z.infer<typeof verifiedMediaAssetSchema>;
