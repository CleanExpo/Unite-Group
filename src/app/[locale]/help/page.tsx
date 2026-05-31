// src/app/[locale]/help/page.tsx
// In-app help center with search, category filtering, and article view.

"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  CreditCard,
  User,
  Code,
  AlertTriangle,
  Clock,
  MessageCircle,
  Mail,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  helpArticles,
  HELP_CATEGORIES,
  type HelpCategory,
  type HelpArticle,
} from "@/lib/help/articles";
import { HelpSearch, highlightMatch } from "@/components/help/HelpSearch";
import { HelpArticleView } from "@/components/help/HelpArticle";

// ─── Category Icons ────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<HelpCategory, React.ReactNode> = {
  "Getting Started": <BookOpen className="h-4 w-4" />,
  Billing: <CreditCard className="h-4 w-4" />,
  Account: <User className="h-4 w-4" />,
  API: <Code className="h-4 w-4" />,
  Troubleshooting: <AlertTriangle className="h-4 w-4" />,
};

// ─── Page Component ────────────────────────────────────────────────────────

export default function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [locale, setLocale] = React.useState("en");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<
    HelpCategory | "All"
  >("All");
  const [selectedArticle, setSelectedArticle] =
    React.useState<HelpArticle | null>(null);

  // Resolve locale from params
  React.useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  // Filter articles
  const filteredArticles = React.useMemo(() => {
    let articles = helpArticles;

    // Category filter
    if (activeCategory !== "All") {
      articles = articles.filter((a) => a.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      articles = articles.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q)
      );
    }

    return articles;
  }, [activeCategory, searchQuery]);

  // Article count per category
  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = { All: helpArticles.length };
    for (const cat of HELP_CATEGORIES) {
      counts[cat] = helpArticles.filter((a) => a.category === cat).length;
    }
    return counts;
  }, []);

  // If an article is selected, show the article view
  if (selectedArticle) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <HelpArticleView
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <section className="pt-16 pb-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-teal-400 font-semibold text-sm uppercase tracking-wider mb-3">
              Help Center
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-100 mb-4">
              How can we help?
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8">
              Search our knowledge base or browse by category to find answers to
              common questions.
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <HelpSearch query={searchQuery} onChange={setSearchQuery} />
            </div>
          </div>
        </section>

        {/* ─── Main Content ────────────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* ─── Category Sidebar ──────────────────────────────────── */}
              <aside className="lg:w-64 shrink-0">
                <nav className="sticky top-8 space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 px-3">
                    Categories
                  </p>
                  <button
                    onClick={() => setActiveCategory("All")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeCategory === "All"
                        ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <span>All Articles</span>
                    <span className="text-xs text-slate-500">
                      {categoryCounts["All"]}
                    </span>
                  </button>
                  {HELP_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeCategory === cat
                          ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {CATEGORY_ICONS[cat]}
                        {cat}
                      </span>
                      <span className="text-xs text-slate-500">
                        {categoryCounts[cat]}
                      </span>
                    </button>
                  ))}
                </nav>
              </aside>

              {/* ─── Article List ──────────────────────────────────────── */}
              <div className="flex-1 min-w-0">
                {searchQuery && (
                  <p className="text-sm text-slate-500 mb-4">
                    {filteredArticles.length} result
                    {filteredArticles.length !== 1 ? "s" : ""} for &quot;
                    <span className="text-slate-300">{searchQuery}</span>&quot;
                  </p>
                )}

                {filteredArticles.length === 0 ? (
                  <div className="text-center py-16">
                    <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-300 mb-2">
                      No articles found
                    </h3>
                    <p className="text-slate-500">
                      Try adjusting your search or browse a different category.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredArticles.map((article) => (
                      <Card
                        key={article.id}
                        className="cursor-pointer border-slate-800 bg-slate-900/50 hover:border-teal-500/30 hover:bg-slate-900/80 group"
                        onClick={() => setSelectedArticle(article)}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="border-slate-700 text-slate-400 text-xs"
                                >
                                  {article.category}
                                </Badge>
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock className="h-3 w-3" />
                                  {article.readTime}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-slate-100 group-hover:text-teal-400 transition-colors">
                                {highlightMatch(article.title, searchQuery)}
                              </h3>
                              <p className="text-sm text-slate-400 line-clamp-2">
                                {highlightMatch(article.excerpt, searchQuery)}
                              </p>
                            </div>
                            <span className="text-slate-600 group-hover:text-teal-500 transition-colors shrink-0 mt-1">
                              →
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Contact Support CTA ─────────────────────────────────────── */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-xl border border-teal-500/20 bg-gradient-to-br from-slate-900 to-slate-900/80 p-8 sm:p-10 shadow-lg shadow-teal-500/5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl font-bold text-slate-100 mb-2">
                    Still need help?
                  </h2>
                  <p className="text-slate-400">
                    Our support team is available Monday–Friday, 9am–6pm EST.
                    We typically respond within 2 hours.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <Button
                    asChild
                    size="lg"
                    className="bg-teal-500 hover:bg-teal-600 text-white border-0"
                  >
                    <Link href={`/${locale}/contact`}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Contact Support
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
                  >
                    <a href="mailto:support@unite-hub.com">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Us
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
