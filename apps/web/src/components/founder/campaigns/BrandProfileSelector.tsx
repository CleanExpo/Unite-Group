"use client";

import { useCallback, useEffect, useState } from "react";

export interface BrandProfileOption {
  id: string;
  organizationId: string;
  clientName: string;
  websiteUrl: string | null;
  industry: string | null;
  businessKey: string | null;
}

interface BrandProfileApiRow {
  id: string;
  organization_id: string;
  client_name: string;
  website_url: string | null;
  industry: string | null;
  business_key: string | null;
}

interface BrandProfilesResponse {
  profiles?: BrandProfileApiRow[];
  error?: string;
}

interface BrandProfileSelectorProps {
  onSelect: (profile: BrandProfileOption) => void;
  onScanNew: () => void;
}

type LoadState = "loading" | "ready" | "empty" | "error";

function mapProfile(row: BrandProfileApiRow): BrandProfileOption {
  return {
    id: row.id,
    organizationId: row.organization_id,
    clientName: row.client_name,
    websiteUrl: row.website_url,
    industry: row.industry,
    businessKey: row.business_key,
  };
}

export function BrandProfileSelector({
  onSelect,
  onScanNew,
}: BrandProfileSelectorProps) {
  const [profiles, setProfiles] = useState<BrandProfileOption[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadProfiles = useCallback(async () => {
    setLoadState("loading");
    setError(null);

    try {
      const response = await fetch("/api/campaigns");
      const body = (await response
        .json()
        .catch(() => ({}))) as BrandProfilesResponse;

      if (!response.ok) {
        throw new Error(
          body.error ?? `Failed to load child brands (${response.status})`,
        );
      }

      const readyProfiles = (body.profiles ?? []).map(mapProfile);
      setProfiles(readyProfiles);
      setLoadState(readyProfiles.length > 0 ? "ready" : "empty");
    } catch (err) {
      setProfiles([]);
      setError(
        err instanceof Error ? err.message : "Failed to load child brands",
      );
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    void loadProfiles();
  }, [loadProfiles]);

  return (
    <div className="bg-[#fff7ec] border border-white/[0.06] rounded-sm p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold text-white tracking-tight">
            Select Brand
          </h2>
          <p className="text-[12px] text-white/30">
            Choose the active child organisation this campaign should use. The
            selected organisation will be saved on the draft campaign.
          </p>
        </div>
        <button
          type="button"
          onClick={onScanNew}
          className="shrink-0 border border-white/10 text-white/60 hover:text-white/80 hover:border-white/20 rounded-sm px-3 py-1.5 text-[11px] transition-colors"
        >
          Scan new brand
        </button>
      </div>

      {loadState === "loading" && (
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-4 py-5">
          <p className="text-[12px] text-white/40">
            Loading eligible child brands…
          </p>
        </div>
      )}

      {loadState === "error" && (
        <div className="rounded-sm border border-red-500/20 bg-red-500/10 px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-[12px] text-red-400 flex-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadProfiles()}
            className="shrink-0 text-[11px] font-medium text-white/40 hover:text-white/70 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {loadState === "empty" && (
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] px-4 py-5 flex flex-col gap-3">
          <p className="text-[12px] text-white/45">
            No ready child brands found yet. Scan a brand website to create the
            first campaign-ready identity.
          </p>
          <button
            type="button"
            onClick={onScanNew}
            className="self-start bg-[#00F5FF] text-black text-[12px] font-semibold rounded-sm px-4 py-2 hover:bg-[#00F5FF]/90 transition-colors"
          >
            Scan Brand DNA
          </button>
        </div>
      )}

      {loadState === "ready" && (
        <div className="grid grid-cols-1 gap-3">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type="button"
              onClick={() => onSelect(profile)}
              className="text-left rounded-sm border border-white/[0.08] bg-white/[0.02] hover:border-[#00F5FF]/40 hover:bg-[#00F5FF]/[0.04] px-4 py-3 transition-colors"
            >
              <span className="block text-[13px] font-medium text-white/80">
                {profile.clientName}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/35">
                {profile.businessKey && <span>{profile.businessKey}</span>}
                {profile.industry && <span>{profile.industry}</span>}
                {profile.websiteUrl && (
                  <span className="truncate max-w-[280px]">
                    {profile.websiteUrl}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
