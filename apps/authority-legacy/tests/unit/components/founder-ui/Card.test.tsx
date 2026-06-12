/**
 * Card primitive tests — UNI-2060 Phase 2
 *
 * <Card> is a paper surface with layered shadow elevation.
 * Variants: padded (default), flush.
 */

import { renderToString } from 'react-dom/server';
import { Card } from '@/components/founder/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    const html = renderToString(<Card>Hello</Card>);
    expect(html).toContain('Hello');
  });

  it('applies the padded variant by default', () => {
    const html = renderToString(<Card>content</Card>);
    expect(html).toContain('p-6');
  });

  it('applies the flush variant when requested', () => {
    const html = renderToString(<Card variant="flush">content</Card>);
    expect(html).not.toContain('p-6');
    expect(html).toContain('p-0');
  });

  it('has shadow-layered-2 class for paper elevation', () => {
    const html = renderToString(<Card>content</Card>);
    expect(html).toContain('shadow-layered-2');
  });

  it('uses rounded-layered-card radius', () => {
    const html = renderToString(<Card>content</Card>);
    expect(html).toContain('rounded-layered-card');
  });

  it('uses layered-canvas background', () => {
    const html = renderToString(<Card>content</Card>);
    expect(html).toContain('bg-layered-canvas');
  });

  it('accepts extra className via prop', () => {
    const html = renderToString(<Card className="extra-class">content</Card>);
    expect(html).toContain('extra-class');
  });

  it('is a <div> by default', () => {
    const html = renderToString(<Card>content</Card>);
    expect(html).toMatch(/^<div/);
  });

  it('passes through aria roles', () => {
    const html = renderToString(<Card role="region" aria-label="Metrics">content</Card>);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Metrics"');
  });
});
