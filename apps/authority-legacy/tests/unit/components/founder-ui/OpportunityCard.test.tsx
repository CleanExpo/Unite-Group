/**
 * OpportunityCard composite tests — CRM card with Tier + HealthBar + stale flag
 */

import { renderToString } from 'react-dom/server';
import { OpportunityCard } from '@/components/founder/ui/OpportunityCard';

describe('OpportunityCard', () => {
  it('renders title, client, phase, and estimated value', () => {
    const html = renderToString(
      <OpportunityCard
        title="ERP migration"
        client="Metro Logistics"
        phase="proposal"
        tier="platinum"
        estimatedValue={95000}
        winProbability={65}
        nextAction="Send revised scope"
      />,
    );
    expect(html).toContain('ERP migration');
    expect(html).toContain('Metro Logistics');
    expect(html).toContain('proposal');
    expect(html).toContain('95,000');
    expect(html).toMatch(/65/);
  });

  it('flags stale opportunities with red chip after 7 days', () => {
    const html = renderToString(
      <OpportunityCard
        title="Stale deal"
        client="OldCo"
        phase="negotiation"
        tier="silver"
        estimatedValue={20000}
        winProbability={40}
        nextAction="Follow up"
        daysStale={12}
      />,
    );
    expect(html).toMatch(/12.*stale/);
    expect(html).toContain('border-l-red-500');
  });

  it('does not flag fresh opportunities', () => {
    const html = renderToString(
      <OpportunityCard
        title="Fresh deal"
        client="NewCo"
        phase="discovery"
        tier="gold"
        estimatedValue={50000}
        winProbability={25}
        nextAction="Discovery call"
        daysStale={3}
      />,
    );
    expect(html).not.toMatch(/\d+d stale/);
  });
});
