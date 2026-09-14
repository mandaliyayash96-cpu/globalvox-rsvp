"use client";

import { useState } from "react";
import type { CampaignStats, CampaignStatus, ProcessResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Spinner } from "@/components/ui/Spinner";
import { formatNumber, percent } from "@/lib/format";

interface Props {
  status: CampaignStatus;
  stats: CampaignStats;
  polling: boolean;
  batches: number;
  lastBatch: ProcessResult["outcomes"] | null;
  onStart: () => Promise<void>;
  onPause: () => void;
  onRefresh: () => Promise<void>;
}

export function RunControls({ status, stats, polling, batches, lastBatch, onStart, onPause, onRefresh }: Props) {
  const [starting, setStarting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const progress = percent(stats.processed, stats.total);
  const hasInvitees = stats.total > 0;
  const canStart = hasInvitees && stats.actionable > 0 && !polling;
  const finished = hasInvitees && stats.actionable === 0 && stats.inFlight === 0;

  async function start() {
    setStarting(true);
    try {
      await onStart();
    } catch {
      /* toast already shown by parent */
    } finally {
      setStarting(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  let primary: React.ReactNode;
  if (polling) {
    primary = (
      <Button size="lg" variant="secondary" onClick={onPause} className="w-full">
        <Spinner className="h-4 w-4" /> Calling&hellip; pause
      </Button>
    );
  } else if (status === "running" && stats.actionable > 0) {
    primary = (
      <Button size="lg" onClick={start} loading={starting} className="w-full">
        Resume calling
      </Button>
    );
  } else if (finished) {
    primary = (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-800">
        All invitees processed. Import more to run again.
      </div>
    );
  } else {
    primary = (
      <Button size="lg" onClick={start} loading={starting} disabled={!canStart} className="w-full">
        {status === "completed" ? "Start new run" : "Start Campaign"}
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Run campaign"
        description="The AI caller dials invitees in batches of 25 and records each RSVP."
        action={
          <Button variant="ghost" size="sm" onClick={refresh} loading={refreshing}>
            Refresh
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {primary}
        {!hasInvitees && (
          <p className="text-center text-xs text-slate-500">Import invitees first - the button unlocks once there is someone to call.</p>
        )}

        <ProgressBar
          value={progress}
          animated={polling}
          label={`${formatNumber(stats.processed)} of ${formatNumber(stats.total)} processed`}
        />

        <dl className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">Contacted</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{formatNumber(stats.contacted)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">Still to call</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{formatNumber(stats.actionable)}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <dt className="text-xs text-slate-500">Batches this session</dt>
            <dd className="font-semibold tabular-nums text-slate-900">{batches}</dd>
          </div>
        </dl>

        {lastBatch && (
          <p className="text-xs text-slate-500">
            Last batch: {lastBatch.confirmed} confirmed &middot; {lastBatch.declined} declined &middot; {lastBatch.undecided}{" "}
            undecided &middot; {lastBatch.no_answer} no answer &middot; {lastBatch.failed} failed
          </p>
        )}
      </CardBody>
    </Card>
  );
}
