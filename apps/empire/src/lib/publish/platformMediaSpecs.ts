/**
 * Per-platform media spec table + pre-publish validator (Synthex publishing
 * engine — see docs/specs/synthex-publishing-engine-spec.md).
 *
 * Why this exists: the engine auto-conforms (compress / resize / transcode)
 * media to each platform's best-practice spec and must REJECT content that
 * violates a hard limit before dispatch — a 5GB clip or a 21:9 video should
 * never reach the platform uploader. This module is the canonical spec table
 * plus pure validators that operate on media METADATA (a descriptor), never on
 * the file bytes themselves. No IO, no DB, no network — tenancy-independent.
 *
 * Scope: v1 platforms only — Facebook, Instagram, LinkedIn, YouTube, Reddit.
 * X/Twitter and TikTok are deferred and intentionally absent.
 *
 * Evidence note: figures are 2026 best-practice baselines. Each carries a short
 * source comment; any secondary / uncertain value is tagged
 * `[UNCONFIRMED — verify against the platform's live uploader]` and must NOT be
 * treated as a verified hard limit until checked against the live API/uploader.
 */

export type PlatformId =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'reddit';

export type MediaKind = 'image' | 'video';

/** A simplified aspect ratio, e.g. { label: '9:16', w: 9, h: 16 }. */
export interface AspectRatio {
  label: string;
  w: number;
  h: number;
}

/** A recommended pixel resolution for a given aspect ratio. */
export interface Resolution {
  label: string;
  width: number;
  height: number;
}

/** Per-platform video limits. */
export interface VideoSpec {
  allowedAspectRatios: AspectRatio[];
  recommendedResolutions: Resolution[];
  /** Maximum video duration in seconds (hard limit). */
  maxDurationSec: number;
  /** Maximum file size in bytes (hard limit). */
  maxFileSizeBytes: number;
  /** Allowed container formats, lower-case (e.g. 'mp4', 'mov'). */
  allowedContainers: string[];
  /** Allowed video codecs, lower-case (e.g. 'h264'). */
  allowedVideoCodecs: string[];
  /** Allowed audio codecs, lower-case (e.g. 'aac'). */
  allowedAudioCodecs: string[];
}

/** Per-platform image limits. */
export interface ImageSpec {
  allowedAspectRatios: AspectRatio[];
  recommendedResolutions: Resolution[];
  /** Maximum file size in bytes (hard limit). */
  maxFileSizeBytes: number;
  /** Maximum image width in pixels. */
  maxWidth: number;
  /** Maximum image height in pixels. */
  maxHeight: number;
  /** Allowed image formats, lower-case (e.g. 'jpg', 'png', 'gif'). */
  allowedFormats: string[];
}

/** The full media spec for a single platform. */
export interface PlatformMediaSpec {
  platform: PlatformId;
  /** Display name for logs / UI. */
  displayName: string;
  video: VideoSpec;
  image: ImageSpec;
  /** Maximum caption / post-body length in characters. */
  maxCaptionLength: number;
  /** Maximum title length in characters (titled surfaces: YouTube, Reddit). */
  maxTitleLength: number;
  /** Maximum number of hashtags the platform meaningfully supports. */
  maxHashtags: number;
}

// ---------------------------------------------------------------------------
// Shared aspect-ratio + resolution building blocks
// ---------------------------------------------------------------------------

const AR_9_16: AspectRatio = { label: '9:16', w: 9, h: 16 };
const AR_1_1: AspectRatio = { label: '1:1', w: 1, h: 1 };
const AR_16_9: AspectRatio = { label: '16:9', w: 16, h: 9 };
const AR_4_5: AspectRatio = { label: '4:5', w: 4, h: 5 };
const AR_1_91_1: AspectRatio = { label: '1.91:1', w: 1.91, h: 1 };

const RES_VERTICAL: Resolution = { label: '1080×1920', width: 1080, height: 1920 };
const RES_SQUARE: Resolution = { label: '1080×1080', width: 1080, height: 1080 };
const RES_LANDSCAPE: Resolution = { label: '1920×1080', width: 1920, height: 1080 };
const RES_PORTRAIT_4_5: Resolution = { label: '1080×1350', width: 1080, height: 1350 };

const MB = 1024 * 1024;
const GB = 1024 * MB;

// ---------------------------------------------------------------------------
// The single transcode master + standard crop targets.
// What the transcode worker produces (mezzanine) and the crops it derives.
// ---------------------------------------------------------------------------

/**
 * MASTER_MEZZANINE — the single transcode master every platform render derives
 * from: H.264 High profile, MP4 with faststart (moov atom at front for
 * progressive playback), AAC-LC audio at 48kHz, 4:2:0 chroma subsampling,
 * 30fps. Source: common cross-platform-safe baseline (Facebook/Instagram/
 * YouTube/LinkedIn upload guidance converge on H.264 High + AAC + MP4).
 */
export const MASTER_MEZZANINE = {
  container: 'mp4',
  faststart: true,
  videoCodec: 'h264',
  videoProfile: 'high',
  audioCodec: 'aac',
  audioProfile: 'aac-lc',
  audioSampleRateHz: 48000,
  chromaSubsampling: '4:2:0',
  frameRateFps: 30,
} as const;

/**
 * STANDARD_CROPS — the crop targets the transcode worker renders from the
 * master, one per common surface (vertical / square / landscape / portrait).
 */
export const STANDARD_CROPS: Resolution[] = [
  { label: '9:16 1080×1920', width: 1080, height: 1920 },
  { label: '1:1 1080×1080', width: 1080, height: 1080 },
  { label: '16:9 1920×1080', width: 1920, height: 1080 },
  { label: '4:5 1080×1350', width: 1080, height: 1350 },
];

// ---------------------------------------------------------------------------
// The canonical per-platform spec table.
// ---------------------------------------------------------------------------

export const PLATFORM_MEDIA_SPECS: Record<PlatformId, PlatformMediaSpec> = {
  // -- Facebook -------------------------------------------------------------
  facebook: {
    platform: 'facebook',
    displayName: 'Facebook',
    video: {
      // Feed supports landscape/square/portrait; Reels are 9:16.
      // Source: Facebook video/Reels publishing guidance.
      allowedAspectRatios: [AR_9_16, AR_1_1, AR_16_9, AR_4_5],
      recommendedResolutions: [RES_VERTICAL, RES_SQUARE, RES_LANDSCAPE, RES_PORTRAIT_4_5],
      // Feed video up to ~240min; Reels cap is ~90s. We encode the more
      // permissive feed limit as the hard duration; Reels length is enforced
      // by the Reels-specific path, not this generic spec.
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxDurationSec: 240 * 60,
      maxFileSizeBytes: 4 * GB, // Facebook video max ~4GB. Source: FB video specs.
      allowedContainers: ['mp4', 'mov'],
      allowedVideoCodecs: ['h264'],
      allowedAudioCodecs: ['aac'],
    },
    image: {
      allowedAspectRatios: [AR_9_16, AR_1_1, AR_16_9, AR_4_5, AR_1_91_1],
      recommendedResolutions: [RES_LANDSCAPE, RES_SQUARE, RES_VERTICAL],
      maxFileSizeBytes: 30 * MB, // FB image ≤30MB. Source: FB image upload guidance.
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxWidth: 4096,
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxHeight: 4096,
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
    // Facebook caption limit is generous (tens of thousands of chars).
    // [UNCONFIRMED — verify against the platform's live uploader]
    maxCaptionLength: 63206,
    maxTitleLength: 255, // [UNCONFIRMED — verify against the platform's live uploader]
    maxHashtags: 30, // [UNCONFIRMED — verify against the platform's live uploader]
  },

  // -- Instagram ------------------------------------------------------------
  instagram: {
    platform: 'instagram',
    displayName: 'Instagram',
    video: {
      // Reels 9:16; feed supports 4:5 / 1:1 / 1.91:1.
      // Source: Instagram Reels + feed video guidance.
      allowedAspectRatios: [AR_9_16, AR_4_5, AR_1_1, AR_1_91_1],
      recommendedResolutions: [RES_VERTICAL, RES_PORTRAIT_4_5, RES_SQUARE],
      maxDurationSec: 90, // Reels up to ~90s. Source: IG Reels guidance.
      // Hard ceiling ~4GB; engine targets <500MB for reliability.
      maxFileSizeBytes: 4 * GB, // Source: IG video upload guidance.
      allowedContainers: ['mp4', 'mov'],
      allowedVideoCodecs: ['h264'],
      allowedAudioCodecs: ['aac'],
    },
    image: {
      allowedAspectRatios: [AR_4_5, AR_1_1, AR_1_91_1],
      recommendedResolutions: [RES_PORTRAIT_4_5, RES_SQUARE],
      maxFileSizeBytes: 30 * MB, // IG image ~30MB. Source: IG image guidance.
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxWidth: 1440,
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxHeight: 1800,
      allowedFormats: ['jpg', 'jpeg', 'png'],
    },
    maxCaptionLength: 2200, // IG caption ≤2200 chars. Source: IG caption guidance.
    maxTitleLength: 255, // [UNCONFIRMED — verify against the platform's live uploader]
    maxHashtags: 30, // IG ≤30 hashtags. Source: IG hashtag guidance.
  },

  // -- LinkedIn -------------------------------------------------------------
  linkedin: {
    platform: 'linkedin',
    displayName: 'LinkedIn',
    video: {
      // LinkedIn accepts a wide band roughly 1:2.4 .. 2.4:1; the common
      // crops below fall inside that band.
      // Source: LinkedIn video upload guidance.
      allowedAspectRatios: [AR_9_16, AR_4_5, AR_1_1, AR_16_9],
      recommendedResolutions: [RES_LANDSCAPE, RES_SQUARE, RES_VERTICAL],
      maxDurationSec: 15 * 60, // Up to 15min. Source: LinkedIn video guidance.
      // Organic upload ceiling ~5GB. A separate doc states 500MB — conflict.
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxFileSizeBytes: 5 * GB,
      allowedContainers: ['mp4', 'mov'],
      allowedVideoCodecs: ['h264'],
      allowedAudioCodecs: ['aac'],
    },
    image: {
      // 16:9 landscape is the recommended feed-image crop (RES_LANDSCAPE),
      // so it must be in the allowed set or the validator would reject the
      // engine's own recommended render.
      allowedAspectRatios: [AR_16_9, AR_1_91_1, AR_1_1, AR_4_5],
      recommendedResolutions: [RES_LANDSCAPE, RES_SQUARE],
      maxFileSizeBytes: 8 * MB, // LinkedIn image ≤8MB. Source: LinkedIn image guidance.
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxWidth: 7680,
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxHeight: 4320,
      allowedFormats: ['png', 'jpg', 'jpeg'],
    },
    // LinkedIn post body ~3000 chars.
    // [UNCONFIRMED — verify against the platform's live uploader]
    maxCaptionLength: 3000,
    maxTitleLength: 255, // [UNCONFIRMED — verify against the platform's live uploader]
    maxHashtags: 30, // [UNCONFIRMED — verify against the platform's live uploader]
  },

  // -- YouTube --------------------------------------------------------------
  youtube: {
    platform: 'youtube',
    displayName: 'YouTube',
    video: {
      // Standard 16:9; Shorts are 9:16 and ≤3min.
      // Source: YouTube upload + Shorts guidance.
      allowedAspectRatios: [AR_16_9, AR_9_16],
      recommendedResolutions: [RES_LANDSCAPE, RES_VERTICAL],
      // Long-form duration is effectively bounded by file size, not a short
      // hard cap; the Shorts path enforces its own ≤3min (180s) limit. We use
      // a generous 12h ceiling here so generic validation does not reject
      // legitimate long-form uploads.
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxDurationSec: 12 * 60 * 60,
      maxFileSizeBytes: 256 * GB, // YouTube max 256GB. Source: YouTube upload limits.
      allowedContainers: ['mp4', 'mov'],
      allowedVideoCodecs: ['h264'],
      allowedAudioCodecs: ['aac'],
    },
    image: {
      // Thumbnail surface: 1280×720, 16:9, <2MB.
      allowedAspectRatios: [AR_16_9],
      recommendedResolutions: [{ label: '1280×720', width: 1280, height: 720 }],
      maxFileSizeBytes: 2 * MB, // Thumbnail <2MB. Source: YouTube thumbnail guidance.
      maxWidth: 1280, // Source: YouTube thumbnail guidance.
      maxHeight: 720, // Source: YouTube thumbnail guidance.
      allowedFormats: ['jpg', 'jpeg', 'png', 'gif'],
    },
    maxTitleLength: 100, // YouTube title ≤100 chars. Source: YouTube metadata limits.
    maxCaptionLength: 5000, // Description ≤5000 chars. Source: YouTube metadata limits.
    // [UNCONFIRMED — verify against the platform's live uploader]
    maxHashtags: 15,
  },

  // -- Reddit ---------------------------------------------------------------
  // The official Reddit help page blocks crawlers, so every figure below is
  // [UNCONFIRMED — verify against the platform's live uploader]. Do not treat
  // any Reddit limit as a verified hard limit until checked live.
  reddit: {
    platform: 'reddit',
    displayName: 'Reddit',
    video: {
      // [UNCONFIRMED — verify against the platform's live uploader]
      allowedAspectRatios: [AR_9_16, AR_1_1, AR_16_9, AR_4_5],
      // [UNCONFIRMED — verify against the platform's live uploader]
      recommendedResolutions: [RES_VERTICAL, RES_SQUARE, RES_LANDSCAPE],
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxDurationSec: 15 * 60,
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxFileSizeBytes: 1 * GB,
      // [UNCONFIRMED — verify against the platform's live uploader]
      allowedContainers: ['mp4'],
      // [UNCONFIRMED — verify against the platform's live uploader]
      allowedVideoCodecs: ['h264'],
      // [UNCONFIRMED — verify against the platform's live uploader]
      allowedAudioCodecs: ['aac'],
    },
    image: {
      // [UNCONFIRMED — verify against the platform's live uploader]
      allowedAspectRatios: [AR_9_16, AR_1_1, AR_16_9, AR_4_5, AR_1_91_1],
      // [UNCONFIRMED — verify against the platform's live uploader]
      recommendedResolutions: [RES_LANDSCAPE, RES_SQUARE, RES_VERTICAL],
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxFileSizeBytes: 20 * MB,
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxWidth: 4096,
      // [UNCONFIRMED — verify against the platform's live uploader]
      maxHeight: 4096,
      // [UNCONFIRMED — verify against the platform's live uploader]
      allowedFormats: ['png', 'jpg', 'jpeg', 'gif'],
    },
    // [UNCONFIRMED — verify against the platform's live uploader]
    maxTitleLength: 300,
    // [UNCONFIRMED — verify against the platform's live uploader]
    maxCaptionLength: 40000,
    // [UNCONFIRMED — verify against the platform's live uploader]
    maxHashtags: 0,
  },
};

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * A plain media DESCRIPTOR — metadata about a file, never the file itself.
 * All fields optional: the validator only checks what is supplied (so a
 * partially-probed descriptor still yields useful violations) but always
 * reports the unknown-platform case.
 */
export interface MediaDescriptor {
  bytes?: number;
  durationSec?: number;
  width?: number;
  height?: number;
  /** Container format, e.g. 'mp4', 'mov' (case-insensitive). */
  container?: string;
  /** Video codec, e.g. 'h264' (case-insensitive). */
  codec?: string;
  /** Image format, e.g. 'jpg', 'png' (case-insensitive). */
  format?: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; violations: string[] };

/** Aspect-ratio comparison tolerance (≈ ±2%). */
const ASPECT_EPSILON = 0.02;

function normalise(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function isKnownPlatform(platform: string): platform is PlatformId {
  return Object.prototype.hasOwnProperty.call(PLATFORM_MEDIA_SPECS, platform);
}

function matchesAnyAspect(
  width: number,
  height: number,
  ratios: AspectRatio[]
): boolean {
  if (width <= 0 || height <= 0) return false;
  const actual = width / height;
  return ratios.some((r) => {
    const target = r.w / r.h;
    return Math.abs(actual - target) <= ASPECT_EPSILON * target;
  });
}

/** Format a byte count as a short human string for violation messages. */
function fmtBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 1)}GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)}MB`;
  return `${bytes}B`;
}

/**
 * Validate a media descriptor (metadata) against a platform's hard limits for
 * the given kind. Pure: no IO, never throws. Unknown platform → a single
 * typed violation rather than an exception.
 */
export function validateMediaForPlatform(
  platform: string,
  media: MediaDescriptor,
  kind: MediaKind
): ValidationResult {
  if (!isKnownPlatform(platform)) {
    return { ok: false, violations: [`unknown platform "${platform}"`] };
  }

  const spec = PLATFORM_MEDIA_SPECS[platform];
  const violations: string[] = [];

  if (kind === 'video') {
    const v = spec.video;

    if (media.bytes !== undefined && media.bytes > v.maxFileSizeBytes) {
      violations.push(
        `${platform} video exceeds ${fmtBytes(v.maxFileSizeBytes)} (got ${fmtBytes(media.bytes)})`
      );
    }
    if (media.durationSec !== undefined && media.durationSec > v.maxDurationSec) {
      violations.push(
        `${platform} video exceeds ${v.maxDurationSec}s (got ${media.durationSec}s)`
      );
    }
    if (
      media.width !== undefined &&
      media.height !== undefined &&
      !matchesAnyAspect(media.width, media.height, v.allowedAspectRatios)
    ) {
      const supported = v.allowedAspectRatios.map((r) => r.label).join(', ');
      violations.push(
        `aspect ratio ${media.width}:${media.height} not supported by ${platform} (allowed: ${supported})`
      );
    }
    const container = normalise(media.container);
    if (container !== undefined && !v.allowedContainers.includes(container)) {
      violations.push(
        `${platform} video container "${container}" not allowed (allowed: ${v.allowedContainers.join(', ')})`
      );
    }
    const codec = normalise(media.codec);
    if (codec !== undefined && !v.allowedVideoCodecs.includes(codec)) {
      violations.push(
        `${platform} video codec "${codec}" not allowed (allowed: ${v.allowedVideoCodecs.join(', ')})`
      );
    }
  } else {
    const i = spec.image;

    if (media.bytes !== undefined && media.bytes > i.maxFileSizeBytes) {
      violations.push(
        `${platform} image exceeds ${fmtBytes(i.maxFileSizeBytes)} (got ${fmtBytes(media.bytes)})`
      );
    }
    if (media.width !== undefined && media.width > i.maxWidth) {
      violations.push(
        `${platform} image width ${media.width}px exceeds ${i.maxWidth}px`
      );
    }
    if (media.height !== undefined && media.height > i.maxHeight) {
      violations.push(
        `${platform} image height ${media.height}px exceeds ${i.maxHeight}px`
      );
    }
    if (
      media.width !== undefined &&
      media.height !== undefined &&
      !matchesAnyAspect(media.width, media.height, i.allowedAspectRatios)
    ) {
      const supported = i.allowedAspectRatios.map((r) => r.label).join(', ');
      violations.push(
        `aspect ratio ${media.width}:${media.height} not supported by ${platform} (allowed: ${supported})`
      );
    }
    const format = normalise(media.format);
    if (format !== undefined && !i.allowedFormats.includes(format)) {
      violations.push(
        `${platform} image format "${format}" not allowed (allowed: ${i.allowedFormats.join(', ')})`
      );
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

/**
 * Validate a caption (post body) length and hashtag count against a platform's
 * limits. Pure: no IO, never throws. Unknown platform → a typed violation.
 */
export function validateCaption(
  platform: string,
  caption: string,
  hashtagCount?: number
): ValidationResult {
  if (!isKnownPlatform(platform)) {
    return { ok: false, violations: [`unknown platform "${platform}"`] };
  }

  const spec = PLATFORM_MEDIA_SPECS[platform];
  const violations: string[] = [];

  if (caption.length > spec.maxCaptionLength) {
    violations.push(
      `${platform} caption exceeds ${spec.maxCaptionLength} chars (got ${caption.length})`
    );
  }

  if (hashtagCount !== undefined && hashtagCount > spec.maxHashtags) {
    violations.push(
      `${platform} allows at most ${spec.maxHashtags} hashtags (got ${hashtagCount})`
    );
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
