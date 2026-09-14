"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/apiClient";
import { INVITEE_STATUSES, type InviteeListResponse, type InviteeStatus } from "@/lib/types";
import { InviteeStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateTime, maskPhone } from "@/lib/format";
import { Pagination } from "./Pagination";

const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  campaignId: string;
  /** Bump to trigger a silent re-fetch (e.g. after each worker batch or an import). */
  version: number;
  live: boolean;
}

export function InviteeTable({ campaignId, version, live }: Props) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<InviteeStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<InviteeListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever the filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    const id = ++requestId.current;
    const silent = data !== null; // keep rows on screen during background refreshes
    if (!silent) setLoading(true);
    setError(null);

    const params = new URLSearchParams({ page: String(page) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (status) params.set("status", status);

    api
      .get<InviteeListResponse>(`/api/campaigns/${campaignId}/invitees?${params}`)
      .then((res) => {
        if (id !== requestId.current) return; // stale response
        setData(res);
        if (res.page > res.totalPages) setPage(res.totalPages);
      })
      .catch((err: Error) => {
        if (id !== requestId.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, page, debouncedSearch, status, version, retry]);

  const hasFilter = debouncedSearch !== "" || status !== "";

  return (
    <Card>
      <CardHeader
        title="Invitees"
        description={live ? "Updating live as calls complete." : "Click a name to see the full call record."}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email"
              className="h-9 w-56 rounded-lg border border-slate-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Search invitees"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InviteeStatus | "")}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {INVITEE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s[0].toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <CardBody className="space-y-4">
        {error ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm text-rose-800">Could not load invitees: {error}</p>
            <Button variant="secondary" size="sm" onClick={() => setRetry((r) => r + 1)}>
              Retry
            </Button>
          </div>
        ) : loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Spinner className="h-4 w-4" /> Loading invitees...
          </div>
        ) : !data || data.total === 0 ? (
          <EmptyState
            title={hasFilter ? "No invitees match" : "No invitees yet"}
            description={hasFilter ? "Try a different search or clear the status filter." : "Upload a CSV above to add invitees to this campaign."}
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Phone</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Attempts</th>
                    <th className="px-4 py-2.5">Last called</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.items.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/campaigns/${campaignId}/invitees/${inv.id}`}
                          className="font-medium text-indigo-700 hover:underline"
                        >
                          {inv.name}
                        </Link>
                        <p className="text-xs text-slate-500">{inv.email}</p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{maskPhone(inv.phone)}</td>
                      <td className="px-4 py-2.5">
                        <InviteeStatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{inv.attempts}</td>
                      <td className="px-4 py-2.5 text-slate-500">{formatDateTime(inv.lastCalledAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
          </>
        )}
      </CardBody>
    </Card>
  );
}
