"use client";

import Link from "next/link";
import { Calendar, User, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";

const cardShine: React.CSSProperties = {
  background: "#111113",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
  border: "1px solid #27272a",
  borderRadius: 12,
  padding: 32,
};

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: "How CCW Built a Full CRM on Unite-Group Infrastructure in 8 Weeks",
      excerpt: "A technical deep-dive into the CCW-CRM implementation: Supabase schema design, real-time job status, and the custom intake flow that replaced 3 spreadsheets.",
      author: "Phill McGurk",
      date: "May 5, 2026",
      readTime: "8 min read",
      category: "Case Study",
      slug: "ccw-crm-implementation"
    },
    {
      id: 2,
      title: "Launching RestoreAssist on the App Store: What We Learned",
      excerpt: "From TestFlight to App Store approval — the submission process, review rejections, screenshots that convert, and the first 30 days of organic installs.",
      author: "Phill McGurk",
      date: "April 18, 2026",
      readTime: "11 min read",
      category: "Product Launch",
      slug: "restoreassist-app-store-launch"
    },
    {
      id: 3,
      title: "GEO vs SEO: Why Generative Engine Optimisation Is the New Frontier for Trade Businesses",
      excerpt: "Google AI Overviews now answer 42% of restoration-related queries without a click. Here's how we track citation position and what content earns mentions.",
      author: "Phill McGurk",
      date: "March 29, 2026",
      readTime: "9 min read",
      category: "SEO & GEO",
      slug: "geo-vs-seo-trade-businesses"
    },
  ];

  const featuredPost = blogPosts[0];
  const remainingPosts = blogPosts.slice(1);

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-display)" }}>

      {/* Page title */}
      <div style={{ padding: "24px 32px 0" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-display)" }}>
          Insights &amp; Resources
        </h1>
        <p style={{ fontSize: 13, color: "#52525b", margin: "4px 0 0" }}>
          Field notes from building autonomous agency across five portfolio businesses.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Featured Post */}
        <section style={{ padding: "32px 32px 24px" }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#52525b", marginBottom: 16 }}>Featured Article</p>
            <div style={cardShine}>
              <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1d4ed8", background: "rgba(29,78,216,0.1)", padding: "4px 10px", borderRadius: 4, marginBottom: 16 }}>
                {featuredPost.category}
              </span>
              <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", marginBottom: 12 }}>{featuredPost.title}</h2>
              <p style={{ fontSize: 15, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 20 }}>{featuredPost.excerpt}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#52525b", fontSize: 13, marginBottom: 24 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={12} />{featuredPost.author}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={12} />{featuredPost.date}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} />{featuredPost.readTime}</span>
              </div>
              <Link href={`/blog/${featuredPost.slug}`} style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6 }}>
                Read Article <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* Remaining Posts */}
        <section style={{ padding: "0 32px 80px" }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#52525b", marginBottom: 16 }}>Latest Articles</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {remainingPosts.map((post) => (
                <div key={post.id} style={{
                  background: "#111113",
                  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                }}>
                  <span style={{ display: "inline-block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1d4ed8", background: "rgba(29,78,216,0.1)", padding: "4px 10px", borderRadius: 4, marginBottom: 12, alignSelf: "flex-start" }}>
                    {post.category}
                  </span>
                  <h3 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: "#fafafa", marginBottom: 10, flex: 1 }}>{post.title}</h3>
                  <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6, marginBottom: 16 }}>{post.excerpt}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#52525b", fontSize: 12, marginBottom: 20 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={11} />{post.author}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} />{post.date}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />{post.readTime}</span>
                  </div>
                  <Link href={`/blog/${post.slug}`} style={{ color: "#3b82f6", textDecoration: "none", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                    Read Article <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
