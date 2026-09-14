import { getCampaignOr404 } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Existence check here (outside loading.tsx) so unknown campaigns return a real 404. */
export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  await getCampaignOr404(params.id);
  return <>{children}</>;
}
