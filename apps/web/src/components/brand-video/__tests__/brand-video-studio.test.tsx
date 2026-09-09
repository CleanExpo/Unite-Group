import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrandVideoStudio } from '../brand-video-studio';
const { limit } = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ supabaseBrowser: { from: () => ({ select: () => ({ order: () => ({ limit }) }) }) } }));
const job = { id: 'job-1', brand: 'Existing brand', style: 'corporate', topic: 'Saved topic', count: 1, status: 'queued', output_url: null, created_at: '2026-09-09T10:00:00Z' };
describe('brand video history read failures', () => {
  beforeEach(() => { limit.mockReset(); vi.stubGlobal('fetch', vi.fn()); });
  it('shows safe failure instead of false empty and retries only the read', async () => {
    limit.mockResolvedValueOnce({ data: null, error: { message: 'private database detail' } }).mockResolvedValueOnce({ data: [], error: null });
    render(<BrandVideoStudio />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Recent jobs could not be loaded');
    expect(screen.queryByText('No jobs yet.')).not.toBeInTheDocument();
    expect(screen.queryByText('private database detail')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry history' }));
    expect(await screen.findByText('No jobs yet.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('retains previously loaded jobs on a rejected refresh', async () => {
    limit.mockResolvedValueOnce({ data: [job], error: null }).mockRejectedValueOnce(new Error('private transport detail'));
    render(<BrandVideoStudio />);
    expect(await screen.findByText('Saved topic')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh history' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Previously loaded jobs may be out of date');
    expect(screen.getByText('Saved topic')).toBeVisible();
    expect(screen.queryByText('No jobs yet.')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps a confirmed generation separate from history failure and does not resubmit on retry', async () => {
    limit.mockResolvedValueOnce({ data: [], error: null }).mockRejectedValueOnce(new Error('read failed')).mockResolvedValueOnce({ data: [job], error: null });
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ jobId: 'confirmed-job' }) } as Response);
    render(<BrandVideoStudio />);
    await screen.findByText('No jobs yet.');
    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Existing brand' } });
    fireEvent.change(screen.getByLabelText('Topic'), { target: { value: 'New topic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Recent jobs could not be loaded');
    expect(screen.getByText(/Job queued/)).toBeVisible();
    expect(screen.queryByText('Network error — please try again.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry history' }));
    expect(await screen.findByText('Saved topic')).toBeVisible();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('disables history retry while its read is pending', async () => {
    let finish!: (value: { data: never[]; error: null }) => void;
    limit.mockResolvedValueOnce({ data: null, error: { message: 'failed' } }).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<BrandVideoStudio />);
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Retry history' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Checking history…' })).toBeDisabled());
    finish({ data: [], error: null });
    expect(await screen.findByText('No jobs yet.')).toBeVisible();
  });
});
