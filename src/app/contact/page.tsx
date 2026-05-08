"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, Phone, Calendar, MessageSquare } from "lucide-react";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit the form');
      }
      setSuccess(true);
      setFormData({ name: "", email: "", company: "", service: "", message: "" });
      const formElement = document.getElementById('contact-form');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const services = [
    "Initial Consultation ($550)",
    "Expert Education",
    "Software Development",
    "Strategic SEO",
    "Business Strategy",
    "General Inquiry"
  ];

  const inputStyle: React.CSSProperties = {
    background: "#111113",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#d4d4d8",
    marginBottom: 6,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      {/* Navigation */}
      <nav style={{ borderBottom: "1px solid #27272a", background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 32px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <Link href="/" style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", textDecoration: "none" }}>
            UNITE Group
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/features" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>Services</Link>
            <Link href="/pricing" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>Pricing</Link>
            <Link href="/contact" style={{ color: "#fafafa", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>Contact</Link>
            <Link href="/about" style={{ color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>About</Link>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/login" style={{ color: "#a1a1aa", textDecoration: "none", padding: "8px 16px", fontSize: 14 }}>Login</Link>
            <Link href="/contact" style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: "80px 32px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.04em", color: "#fafafa", marginBottom: 16 }}>
            Ready to Transform Your Business?
          </h1>
          <p style={{ fontSize: 18, color: "#a1a1aa", lineHeight: 1.6 }}>
            Start with our comprehensive $550 consultation or reach out for any questions about our services.
          </p>
        </div>
      </section>

      {/* Form + Info */}
      <section style={{ padding: "40px 32px 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>

          {/* Contact Form */}
          <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 12, padding: 32 }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>Send us a Message</h2>
            <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 24 }}>
              Fill out the form below and we&apos;ll get back to you within 24 hours.
            </p>

            {success && (
              <div style={{ marginBottom: 24, padding: 16, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 8 }}>
                <p style={{ color: "#16a34a", fontWeight: 500, fontSize: 14 }}>Message sent successfully!</p>
                <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 4 }}>We&apos;ll get back to you within 24 hours.</p>
              </div>
            )}

            {error && (
              <div style={{ marginBottom: 24, padding: 16, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8 }}>
                <p style={{ color: "#dc2626", fontWeight: 500, fontSize: 14 }}>Error sending message</p>
                <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 4 }}>{error}</p>
              </div>
            )}

            <form id="contact-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input id="name" name="name" type="text" placeholder="John Doe" value={formData.name} onChange={handleChange} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input id="email" name="email" type="email" placeholder="john@company.com" value={formData.email} onChange={handleChange} style={inputStyle} required />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Company (Optional)</label>
                <input id="company" name="company" type="text" placeholder="Your Company" value={formData.company} onChange={handleChange} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Service Interest</label>
                <select id="service" name="service" value={formData.service} onChange={handleChange} style={inputStyle} title="Select the service you are interested in" required>
                  <option value="">Select a service...</option>
                  {services.map((service, index) => (
                    <option key={index} value={service}>{service}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>Message</label>
                <textarea id="message" name="message" rows={5} placeholder="Tell us about your project, goals, or questions..." value={formData.message} onChange={handleChange} style={{ ...inputStyle, resize: "vertical", minHeight: 120 }} required />
              </div>

              <button type="submit" disabled={loading} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "background 160ms ease-out" }}>
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", marginBottom: 12 }}>Contact Information</h2>
              <p style={{ fontSize: 15, color: "#a1a1aa", lineHeight: 1.6 }}>Ready to get started? Book your consultation or reach out through any of these channels.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: <Calendar size={18} style={{ color: "#1d4ed8" }} />, title: "Book Consultation", detail: "$550 — 1 Hour Session", desc: "Comprehensive business analysis and strategic planning" },
                { icon: <Mail size={18} style={{ color: "#1d4ed8" }} />, title: "Email", detail: "contact@unite-group.in", desc: "Send us an email anytime" },
                { icon: <Phone size={18} style={{ color: "#1d4ed8" }} />, title: "Phone", detail: "0457 123 005", desc: "Mon-Fri from 8am to 6pm" },
                { icon: <MessageSquare size={18} style={{ color: "#1d4ed8" }} />, title: "Response Time", detail: "Within 24 Hours", desc: "We&apos;re committed to quick responses" },
              ].map((info, i) => (
                <div key={i} style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: 20, display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>{info.icon}</div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#52525b", marginBottom: 4 }}>{info.title}</p>
                    <p style={{ fontSize: 15, fontWeight: 500, color: "#fafafa", marginBottom: 2 }}>{info.detail}</p>
                    <p style={{ fontSize: 13, color: "#a1a1aa" }}>{info.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(29,78,216,0.08)", border: "1px solid rgba(29,78,216,0.2)", borderRadius: 10, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>Ready to Start Your Journey?</h3>
              <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 16 }}>
                Book your $550 consultation today and take the first step toward transforming your business.
              </p>
              <Link href="/book-consultation" style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, display: "inline-block" }}>
                Book Consultation
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "60px 32px", borderTop: "1px solid #27272a" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", textAlign: "center", marginBottom: 40 }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { q: "How quickly will you respond?", a: "We typically respond to all inquiries within 24 hours during business days. For consultation bookings, we'll contact you to schedule within the same timeframe." },
              { q: "What happens during the consultation?", a: "Our $550 consultation includes comprehensive business analysis, technology needs assessment, and strategic roadmap development with a detailed follow-up report." },
              { q: "Do you work with all business sizes?", a: "Yes! We work with startups, SMEs, and large enterprises across all industries. Our solutions are tailored to your specific business size and needs." },
              { q: "How is project pricing determined?", a: "After your initial consultation, we provide detailed quotes based on project scope, complexity, timeline, and resource requirements. All pricing is transparent with no hidden fees." },
            ].map((faq, i) => (
              <div key={i} style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 10, padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#fafafa", marginBottom: 10 }}>{faq.q}</h3>
                <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
