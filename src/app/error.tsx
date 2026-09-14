"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
      <h2 className="text-lg font-semibold text-rose-900">Something went wrong</h2>
      <p className="mt-2 text-sm text-rose-800">
        {error.message || "An unexpected error occurred."} If this persists, check that the database is reachable.
      </p>
      <Button className="mt-4" variant="secondary" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
