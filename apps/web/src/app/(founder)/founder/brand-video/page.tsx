// Brand Video Studio dashboard page.
// Auth is enforced by the (founder) layout (getUser -> redirect to /auth/login).
import { BrandVideoStudio } from '@/components/brand-video/brand-video-studio';

export const dynamic = 'force-dynamic';

export default function BrandVideoStudioPage() {
  return <BrandVideoStudio />;
}
