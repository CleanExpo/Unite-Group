import { noIndexPageMetadata } from '@/lib/page-metadata'

// Brand Video Studio dashboard page.
// Auth is enforced by the (founder) layout (getUser -> redirect to /auth/login).
import { BrandVideoStudio } from '@/components/brand-video/brand-video-studio';

export const dynamic = 'force-dynamic';

export const metadata = noIndexPageMetadata({
  path: "/founder/brand-video",
  title: "Brand Video | Unite Group",
  description: "Private founder workspace: Brand Video.",
})
export default function BrandVideoStudioPage() {
  return <BrandVideoStudio />;
}
