// Manifest entries for one encoded video: every file encodeVideo / blender-render writes gets an entry,
// so pages that list all three <source>s (AV1 MP4, WebM, H.264 MP4) pass check-visuals.
export const VIDEO_VARIANTS = ['.mp4', '.av1.mp4', '.webm'];

export function videoEntries(pub, { kind = 'video', ...fields }) {
  const poster = pub + '.poster.webp';
  return [
    ...VIDEO_VARIANTS.map((ext) => ({ src: pub + ext, kind, ...fields, poster })),
    { src: poster, kind: 'image', ...fields },
  ];
}
