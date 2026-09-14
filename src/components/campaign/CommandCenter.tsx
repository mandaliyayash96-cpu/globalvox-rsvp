"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/apiClient";
import type { CampaignDTO, CampaignStats, CampaignStatus, ImportSummary, ProcessResult } from "@/lib/types";
import { useToast } from "@/components/ui/Toast";
import { CampaignHeader } from "./CampaignHeader";
import { CsvUpload } from "./CsvUpload";
import { RunControls } from "./RunControls";
import { StatsCards } from "./StatsCards";
import { InviteeTable } from "./InviteeTable";

const POLL_INTERVAL_MS = 1500;
const MAX_CONSECUTIVE_ERRORS = 5;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function CommandCenter({ campaign, initialStats }: { campaign: CampaignDTO; initialStats: CampaignStats }) {
  const toast = useToast();
  const [status, setStatus] = useState<CampaignStatus>(campaign.status);
  const [stats, setStats] = useState<CampaignStats>(initialStats);
  // `polling` = this browser tab is actively driving the worker. The campaign can be
  // `running` server-side while no tab polls (e.g. after a refresh) - we auto-resume.
  const [polling, setPolling] = useState(campaign.status === "running");
  const [batches, setBatches] = useState(0);
  const [lastBatch, setLastBatch] = useState<ProcessResult["outcomes"] | null>(null);
  const [tableVersion, setTableVersion] = useState(0);

  const refreshStats = useCallback(async () => {
    try {
      const res = await api.get<{ stats: CampaignStats; campaignStatus: CampaignStatus }>(
        `/api/campaigns/${campaign.id}/stats`,
      );
      setStats(res.stats);
      setStatus(res.campaignStatus);
      setTableVersion((v) => v + 1);
    } catch (err) {
      toast.error("Could not refresh stats", err instanceof Error ? err.message : undefined);
    }
  }, [campaign.id, toast]);

  // The polling loop. Sequential (await -> sleep -> repeat) so requests never overlap
  // even if one takes longer than the interval.
  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    let consecutiveErrors = 0;

    (async () => {
      while (!cancelled) {
        try {
          const res = await api.post<ProcessResult>(`/api/campaigns/${campaign.id}/process`);
          if (cancelled) return;
          consecutiveErrors = 0;
          setStats(res.stats);
          setStatus(res.campaignStatus);
          setTableVersion((v) => v + 1);
          if (res.processed > 0) {
            setBatches((b) => b + 1);
            setLastBatch(res.outcomes);
          }
          if (res.campaignStatus === "completed" || (res.remaining === 0 && res.inFlight === 0)) {
            setPolling(false);
            toast.success(
              "Campaign completed",
              `${res.stats.confirmed} confirmed, ${res.stats.declined} declined, ${res.stats.undecided} undecided.`,
            );
            return;
          }
        } catch (err) {
          if (cancelled) return;
          if (err instanceof ApiError && err.status === 409) {
            // Campaign is no longer running (finished elsewhere, or reset). Sync and stop.
            setPolling(false);
            await refreshStats();
            return;
          }
          consecutiveErrors += 1;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            setPolling(false);
            toast.error("Paused after repeated errors", err instanceof Error ? err.message : "Try resuming in a moment.");
            return;
          }
        }
        await sleep(POLL_INTERVAL_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [polling, campaign.id, refreshStats, toast]);

  async function handleStart() {
    try {
      const res = await api.post<{ stats: CampaignStats; campaign: CampaignDTO; alreadyRunning: boolean }>(
        `/api/campaigns/${campaign.id}/start`,
      );
      setStats(res.stats);
      setStatus(res.campaign.status);
      setPolling(true);
      toast.success(res.alreadyRunning ? "Resumed calling" : "Campaign started", "Dialing invitees in batches of 25.");
    } catch (err) {
      toast.error("Could not start campaign", err instanceof Error ? err.message : undefined);
      throw err;
    }
  }

  function handlePause() {
    setPolling(false);
    toast.info("Paused", "Calls in the current batch will finish. Click Resume to continue.");
  }

  function handleImported(summary: ImportSummary & { stats: CampaignStats }) {
    setStats(summary.stats);
    setTableVersion((v) => v + 1);
    if (summary.imported > 0) {
      toast.success(`Imported ${summary.imported} invitee${summary.imported === 1 ? "" : "s"}`, summary.skipped ? `${summary.skipped} row(s) skipped.` : undefined);
    } else {
      toast.error("Nothing imported", `${summary.skipped} row(s) were skipped. See details below.`);
    }
  }

  return (
    <div className="space-y-6">
      <CampaignHeader campaign={campaign} status={status} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CsvUpload campaignId={campaign.id} disabled={status === "running"} onImported={handleImported} />
        <RunControls
          status={status}
          stats={stats}
          polling={polling}
          batches={batches}
          lastBatch={lastBatch}
          onStart={handleStart}
          onPause={handlePause}
          onRefresh={refreshStats}
        />
      </div>

      <StatsCards stats={stats} />

      <InviteeTable campaignId={campaign.id} version={tableVersion} live={polling} />
    </div>
  );
}
