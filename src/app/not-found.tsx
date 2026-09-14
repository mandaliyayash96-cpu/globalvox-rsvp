import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-6xl font-bold text-slate-200">404</p>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">Page not found</h2>
      <p className="mt-1 text-sm text-slate-500">The campaign or invitee you are looking for does not exist.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline">
        Back to campaigns
      </Link>
    </div>
  );
}
