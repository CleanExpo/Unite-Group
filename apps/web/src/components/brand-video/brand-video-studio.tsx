'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import {
  BRAND_VIDEO_STYLES,
  DEFAULT_BRAND_VIDEO_STYLE,
} from '@/lib/brand-video/styles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface BrandVideoJob {
  id: string;
  brand: string;
  style: string;
  topic: string;
  count: number;
  status: string;
  output_url: string | null;
  created_at: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  queued: 'info',
  processing: 'warning',
  done: 'success',
  failed: 'danger',
  needs_local_render: 'outline',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BrandVideoStudio() {
  const [brand, setBrand] = useState('');
  const [style, setStyle] = useState(DEFAULT_BRAND_VIDEO_STYLE);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [jobs, setJobs] = useState<BrandVideoJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const loadJobs = useCallback(async () => {
    // RLS scopes this to the signed-in owner's rows.
    const { data } = await supabaseBrowser
      .from('brand_video_jobs')
      .select('id, brand, style, topic, count, status, output_url, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setJobs((data as BrandVideoJob[] | null) ?? []);
    setLoadingJobs(false);
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  async function handleGenerate() {
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/brand-video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, style, topic, count: Number(count) || 1 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ kind: 'err', text: json.error ?? 'Failed to queue job' });
        return;
      }
      setMessage({ kind: 'ok', text: `Job queued (${String(json.jobId).slice(0, 8)}…).` });
      setTopic('');
      await loadJobs();
    } catch {
      setMessage({ kind: 'err', text: 'Network error — please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = brand.trim().length > 0 && topic.trim().length > 0 && !submitting;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Brand Video Studio</h1>
        <p className="text-sm text-muted-foreground">
          Queue a styled, on-brand faceless video. Pick a look, name the brand,
          describe the topic, and Generate.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New video</CardTitle>
          <CardDescription>The job is queued for the brand-video worker.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bv-style">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger id="bv-style">
                <SelectValue placeholder="Choose a style" />
              </SelectTrigger>
              <SelectContent>
                {BRAND_VIDEO_STYLES.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bv-brand">Brand</Label>
            <Input
              id="bv-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. RestoreAssist"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bv-topic">Topic</Label>
            <Textarea
              id="bv-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What should this video be about?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bv-count">Count</Label>
            <Input
              id="bv-count"
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-24"
            />
          </div>

          {message && (
            <p className={message.kind === 'ok' ? 'text-sm text-green-600' : 'text-sm text-red-600'}>
              {message.text}
            </p>
          )}

          <Button onClick={handleGenerate} disabled={!canSubmit}>
            {submitting ? 'Queuing…' : 'Generate'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs</CardTitle>
          <CardDescription>Your most recent generation requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {jobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {job.brand} · {job.style}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{job.topic}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(job.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {job.output_url && (
                      <a
                        href={job.output_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline"
                      >
                        Open
                      </a>
                    )}
                    <Badge variant={STATUS_VARIANT[job.status] ?? 'default'}>{job.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
