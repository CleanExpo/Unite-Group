import {
  PLATFORM_MEDIA_SPECS,
  MASTER_MEZZANINE,
  STANDARD_CROPS,
  validateMediaForPlatform,
  validateCaption,
  type PlatformId,
  type MediaDescriptor,
} from '../platformMediaSpecs';

const V1_PLATFORMS: PlatformId[] = [
  'facebook',
  'instagram',
  'linkedin',
  'youtube',
  'reddit',
];

const MB = 1024 * 1024;
const GB = 1024 * MB;

function expectViolation(
  result: ReturnType<typeof validateMediaForPlatform>,
  substring: string
) {
  expect(result.ok).toBe(false);
  if (result.ok) return; // narrow for TS; unreachable after assertion above
  expect(result.violations.some((v) => v.includes(substring))).toBe(true);
}

describe('PLATFORM_MEDIA_SPECS table', () => {
  it('has a spec for every v1 platform and no deferred platforms', () => {
    expect(Object.keys(PLATFORM_MEDIA_SPECS).sort()).toEqual(
      [...V1_PLATFORMS].sort()
    );
    // X/Twitter + TikTok are deferred and must be absent.
    expect(PLATFORM_MEDIA_SPECS).not.toHaveProperty('twitter');
    expect(PLATFORM_MEDIA_SPECS).not.toHaveProperty('x');
    expect(PLATFORM_MEDIA_SPECS).not.toHaveProperty('tiktok');
  });

  it.each(V1_PLATFORMS)('%s has internally consistent image + video limits', (platform) => {
    const spec = PLATFORM_MEDIA_SPECS[platform];
    expect(spec.platform).toBe(platform);

    // Both kinds present and non-trivial.
    expect(spec.video.maxFileSizeBytes).toBeGreaterThan(0);
    expect(spec.video.maxDurationSec).toBeGreaterThan(0);
    expect(spec.video.allowedAspectRatios.length).toBeGreaterThan(0);
    expect(spec.video.allowedContainers.length).toBeGreaterThan(0);
    expect(spec.video.allowedVideoCodecs.length).toBeGreaterThan(0);
    expect(spec.video.allowedAudioCodecs.length).toBeGreaterThan(0);

    expect(spec.image.maxFileSizeBytes).toBeGreaterThan(0);
    expect(spec.image.maxWidth).toBeGreaterThan(0);
    expect(spec.image.maxHeight).toBeGreaterThan(0);
    expect(spec.image.allowedAspectRatios.length).toBeGreaterThan(0);
    expect(spec.image.allowedFormats.length).toBeGreaterThan(0);

    expect(spec.maxCaptionLength).toBeGreaterThan(0);
    expect(spec.maxTitleLength).toBeGreaterThan(0);
    expect(spec.maxHashtags).toBeGreaterThanOrEqual(0);
  });

  it.each(V1_PLATFORMS)(
    '%s recommended resolutions all satisfy an allowed aspect ratio',
    (platform) => {
      // Guards table internal consistency: every recommended render crop must
      // be one the validator would accept (else the engine produces a crop its
      // own pre-publish check rejects). EPS mirrors ASPECT_EPSILON (±2%).
      const EPS = 0.02;
      const spec = PLATFORM_MEDIA_SPECS[platform];
      (['video', 'image'] as const).forEach((kind) => {
        const k = spec[kind];
        k.recommendedResolutions.forEach((res) => {
          const actual = res.width / res.height;
          const matches = k.allowedAspectRatios.some(
            (r) => Math.abs(actual - r.w / r.h) <= EPS * (r.w / r.h)
          );
          expect({ platform, kind, res: res.label, matches }).toEqual({
            platform,
            kind,
            res: res.label,
            matches: true,
          });
        });
      });
    }
  );

  it('encodes the master mezzanine + standard crops', () => {
    expect(MASTER_MEZZANINE.videoCodec).toBe('h264');
    expect(MASTER_MEZZANINE.container).toBe('mp4');
    expect(MASTER_MEZZANINE.faststart).toBe(true);
    expect(MASTER_MEZZANINE.audioCodec).toBe('aac');
    expect(MASTER_MEZZANINE.audioSampleRateHz).toBe(48000);

    // Four standard crops: 9:16, 1:1, 16:9, 4:5.
    expect(STANDARD_CROPS).toHaveLength(4);
    const dims = STANDARD_CROPS.map((c) => `${c.width}x${c.height}`);
    expect(dims).toEqual(
      expect.arrayContaining(['1080x1920', '1080x1080', '1920x1080', '1080x1350'])
    );
  });
});

describe('validateMediaForPlatform — compliant descriptors', () => {
  it('passes a compliant Instagram reel', () => {
    const media: MediaDescriptor = {
      bytes: 200 * MB,
      durationSec: 45,
      width: 1080,
      height: 1920,
      container: 'mp4',
      codec: 'h264',
    };
    expect(validateMediaForPlatform('instagram', media, 'video')).toEqual({ ok: true });
  });

  it('passes a compliant LinkedIn image', () => {
    const media: MediaDescriptor = {
      bytes: 2 * MB,
      width: 1200,
      height: 1200,
      format: 'png',
    };
    expect(validateMediaForPlatform('linkedin', media, 'image')).toEqual({ ok: true });
  });

  it('passes when only partial metadata is supplied', () => {
    // Container only, within allowed set → no violations.
    expect(
      validateMediaForPlatform('youtube', { container: 'mp4' }, 'video')
    ).toEqual({ ok: true });
  });

  it('is case-insensitive for container/codec/format', () => {
    expect(
      validateMediaForPlatform('facebook', { container: 'MP4', codec: 'H264' }, 'video')
    ).toEqual({ ok: true });
    expect(
      validateMediaForPlatform('facebook', { format: 'JPG' }, 'image')
    ).toEqual({ ok: true });
  });
});

describe('validateMediaForPlatform — specific violations', () => {
  it('flags Facebook video over 4GB', () => {
    expectViolation(
      validateMediaForPlatform('facebook', { bytes: 5 * GB }, 'video'),
      'facebook video exceeds 4GB'
    );
  });

  it('flags Instagram reel over 90s', () => {
    expectViolation(
      validateMediaForPlatform('instagram', { durationSec: 120 }, 'video'),
      'instagram video exceeds 90s'
    );
  });

  it('flags Reddit image over 20MB', () => {
    expectViolation(
      validateMediaForPlatform('reddit', { bytes: 25 * MB }, 'image'),
      'reddit image exceeds 20MB'
    );
  });

  it('flags an unsupported aspect ratio on LinkedIn', () => {
    // 21:9 ultrawide — outside LinkedIn's allowed crops.
    expectViolation(
      validateMediaForPlatform('linkedin', { width: 2520, height: 1080 }, 'video'),
      'not supported by linkedin'
    );
  });

  it('flags an over-dimension image on YouTube thumbnail', () => {
    const result = validateMediaForPlatform(
      'youtube',
      { width: 1920, height: 1080 },
      'image'
    );
    expectViolation(result, 'image width 1920px exceeds 1280px');
  });

  it('flags a disallowed container/codec', () => {
    expectViolation(
      validateMediaForPlatform('reddit', { container: 'mkv' }, 'video'),
      'container "mkv" not allowed'
    );
    expectViolation(
      validateMediaForPlatform('facebook', { codec: 'hevc' }, 'video'),
      'codec "hevc" not allowed'
    );
  });

  it('flags a disallowed image format', () => {
    expectViolation(
      validateMediaForPlatform('linkedin', { format: 'webp' }, 'image'),
      'format "webp" not allowed'
    );
  });

  it('returns multiple violations at once', () => {
    const result = validateMediaForPlatform(
      'instagram',
      { bytes: 5 * GB, durationSec: 600 },
      'video'
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateMediaForPlatform — unknown platform', () => {
  it('returns a typed violation instead of throwing', () => {
    const result = validateMediaForPlatform(
      'myspace',
      { bytes: 100 },
      'video'
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toEqual(['unknown platform "myspace"']);
    }
  });

  it('treats deferred platforms (tiktok, x) as unknown', () => {
    expect(validateMediaForPlatform('tiktok', {}, 'video').ok).toBe(false);
    expect(validateMediaForPlatform('x', {}, 'video').ok).toBe(false);
  });
});

describe('validateCaption', () => {
  it('passes a compliant Instagram caption + hashtag count', () => {
    expect(validateCaption('instagram', 'hello world', 10)).toEqual({ ok: true });
  });

  it('flags an over-length caption', () => {
    const tooLong = 'x'.repeat(2201);
    const result = validateCaption('instagram', tooLong);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.includes('caption exceeds 2200'))).toBe(true);
    }
  });

  it('flags too many hashtags', () => {
    const result = validateCaption('instagram', 'hi', 40);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations.some((v) => v.includes('at most 30 hashtags'))).toBe(true);
    }
  });

  it('handles unknown platform without throwing', () => {
    const result = validateCaption('tiktok', 'hi');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toEqual(['unknown platform "tiktok"']);
    }
  });
});
