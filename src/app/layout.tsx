import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "RSVP Campaign Manager",
  description: "Run AI-calling campaigns to collect event RSVPs and track results live.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
              <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm text-white">
                  R
                </span>
                RSVP Campaign Manager
              </Link>
              <nav className="flex items-center gap-4 text-sm text-slate-600">
                <Link href="/" className="hover:text-slate-900">
                  Campaigns
                </Link>
                <a href="/sample-invitees.csv" download className="hover:text-slate-900">
                  Sample CSV
                </a>
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
