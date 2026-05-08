"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Check, Clock, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function BookConsultation() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    company: "",
    phone: "",
    service_type: "Initial Consultation ($550)",
    preferred_date: undefined as Date | undefined,
    preferred_time: "",
    alternate_date: undefined as Date | undefined,
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
  ];

  const serviceTypes = [
    "Initial Consultation ($550)",
    "Follow-up Consultation",
    "Project Discussion",
    "Technical Review",
    "Strategy Session"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    setFormData({ ...formData, [field]: date });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.client_name || !formData.client_email || !formData.preferred_date || !formData.preferred_time) {
      setError("Please fill in all required fields");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to book consultation');
      setSuccess(true);
      setFormData({
        client_name: "", client_email: "", company: "", phone: "",
        service_type: "Initial Consultation ($550)",
        preferred_date: undefined, preferred_time: "", alternate_date: undefined, message: ""
      });
      const formElement = document.getElementById('booking-form');
      if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "#111113",
    border: "1px solid #27272a",
    color: "#fafafa",
    borderRadius: 8,
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

  const popoverBtnStyle = (hasValue: boolean): React.CSSProperties => ({
    background: "#111113",
    border: "1px solid #27272a",
    color: hasValue ? "#fafafa" : "#52525b",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter)" }}>

      {/* Page title */}
      <div style={{ padding: "24px 32px 0" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", letterSpacing: "-0.02em", margin: 0, fontFamily: "var(--font-inter)" }}>
          Book a Consultation
        </h1>
        <p style={{ fontSize: 13, color: "#52525b", margin: "4px 0 0" }}>
          Schedule your $550 strategic consultation session.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Booking Form */}
        <section style={{ padding: "32px 32px 80px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              background: "#111113",
              backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
              border: "1px solid #27272a",
              borderRadius: 12,
              padding: 40,
            }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>Book Your Consultation</h2>
              <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 32 }}>
                Complete the form below. We&apos;ll confirm your booking within 24 hours.
              </p>

              {success && (
                <div style={{ marginBottom: 24, padding: 16, background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.2)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <Check size={16} style={{ color: "#16a34a", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ color: "#16a34a", fontWeight: 500, fontSize: 14 }}>Consultation booked successfully!</p>
                    <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 4 }}>We&apos;ll contact you within 24 hours to confirm your preferred time and date.</p>
                  </div>
                </div>
              )}

              {error && (
                <div style={{ marginBottom: 24, padding: 16, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <AlertCircle size={16} style={{ color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p style={{ color: "#dc2626", fontWeight: 500, fontSize: 14 }}>Error booking consultation</p>
                    <p style={{ color: "#a1a1aa", fontSize: 13, marginTop: 4 }}>{error}</p>
                  </div>
                </div>
              )}

              <form id="booking-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Full Name <span style={{ color: "#dc2626" }}>*</span></label>
                    <input id="client_name" name="client_name" type="text" placeholder="John Doe" value={formData.client_name} onChange={handleChange} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address <span style={{ color: "#dc2626" }}>*</span></label>
                    <input id="client_email" name="client_email" type="email" placeholder="john@example.com" value={formData.client_email} onChange={handleChange} style={inputStyle} required />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Company (Optional)</label>
                    <input id="company" name="company" type="text" placeholder="Your Company" value={formData.company} onChange={handleChange} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone Number</label>
                    <input id="phone" name="phone" type="tel" placeholder="+61 400 000 000" value={formData.phone} onChange={handleChange} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Consultation Type <span style={{ color: "#dc2626" }}>*</span></label>
                  <select id="service_type" name="service_type" value={formData.service_type} onChange={handleChange} style={inputStyle} aria-label="Consultation Type" title="Select the type of consultation" required>
                    {serviceTypes.map((type, index) => (
                      <option key={index} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Preferred Date <span style={{ color: "#dc2626" }}>*</span></label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" style={popoverBtnStyle(!!formData.preferred_date)}>
                          <CalendarIcon size={14} style={{ flexShrink: 0 }} />
                          {formData.preferred_date ? format(formData.preferred_date, "MMMM d, yyyy") : "Select date"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent style={{ padding: 0, background: "#18181b", border: "1px solid #27272a", borderRadius: 8 } as React.CSSProperties}>
                        <Calendar
                          mode="single"
                          selected={formData.preferred_date}
                          onSelect={(date) => handleDateChange('preferred_date', date)}
                          initialFocus
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          className="bg-transparent text-white"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label style={labelStyle}>Preferred Time <span style={{ color: "#dc2626" }}>*</span></label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button type="button" style={popoverBtnStyle(!!formData.preferred_time)}>
                          <Clock size={14} style={{ flexShrink: 0 }} />
                          {formData.preferred_time || "Select time"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent style={{ padding: 8, background: "#18181b", border: "1px solid #27272a", borderRadius: 8, display: "grid", gap: 2 } as React.CSSProperties}>
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setFormData({ ...formData, preferred_time: time })}
                            style={{ background: formData.preferred_time === time ? "rgba(29,78,216,0.2)" : "transparent", border: "none", color: formData.preferred_time === time ? "#3b82f6" : "#a1a1aa", borderRadius: 4, padding: "6px 12px", fontSize: 13, cursor: "pointer", textAlign: "left" }}
                          >
                            {time}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Alternate Date (Optional)</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" style={popoverBtnStyle(!!formData.alternate_date)}>
                        <CalendarIcon size={14} style={{ flexShrink: 0 }} />
                        {formData.alternate_date ? format(formData.alternate_date, "MMMM d, yyyy") : "Select alternate date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent style={{ padding: 0, background: "#18181b", border: "1px solid #27272a", borderRadius: 8 } as React.CSSProperties}>
                      <Calendar
                        mode="single"
                        selected={formData.alternate_date}
                        onSelect={(date) => handleDateChange('alternate_date', date)}
                        initialFocus
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="bg-transparent text-white"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label style={labelStyle}>What would you like to discuss? (Optional)</label>
                  <textarea id="message" name="message" rows={4} value={formData.message} onChange={handleChange} placeholder="Please share any specific topics you'd like to discuss during the consultation..." style={{ ...inputStyle, resize: "vertical", minHeight: 100 }} />
                </div>

                <button
                  type="submit"
                  disabled={loading || success}
                  style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 15, fontWeight: 500, cursor: loading || success ? "not-allowed" : "pointer", opacity: loading || success ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background 160ms ease-out" }}
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing...</>
                  ) : (
                    "Book Consultation — $550"
                  )}
                </button>

                <p style={{ fontSize: 12, color: "#52525b", textAlign: "center" }}>
                  By booking a consultation, you agree to our{" "}
                  <Link href="/terms" style={{ color: "#3b82f6", textDecoration: "none" }}>Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/privacy" style={{ color: "#3b82f6", textDecoration: "none" }}>Privacy Policy</Link>.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section style={{ padding: "60px 32px 80px", borderTop: "1px solid #27272a" }}>
          <div style={{ maxWidth: 1060, margin: "0 auto" }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", textAlign: "center", marginBottom: 40 }}>
              What to Expect From Your Consultation
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
              {[
                { title: "Comprehensive Analysis", body: "Our expert consultants will conduct an in-depth analysis of your business, technology needs, market position, and growth opportunities." },
                { title: "Strategic Roadmap", body: "Receive a detailed strategic roadmap with actionable recommendations tailored to your business goals, technical requirements, and budget." },
                { title: "Implementation Plan", body: "Get a clear implementation timeline with defined milestones, resource requirements, and cost estimates for your project or business initiative." },
              ].map((item, i) => (
                <div key={i} style={{
                  background: "#111113",
                  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
                  border: "1px solid #27272a",
                  borderRadius: 12,
                  padding: 24,
                }}>
                  <div style={{ width: 36, height: 36, background: "rgba(29,78,216,0.15)", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#3b82f6", fontSize: 16, fontWeight: 700 }}>{i + 1}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", marginBottom: 10 }}>{item.title}</h3>
                  <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.6 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
