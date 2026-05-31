// src/components/help/HelpArticle.tsx
"use client";

import * as React from "react";
import { ArrowLeft, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HelpArticle as HelpArticleType } from "@/lib/help/articles";

interface HelpArticleProps {
  article: HelpArticleType;
  onBack: () => void;
}

/**
 * Simple markdown-to-HTML renderer.
 * Handles: headings, paragraphs, bold, italic, code blocks, inline code,
 * lists (unordered/ordered), blockquotes, links, tables, and horizontal rules.
 */
function renderMarkdown(md: string): string {
  let html = md;

  // Code blocks (fenced)
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, lang: string, code: string) => {
      const escaped = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<pre class="bg-slate-800 border border-slate-700 rounded-lg p-4 overflow-x-auto my-4 text-sm"><code class="language-${lang || "text"}">${escaped}</code></pre>`;
    }
  );

  // Inline code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded text-sm">$1</code>'
  );

  // Tables
  html = html.replace(
    /(?:^|\n)(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/g,
    (_match, headerRow: string, _separator: string, bodyRows: string) => {
      const headers = headerRow
        .split("|")
        .filter((c: string) => c.trim())
        .map((c: string) => `<th class="border border-slate-700 px-3 py-2 text-left text-slate-300 bg-slate-800/50">${c.trim()}</th>`)
        .join("");
      const rows = bodyRows
        .trim()
        .split("\n")
        .map((row: string) => {
          const cells = row
            .split("|")
            .filter((c: string) => c.trim())
            .map((c: string) => `<td class="border border-slate-700 px-3 py-2 text-slate-300">${c.trim()}</td>`)
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("");
      return `<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-slate-100 mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-slate-100 mt-8 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-slate-100 mt-4 mb-4">$1</h1>');

  // Blockquotes
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote class="border-l-4 border-teal-500/50 pl-4 py-2 my-4 text-slate-300 bg-slate-800/30 rounded-r">$1</blockquote>'
  );

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="text-teal-400 hover:text-teal-300 underline underline-offset-2">$1</a>'
  );

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="border-slate-700 my-6" />');

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300">$1</li>');

  // Wrap consecutive <li> in <ul> or <ol>
  html = html.replace(
    /(<li class="ml-4 list-disc[^"]*">.*<\/li>\n?)+/g,
    (match) => `<ul class="my-3 space-y-1">${match}</ul>`
  );
  html = html.replace(
    /(<li class="ml-4 list-decimal[^"]*">.*<\/li>\n?)+/g,
    (match) => `<ol class="my-3 space-y-1">${match}</ol>`
  );

  // Paragraphs: wrap lines that aren't already wrapped in tags
  html = html
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (/^<(h[1-6]|ul|ol|li|pre|blockquote|div|hr|table)/.test(trimmed)) {
        return trimmed;
      }
      return `<p class="text-slate-300 leading-relaxed my-3">${trimmed}</p>`;
    })
    .join("\n");

  return html;
}

export function HelpArticleView({ article, onBack }: HelpArticleProps) {
  const [feedback, setFeedback] = React.useState<"up" | "down" | null>(null);

  const renderedContent = React.useMemo(
    () => renderMarkdown(article.content),
    [article.content]
  );

  return (
    <div className="space-y-6">
      {/* Back button + meta */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to articles
        </Button>
      </div>

      {/* Article header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-teal-500/30 text-teal-400">
            {article.category}
          </Badge>
          <span className="text-sm text-slate-500">{article.readTime}</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-100">{article.title}</h1>
        <p className="text-slate-400 text-lg">{article.excerpt}</p>
      </div>

      <hr className="border-slate-800" />

      {/* Article content */}
      <article
        className="prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />

      <hr className="border-slate-800" />

      {/* Feedback */}
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-slate-300 font-medium">
          Was this article helpful?
        </p>
        <div className="flex gap-3">
          <Button
            variant={feedback === "up" ? "default" : "outline"}
            size="sm"
            onClick={() => setFeedback("up")}
            className={
              feedback === "up"
                ? "bg-teal-500 hover:bg-teal-600 text-white border-0"
                : "border-slate-700 text-slate-400 hover:text-teal-400 hover:border-teal-500/50 hover:bg-slate-800"
            }
          >
            <ThumbsUp className="h-4 w-4 mr-1" />
            Yes, thanks!
          </Button>
          <Button
            variant={feedback === "down" ? "default" : "outline"}
            size="sm"
            onClick={() => setFeedback("down")}
            className={
              feedback === "down"
                ? "bg-red-500 hover:bg-red-600 text-white border-0"
                : "border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/50 hover:bg-slate-800"
            }
          >
            <ThumbsDown className="h-4 w-4 mr-1" />
            Not really
          </Button>
        </div>
        {feedback && (
          <p className="text-sm text-slate-500">
            Thanks for your feedback!
          </p>
        )}
      </div>
    </div>
  );
}
