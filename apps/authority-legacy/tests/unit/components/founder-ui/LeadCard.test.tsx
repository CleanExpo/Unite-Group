/**
 * LeadCard composite tests — CRM card with Tier + HealthBar
 */

import { renderToString } from 'react-dom/server';
import { LeadCard } from '@/components/founder/ui/LeadCard';

describe('LeadCard', () => {
  it('renders name, company, tier, and value', () => {
    const html = renderToString(
      <LeadCard name="Sarah Chen" company="TechStart" status="qualified" tier="gold" value={45000} lastActivity="2 days ago" />,
    );
    expect(html).toContain('Sarah Chen');
    expect(html).toContain('TechStart');
    expect(html).toContain('qualified');
    expect(html).toContain('Gold');
    expect(html).toContain('45,000');
  });

  it('shows BLOCKED chip when blocked prop is true', () => {
    const html = renderToString(
      <LeadCard name="Alex" company="BlockCorp" status="proposal" tier="platinum" value={120000} lastActivity="1 week ago" blocked />,
    );
    expect(html).toContain('BLOCKED');
  });

  it('renders health bar with score mapped from status', () => {
    const html = renderToString(
      <LeadCard name="Test" company="Co" status="negotiation" tier="silver" value={30000} lastActivity="today" />,
    );
    expect(html).toMatch(/80/);
  });
});
