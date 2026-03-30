import type { EeatDigestData } from './buildEeatDigestSection';

export function renderEeatEmailSection(data: EeatDigestData): string {
  if (data.skipped) {
    return `
---
E.E.A.T. AUTHORITY SCORE
E.E.A.T. tracking starting next week. Your Authority Score will appear here.
---
`;
  }

  const barMax = 100;
  const filledChar = '█';
  const emptyChar = '░';
  const barWidth = 20;

  const componentBars = Object.entries(data.breakdown)
    .map(([name, score]) => {
      const filled = Math.round((score / barMax) * barWidth);
      const bar = filledChar.repeat(filled) + emptyChar.repeat(barWidth - filled);
      return `  ${name.padEnd(20)} ${bar} ${score}`;
    })
    .join('\n');

  return `
---
E.E.A.T. AUTHORITY SCORE
Score: ${data.score}/100  Grade: ${data.grade}  ${data.delta_arrow} ${data.delta_label}
${data.top_mover ? `Biggest mover: ${data.top_mover}` : ''}

Component breakdown:
${componentBars}

THIS WEEK'S ACTION:
${data.action}
---
`;
}
