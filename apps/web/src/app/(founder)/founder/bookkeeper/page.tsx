import { BookkeeperView } from '@/founder/bookkeeper/BookkeeperView'
import { noIndexPageMetadata } from '@/lib/page-metadata'


export const dynamic = 'force-dynamic'

export const metadata = noIndexPageMetadata({
  path: "/founder/bookkeeper",
  title: "Bookkeeper | Unite Group",
  description: "Private founder workspace: Bookkeeper.",
})
export default function BookkeeperPage() {
  return <BookkeeperView />
}
