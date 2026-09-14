import { getInviteeOr404 } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Existence check here (outside loading.tsx) so unknown invitees return a real 404. */
export default async function InviteeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string; inviteeId: string };
}) {
  await getInviteeOr404(params.id, params.inviteeId);
  return <>{children}</>;
}
