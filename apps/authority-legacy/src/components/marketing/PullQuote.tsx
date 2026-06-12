// src/components/marketing/PullQuote.tsx
interface Props {
  quote: string;
  source: string;       // 'IICRC S500-2027, §4.2.1'
  link?: string;        // optional source URL
}

export function PullQuote({ quote, source, link }: Props) {
  return (
    <figure className="my-8 border-l-4 border-candy-red pl-6 py-2 bg-gunmetal-900/40">
      <blockquote className="text-lg italic text-gray-100">"{quote}"</blockquote>
      <figcaption className="mt-2 text-sm text-gray-400">
        — {link ? <a href={link} className="underline">{source}</a> : source}
      </figcaption>
    </figure>
  );
}
