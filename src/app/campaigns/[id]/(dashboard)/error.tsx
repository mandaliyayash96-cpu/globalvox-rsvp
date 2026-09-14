"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function CampaignError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
      <h2 className="text-lg font-semibold text-rose-900">Could not load this campaign</h2>
      <p className="mt-2 text-sm text-rose-800">{error.message || "An unexpected error occurred."}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
        <Link href="/" className="inline-flex h-10 items-center px-4 text-sm font-medium text-rose-900 hover:underline">
          Back to campaigns
        </Link>
      </div>
    </div>
  );
}
