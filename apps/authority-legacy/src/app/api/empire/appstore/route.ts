import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Cache for 10 minutes — iTunes API is not real-time
export const revalidate = 600;

const BUNDLE_ID = 'com.restoreassist.app';
const ITUNES_URL = `https://itunes.apple.com/lookup?bundleId=${BUNDLE_ID}&country=au`;

export async function GET() {
  try {
    const res = await fetch(ITUNES_URL, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`iTunes API ${res.status}`);
    const data = await res.json();

    if (!data.resultCount || data.resultCount === 0) {
      return NextResponse.json({ status: 'not_found', bundle_id: BUNDLE_ID });
    }

    const app = data.results[0];
    return NextResponse.json({
      status: 'live',
      bundle_id: BUNDLE_ID,
      app_name: app.trackName,
      version: app.version,
      price: app.formattedPrice || 'Free',
      rating: app.averageUserRating ?? null,
      rating_count: app.userRatingCount ?? 0,
      rating_current_version: app.averageUserRatingForCurrentVersion ?? null,
      rating_count_current: app.userRatingCountForCurrentVersion ?? 0,
      release_date: app.releaseDate,
      updated_at: app.currentVersionReleaseDate,
      app_store_url: app.trackViewUrl,
      developer: app.artistName,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    );
  }
}
