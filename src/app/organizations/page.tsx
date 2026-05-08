"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabaseClient } from "@/lib/supabase/client";
import { Plus, Building2, Users, FolderOpen, CheckSquare, Settings, LogOut, Home, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface Organization {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  size: string | null;
  created_at: string;
}

const inputStyle: React.CSSProperties = {
  background: "#111113",
  border: "1px solid #27272a",
  color: "#fafafa",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "#d4d4d8",
  marginBottom: 6,
};

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    size: ""
  });
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchOrganizations();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      const result = await response.json();
      if (result.success) {
        setOrganizations(result.data || []);
      } else {
        console.error('Failed to fetch organizations:', result.error);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (result.success) {
        setOrganizations([result.data, ...organizations]);
        setFormData({ name: "", description: "", industry: "", size: "" });
        setIsDialogOpen(false);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization');
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "2px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#a1a1aa", fontSize: 14 }}>Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      {/* Navigation */}
      <nav style={{ borderBottom: "1px solid #27272a", background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
              <div style={{ width: 36, height: 36, background: "#1d4ed8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>UG</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#fafafa" }}>UNITE Group</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>
                <Home size={14} /> Dashboard
              </Link>
              <Link href="/projects" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>
                <FolderOpen size={14} /> Projects
              </Link>
              <Link href="/tasks" style={{ display: "flex", alignItems: "center", gap: 6, color: "#a1a1aa", textDecoration: "none", fontSize: 14 }}>
                <CheckSquare size={14} /> Tasks
              </Link>
              <Link href="/organizations" style={{ display: "flex", alignItems: "center", gap: 6, color: "#3b82f6", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>
                <Users size={14} /> Organizations
              </Link>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/profile" style={{ color: "#a1a1aa", textDecoration: "none" }}>
              <Settings size={18} />
            </Link>
            <button onClick={handleSignOut} style={{ background: "transparent", border: "none", color: "#a1a1aa", cursor: "pointer", padding: 4 }}>
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Link href="/dashboard" style={{ color: "#52525b", textDecoration: "none" }}>
            <ArrowLeft size={18} />
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", margin: 0 }}>Organizations</h1>
            <p style={{ color: "#a1a1aa", fontSize: 15, marginTop: 4 }}>Manage your client organizations and accounts</p>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Building2 size={20} style={{ color: "#1d4ed8" }} />
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", margin: 0 }}>Organization Management</h2>
              <p style={{ color: "#52525b", fontSize: 13, marginTop: 2 }}>Create and manage client organizations</p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> Add Organization
              </button>
            </DialogTrigger>
            <DialogContent style={{ background: "#18181b", border: "1px solid #27272a", color: "#fafafa" } as React.CSSProperties}>
              <DialogHeader>
                <DialogTitle style={{ color: "#fafafa" }}>Add New Organization</DialogTitle>
                <DialogDescription style={{ color: "#a1a1aa" }}>
                  Create a new organization to manage projects and contacts.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Organization Name *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Enter organization name"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <input
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Brief description"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Industry</label>
                  <Select value={formData.industry} onValueChange={(value) => handleChange('industry', value)}>
                    <SelectTrigger style={{ background: "#111113", border: "1px solid #27272a", color: "#fafafa" } as React.CSSProperties}>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent style={{ background: "#18181b", border: "1px solid #27272a" } as React.CSSProperties}>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label style={labelStyle}>Company Size</label>
                  <Select value={formData.size} onValueChange={(value) => handleChange('size', value)}>
                    <SelectTrigger style={{ background: "#111113", border: "1px solid #27272a", color: "#fafafa" } as React.CSSProperties}>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent style={{ background: "#18181b", border: "1px solid #27272a" } as React.CSSProperties}>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-1000">201-1000 employees</SelectItem>
                      <SelectItem value="1000+">1000+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 8 }}>
                  <button type="button" onClick={() => setIsDialogOpen(false)} style={{ background: "transparent", border: "1px solid #27272a", color: "#a1a1aa", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    Create Organization
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {organizations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            style={{ background: "#111113", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", border: "1px solid #27272a", borderRadius: 12, padding: 48, textAlign: "center" }}>
            <Building2 size={40} style={{ color: "#52525b", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>No organizations yet</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 24 }}>
              Get started by creating your first organization to manage projects and contacts.
            </p>
            <button onClick={() => setIsDialogOpen(true)} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Add Your First Organization
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            style={{ background: "#111113", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", border: "1px solid #27272a", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #27272a" }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", margin: 0 }}>All Organizations</h2>
              <p style={{ color: "#52525b", fontSize: 13, marginTop: 4 }}>
                {organizations.length} organization{organizations.length !== 1 ? 's' : ''} total
              </p>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #27272a" }}>
                    <th style={{ padding: "12px 24px", textAlign: "left", color: "#52525b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Name</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", color: "#52525b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Industry</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", color: "#52525b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Size</th>
                    <th style={{ padding: "12px 24px", textAlign: "left", color: "#52525b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {organizations.map((org) => (
                    <tr key={org.id} style={{ borderBottom: "1px solid #27272a" }}>
                      <td style={{ padding: "14px 24px" }}>
                        <div style={{ fontWeight: 500, color: "#fafafa" }}>{org.name}</div>
                        {org.description && (
                          <div style={{ fontSize: 12, color: "#52525b", marginTop: 2 }}>{org.description}</div>
                        )}
                      </td>
                      <td style={{ padding: "14px 24px", color: "#a1a1aa" }}>{org.industry || '—'}</td>
                      <td style={{ padding: "14px 24px", color: "#a1a1aa" }}>{org.size || '—'}</td>
                      <td style={{ padding: "14px 24px", color: "#a1a1aa", fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
