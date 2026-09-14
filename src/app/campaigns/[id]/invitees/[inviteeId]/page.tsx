import Link from "next/link";
import type { Metadata } from "next";
import { getInviteeOr404 } from "@/lib/queries";
import { InviteeStatusBadge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/format";
import { MAX_ATTEMPTS } from "@/lib/campaignStats";

export const dynamic = "force-dynamic";

type Props = { params: { id: string; inviteeId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const invitee = await getInviteeOr404(params.id, params.inviteeId);
  return { title: `${invitee.name} - ${invitee.campaign.name}` };
}

export default async function InviteeDetailPage({ params }: Props) {
  const invitee = await getInviteeOr404(params.id, params.inviteeId);

  const retryable =
    invitee.status === "pending" || (invitee.status === "failed" && invitee.attempts < MAX_ATTEMPTS);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href={`/campaigns/${invitee.campaign.id}`} className="text-xs font-medium text-slate-500 hover:text-slate-800">
        &larr; Back to {invitee.campaign.name}
      </Link>

      <Card>
        <CardHeader
          title={invitee.name}
          description={`Invitee for ${invitee.campaign.eventName}`}
          action={<InviteeStatusBadge status={invitee.status} />}
        />
        <CardBody>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Phone" value={<span className="font-mono">{invitee.phone}</span>} />
            <Field label="Email" value={invitee.email} />
            <Field
              label="Campaign"
              value={
                <Link href={`/campaigns/${invitee.campaign.id}`} className="text-indigo-700 hover:underline">
                  {invitee.campaign.name}
                </Link>
              }
            />
            <Field label="Event date" value={formatDateTime(invitee.campaign.eventDate)} />
            <Field
              label="Attempts"
              value={
                <>
                  {invitee.attempts} / {MAX_ATTEMPTS}
                  {retryable && invitee.attempts > 0 && (
                    <span className="ml-2 text-xs text-slate-500">(will be retried)</span>
                  )}
                </>
              }
            />
            <Field label="Last called" value={formatDateTime(invitee.lastCalledAt)} />
            <Field label="Added" value={formatDateTime(invitee.createdAt)} />
            <Field label="Invitee ID" value={<span className="font-mono text-xs">{invitee.id}</span>} />
          </dl>

          {invitee.lastError && (
            <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Last error</p>
              <p className="mt-1 text-sm text-rose-900">{invitee.lastError}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Call notes / transcript" description="One line per attempt, newest at the bottom." />
        <CardBody>
          {invitee.notes ? (
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 font-sans text-sm leading-6 text-slate-800">
              {invitee.notes}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">No calls have been made to this invitee yet.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
