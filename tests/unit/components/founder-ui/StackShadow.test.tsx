/**
 * StackShadow primitive tests — UNI-2060 Phase 2 (deferred)
 *
 * <StackShadow> wraps children with layered paper + shadow pseudo-elements.
 */

import { renderToString } from 'react-dom/server';
import { StackShadow } from '@/components/founder/ui/StackShadow';

describe('StackShadow', () => {
  it('renders children inside the wrapper', () => {
    const html = renderToString(
      <StackShadow>
        <div>Card body</div>
      </StackShadow>,
    );
    expect(html).toContain('Card body');
  });

  it('applies layered shadow class', () => {
    const html = renderToString(
      <StackShadow>
        <div>Test</div>
      </StackShadow>,
    );
    expect(html).toContain('shadow-layered');
  });
});
