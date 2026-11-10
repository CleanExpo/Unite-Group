import { SkillHealthDashboard } from '@/founder/skills/SkillHealthDashboard'
import { noIndexPageMetadata } from '@/lib/page-metadata'

export const metadata = noIndexPageMetadata({
  path: '/founder/skills',
  title: 'Skills health | Unite Group',
  description: 'Automated evaluation scores for agent skills.',
})

export default function SkillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Skill Health
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Automated evaluation scores for Claude Code skills
        </p>
      </div>
      <SkillHealthDashboard />
    </div>
  )
}
