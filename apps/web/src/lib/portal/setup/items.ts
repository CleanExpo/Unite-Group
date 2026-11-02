import type { ConnectionKind } from './types'

// The guided checklist, in the order the owner should work through it. Plain steps for a non-technical owner.
// Video ids are the three how-to videos verified for this job (brief, 02/11/2026). They open on youtube-nocookie
// (privacy-enhanced mode), in a new tab, never autoplaying.

export const NO_PASSWORD_LINE = "You never give us your password. You click Allow on Google's or Microsoft's own screen."

export type HowToVideo = { id: string; title: string }

export type ChecklistItem = {
  kind: ConnectionKind
  title: string
  why: string
  steps: readonly string[]
  video: HowToVideo | null
  valueLabel: string
  placeholder: string
  /** For GSC, Bing and GBP: the button text she presses once she has added our account. */
  accessLabel: string | null
}

const socialSteps = (site: string): readonly string[] => [
  `Open your ${site} page in your browser.`,
  'Copy the address from the bar at the top.',
  'Paste it below and press Save.',
]

export const CHECKLIST: readonly ChecklistItem[] = [
  {
    kind: 'gsc',
    title: 'Google Search Console',
    why: 'Shows us how people find your site on Google, so we can fix what holds it back.',
    steps: [
      'Open Google Search Console and choose Add property, then Domain.',
      'Type your web address and copy the TXT record Google shows you.',
      'Add that record where your domain is managed, then press Verify in Search Console.',
      'In Settings, open Users and permissions and add the Google account we give you.',
    ],
    video: { id: 'AHnZPN60paA', title: 'Verify your site in Search Console with a DNS TXT record' },
    valueLabel: 'Your website address',
    placeholder: 'https://yourbusiness.com.au/',
    accessLabel: 'I have added your account',
  },
  {
    kind: 'bing',
    title: 'Bing Webmaster Tools',
    why: 'Bing also feeds search in Windows and some AI assistants. One import copies your Google setup.',
    steps: [
      'Sign in to Bing Webmaster Tools with your Microsoft account.',
      'Choose Import from Google Search Console and click Allow on Google’s screen.',
      'In Settings, open User management and add the Microsoft account we give you.',
    ],
    video: { id: '4v4I25z0HV0', title: 'Import your site into Bing from Google Search Console' },
    valueLabel: 'Your website address',
    placeholder: 'https://yourbusiness.com.au/',
    accessLabel: 'I have added your account',
  },
  {
    kind: 'gbp',
    title: 'Google Business Profile',
    why: 'Your listing on Google Maps. As a Manager we can post updates and answer reviews. You stay the owner.',
    steps: [
      'Open your Business Profile on Google and choose Business Profile settings.',
      'Open Managers, then press Add.',
      'Enter the Google account we give you and choose Manager, not Owner.',
      'Copy the share link of your profile and paste it below.',
    ],
    video: { id: 'SqqqOF3AJo8', title: 'Add a Manager to your Google Business Profile' },
    valueLabel: 'Your Business Profile link',
    placeholder: 'https://maps.app.goo.gl/...',
    accessLabel: 'I have added you as Manager',
  },
  { kind: 'facebook', title: 'Facebook page', why: 'So we can link to it and plan your posts.', steps: socialSteps('Facebook'), video: null, valueLabel: 'Your Facebook page link', placeholder: 'https://www.facebook.com/yourbusiness', accessLabel: null },
  { kind: 'instagram', title: 'Instagram', why: 'So we can link to it and plan your posts.', steps: socialSteps('Instagram'), video: null, valueLabel: 'Your Instagram link', placeholder: 'https://www.instagram.com/yourbusiness', accessLabel: null },
  { kind: 'linkedin', title: 'LinkedIn', why: 'So we can link to your company page.', steps: socialSteps('LinkedIn company'), video: null, valueLabel: 'Your LinkedIn page link', placeholder: 'https://www.linkedin.com/company/yourbusiness', accessLabel: null },
  { kind: 'youtube', title: 'YouTube', why: 'So we can link to your channel.', steps: socialSteps('YouTube channel'), video: null, valueLabel: 'Your YouTube channel link', placeholder: 'https://www.youtube.com/@yourbusiness', accessLabel: null },
  { kind: 'tiktok', title: 'TikTok', why: 'So we can link to your profile.', steps: socialSteps('TikTok profile'), video: null, valueLabel: 'Your TikTok link', placeholder: 'https://www.tiktok.com/@yourbusiness', accessLabel: null },
  { kind: 'x', title: 'X (Twitter)', why: 'So we can link to your profile.', steps: socialSteps('X profile'), video: null, valueLabel: 'Your X link', placeholder: 'https://x.com/yourbusiness', accessLabel: null },
]

/** Privacy-enhanced player link. No autoplay parameter, ever. */
export function videoWatchUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`
}

/** YouTube's own still frame for the video. A real image, not drawn. */
export function videoThumbnailUrl(id: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`
}
