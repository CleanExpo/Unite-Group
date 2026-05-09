// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { supabaseClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { AnalyticsDashboard } from "../../../../components/analytics/AnalyticsDashboard";
import { trackPageView, type ReportTimePeriod, type DashboardConfig } from "@/lib/analytics";

const dashboardConfig = {
  name: "Business Analytics",
  widgets: [
    { id: "overview-revenue", type: "metric", title: "Total Revenue", config: { metric: "total_revenue", format: "currency", prefix: "$", showComparison: true, comparisonLabel: "vs. previous period" } },
    { id: "overview-clients", type: "metric", title: "Total Clients", config: { metric: "client_count", showComparison: true, comparisonLabel: "vs. previous period" } },
    { id: "overview-projects", type: "metric", title: "Active Projects", config: { metric: "active_project_count", showComparison: true, comparisonLabel: "vs. previous period" } },
    { id: "overview-duration", type: "metric", title: "Avg. Project Duration", config: { metric: "avg_project_duration", suffix: " days", showComparison: false } },
    { id: "revenue-chart", type: "chart", title: "Revenue Overview", subtitle: "Monthly revenue for the past year", config: { type: "bar", metrics: ["monthly_revenue"], showLegend: true } },
    { id: "clients-chart", type: "chart", title: "Client Acquisition", subtitle: "New vs. returning clients by month", config: { type: "line", metrics: ["new_clients", "returning_clients"], showLegend: true } },
    { id: "services-distribution", type: "chart", title: "Services Distribution", subtitle: "Revenue breakdown by service type", config: { type: "pie", metrics: ["service_revenue"] } },
    { id: "project-status", type: "funnel", title: "Project Status Distribution", subtitle: "Current status of all projects", config: { steps: [{ name: "Planning", metric: "planning_projects" }, { name: "In Progress", metric: "progress_projects" }, { name: "Review", metric: "review_projects" }, { name: "Completed", metric: "completed_projects" }], showConversionRates: true } }
  ],
  layout: [
    { widgetId: "overview-revenue", position: { x: 0, y: 0, width: 1, height: 1 } },
    { widgetId: "overview-clients", position: { x: 1, y: 0, width: 1, height: 1 } },
    { widgetId: "overview-projects", position: { x: 2, y: 0, width: 1, height: 1 } },
    { widgetId: "overview-duration", position: { x: 3, y: 0, width: 1, height: 1 } },
    { widgetId: "revenue-chart", position: { x: 0, y: 1, width: 2, height: 2 } },
    { widgetId: "clients-chart", position: { x: 2, y: 1, width: 2, height: 2 } },
    { widgetId: "services-distribution", position: { x: 0, y: 3, width: 2, height: 2 } },
    { widgetId: "project-status", position: { x: 2, y: 3, width: 2, height: 2 } }
  ]
};

const sampleData = {
  "overview-revenue": { value: 97500, previousValue: 84800 },
  "overview-clients": { value: 63, previousValue: 58 },
  "overview-projects": { value: 24, previousValue: 21 },
  "overview-duration": { value: 42 },
  "revenue-chart": { data: [{ label: "Jan", monthly_revenue: 4000 }, { label: "Feb", monthly_revenue: 3000 }, { label: "Mar", monthly_revenue: 5000 }, { label: "Apr", monthly_revenue: 7000 }, { label: "May", monthly_revenue: 6000 }, { label: "Jun", monthly_revenue: 8000 }, { label: "Jul", monthly_revenue: 9000 }, { label: "Aug", monthly_revenue: 8500 }, { label: "Sep", monthly_revenue: 11000 }, { label: "Oct", monthly_revenue: 10000 }, { label: "Nov", monthly_revenue: 12000 }, { label: "Dec", monthly_revenue: 14000 }] },
  "clients-chart": { data: [{ label: "Jan", new_clients: 5, returning_clients: 10 }, { label: "Feb", new_clients: 8, returning_clients: 12 }, { label: "Mar", new_clients: 10, returning_clients: 15 }, { label: "Apr", new_clients: 7, returning_clients: 18 }, { label: "May", new_clients: 9, returning_clients: 20 }, { label: "Jun", new_clients: 12, returning_clients: 22 }, { label: "Jul", new_clients: 15, returning_clients: 25 }, { label: "Aug", new_clients: 13, returning_clients: 28 }, { label: "Sep", new_clients: 18, returning_clients: 30 }, { label: "Oct", new_clients: 20, returning_clients: 32 }, { label: "Nov", new_clients: 22, returning_clients: 35 }, { label: "Dec", new_clients: 25, returning_clients: 38 }] },
  "services-distribution": { data: [{ name: "Digital Transformation", value: 40 }, { name: "IT Consulting", value: 30 }, { name: "Software Development", value: 20 }, { name: "Cloud Migration", value: 10 }] },
  "project-status": { data: [{ name: "Planning", value: 15 }, { name: "In Progress", value: 30 }, { name: "Review", value: 10 }, { name: "Completed", value: 45 }] }
};

export default function Analytics() {
  const [analyticsData] = useState(sampleData);
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || 'en';
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    trackPageView('/dashboard/analytics');
    const checkUser = async () => {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) { console.error("Error checking session:", error); setLoading(false); return; }
      if (!session) { router.push(`/${locale}/login`); return; }
      setUser(session.user);
      const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', session.user.id).single();
      setIsAdmin(profile?.role === 'admin');
      setLoading(false);
    };
    checkUser();
  }, [router, locale]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ color: "#1d4ed8" }} className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", padding: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, background: "#111113", backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)", border: "1px solid #27272a", borderRadius: 12, padding: 40, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#fafafa", marginBottom: 12 }}>Access Denied</h1>
          <p style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 24 }}>You don&apos;t have permission to access the analytics dashboard.</p>
          <Link href={`/${locale}/dashboard`} style={{ background: "#1d4ed8", color: "#fff", textDecoration: "none", padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #27272a", background: "rgba(9,9,11,0.9)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Button variant="ghost" size="sm" style={{ color: "#a1a1aa" }} onClick={() => router.push(`/${locale}/dashboard`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Button>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa" }}>Analytics Dashboard</h1>
          </div>
          <span style={{ fontSize: 13, color: "#52525b" }}>{user?.email}</span>
        </div>
      </div>

      {/* Dashboard Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        <AnalyticsDashboard
          config={({
            ...dashboardConfig,
            id: "business-analytics-dashboard",
            description: "Key business metrics and performance indicators",
            timePeriod: {
              startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              endDate: new Date().toISOString()
            },
            ownerId: user?.id || "admin",
            shared: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } as DashboardConfig)}
          data={analyticsData}
          isLoading={loading}
          onTimePeriodChange={(period: ReportTimePeriod) => { console.log("Time period changed:", period); }}
          onRefresh={() => { console.log("Refreshing data..."); }}
          className="bg-transparent text-white rounded-lg"
        />
      </div>
    </div>
  );
}
