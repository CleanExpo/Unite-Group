'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, DollarSign, Users, BarChart3, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'on-hold';
  progress: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  client: string;
  team: string[];
  tasks: {
    id: string;
    name: string;
    status: 'todo' | 'in-progress' | 'completed';
    assignee: string;
    dueDate: string;
  }[];
  timeline: {
    phase: string;
    startDate: string;
    endDate: string;
    status: 'completed' | 'current' | 'upcoming';
  }[];
}

const statusColors: Record<string, string> = {
  planning: '#1d4ed8',
  'in-progress': '#f59e0b',
  review: '#a1a1aa',
  completed: '#16a34a',
  'on-hold': '#dc2626'
};

const statusIcons = {
  planning: Clock,
  'in-progress': BarChart3,
  review: AlertCircle,
  completed: CheckCircle,
  'on-hold': XCircle
};

const cardStyle: React.CSSProperties = {
  background: "#111113",
  backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 50%)",
  border: "1px solid #27272a",
  borderRadius: 12,
  padding: 20,
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "2px solid #1d4ed8", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-inter, system-ui, sans-serif)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          <div style={{ marginBottom: 24 }}>
            <Button
              variant="outline"
              onClick={() => setSelectedProject(null)}
              style={{ marginBottom: 16, border: "1px solid #27272a", background: "transparent", color: "#a1a1aa" }}
            >
              ← Back to Projects
            </Button>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", marginBottom: 8 }}>{selectedProject.name}</h1>
            <p style={{ fontSize: 15, color: "#a1a1aa" }}>{selectedProject.description}</p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList style={{ background: "#111113", border: "1px solid #27272a" }}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="team">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Progress</span>
                    <BarChart3 size={14} style={{ color: "#1d4ed8" }} />
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#fafafa", fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>{selectedProject.progress}%</div>
                  <Progress value={selectedProject.progress} className="mt-2" />
                </div>
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Budget</span>
                    <DollarSign size={14} style={{ color: "#1d4ed8" }} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", fontFamily: "var(--font-mono, monospace)", marginBottom: 8 }}>
                    ${selectedProject.spent.toLocaleString()} / ${selectedProject.budget.toLocaleString()}
                  </div>
                  <Progress value={(selectedProject.spent / selectedProject.budget) * 100} className="mt-2" />
                </div>
                <div style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: "#a1a1aa" }}>Status</span>
                    {(() => { const StatusIcon = statusIcons[selectedProject.status]; return <StatusIcon size={14} style={{ color: "#1d4ed8" }} />; })()}
                  </div>
                  <span style={{ display: "inline-block", background: `${statusColors[selectedProject.status]}22`, color: statusColors[selectedProject.status], padding: "4px 10px", borderRadius: 4, fontSize: 13, fontWeight: 500 }}>
                    {selectedProject.status.charAt(0).toUpperCase() + selectedProject.status.slice(1)}
                  </span>
                </div>
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa", marginBottom: 16 }}>Project Details</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 12, color: "#52525b", marginBottom: 4 }}>Client</p>
                    <p style={{ color: "#fafafa", fontSize: 14 }}>{selectedProject.client}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: "#52525b", marginBottom: 4 }}>Duration</p>
                    <p style={{ color: "#fafafa", fontSize: 14 }}>
                      {new Date(selectedProject.startDate).toLocaleDateString()} — {new Date(selectedProject.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="space-y-3">
              {selectedProject.timeline.map((phase, index) => (
                <div key={index} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: phase.status === 'completed' ? '#16a34a' : phase.status === 'current' ? '#f59e0b' : '#27272a' }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 500, color: "#fafafa", fontSize: 14 }}>{phase.phase}</h3>
                      <p style={{ fontSize: 12, color: "#52525b" }}>
                        {new Date(phase.startDate).toLocaleDateString()} — {new Date(phase.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={phase.status === 'completed' ? 'default' : 'secondary'}>{phase.status}</Badge>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="tasks" className="space-y-3">
              {selectedProject.tasks.map((task) => (
                <div key={task.id} style={cardStyle}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <h3 style={{ fontWeight: 500, color: "#fafafa", fontSize: 14, marginBottom: 4 }}>{task.name}</h3>
                      <p style={{ fontSize: 12, color: "#52525b" }}>Assigned to: {task.assignee}</p>
                      <p style={{ fontSize: 12, color: "#52525b" }}>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                    </div>
                    <span style={{ display: "inline-block", background: task.status === 'completed' ? 'rgba(22,163,74,0.15)' : task.status === 'in-progress' ? 'rgba(245,158,11,0.15)' : '#27272a', color: task.status === 'completed' ? '#16a34a' : task.status === 'in-progress' ? '#f59e0b' : '#a1a1aa', padding: "4px 10px", borderRadius: 4, fontSize: 12 }}>
                      {task.status}
                    </span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="team">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {selectedProject.team.map((member, index) => (
                  <div key={index} style={{ ...cardStyle, textAlign: "center" }}>
                    <div style={{ width: 40, height: 40, background: "rgba(29,78,216,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                      <Users size={16} style={{ color: "#3b82f6" }} />
                    </div>
                    <h3 style={{ fontWeight: 500, color: "#fafafa", fontSize: 14 }}>{member}</h3>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#09090b", color: "#fafafa", fontFamily: "var(--font-display)" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "#fafafa", marginBottom: 8, fontFamily: "var(--font-display)" }}>Projects</h1>
          <p style={{ fontSize: 13, color: "#52525b" }}>Manage and track all your projects in one place</p>
        </div>

        {projects.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: 48 }}>
            <BarChart3 size={40} style={{ color: "#27272a", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fafafa", marginBottom: 8 }}>No Projects Found</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, marginBottom: 24 }}>
              You don&apos;t have any projects yet. Contact us to get started!
            </p>
            <button style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Get Started
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {projects.map((project) => {
              const StatusIcon = statusIcons[project.status];
              return (
                <div
                  key={project.id}
                  style={{ ...cardStyle, cursor: "pointer" }}
                  onClick={() => setSelectedProject(project)}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#fafafa" }}>{project.name}</h3>
                    <StatusIcon size={16} style={{ color: "#1d4ed8" }} />
                  </div>
                  <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 16, lineHeight: 1.5 }}>{project.description}</p>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "#52525b" }}>Progress</span>
                      <span style={{ color: "#fafafa", fontFamily: "var(--font-mono, monospace)" }}>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-1.5" />
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ display: "inline-block", background: `${statusColors[project.status]}22`, color: statusColors[project.status], padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </span>
                    <span style={{ fontSize: 12, color: "#52525b" }}>{project.client}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#52525b", borderTop: "1px solid #27272a", paddingTop: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <CalendarDays size={11} />{new Date(project.endDate).toLocaleDateString()}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "var(--font-mono, monospace)" }}>
                      <DollarSign size={11} />${project.budget.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
