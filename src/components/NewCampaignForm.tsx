"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/apiClient";
import type { CampaignDTO } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface FormState {
  name: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  objective: string;
}

const EMPTY: FormState = { name: "", eventName: "", eventDate: "", eventLocation: "", objective: "" };

const inputClass =
  "block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

export function NewCampaignForm() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      // datetime-local has no timezone; convert in the browser so the server stores the right instant.
      const eventDate = form.eventDate ? new Date(form.eventDate).toISOString() : "";
      const created = await api.post<CampaignDTO>("/api/campaigns", { ...form, eventDate });
      toast.success("Campaign created", "Next: import your invitee list.");
      router.push(`/campaigns/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === "object") {
        setErrors(err.details as Record<string, string>);
      }
      toast.error("Could not create campaign", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  const field = (key: keyof FormState, label: string, input: React.ReactNode) => (
    <div>
      <label htmlFor={key} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {input}
      {errors[key] && <p className="mt-1 text-xs text-rose-600">{errors[key]}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader title="New campaign" description="Set up the event you are collecting RSVPs for." />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {field("name", "Campaign name", (
            <input id="name" className={inputClass} value={form.name} onChange={set("name")} placeholder="Q4 launch RSVP drive" required />
          ))}
          {field("eventName", "Event name", (
            <input id="eventName" className={inputClass} value={form.eventName} onChange={set("eventName")} placeholder="Nova 2.0 Launch Evening" required />
          ))}
          {field("eventDate", "Event date & time", (
            <input id="eventDate" type="datetime-local" className={inputClass} value={form.eventDate} onChange={set("eventDate")} required />
          ))}
          {field("eventLocation", "Location", (
            <input id="eventLocation" className={inputClass} value={form.eventLocation} onChange={set("eventLocation")} placeholder="The Leela, Mumbai" required />
          ))}
          {field("objective", "Call objective", (
            <textarea
              id="objective"
              className={inputClass}
              rows={4}
              value={form.objective}
              onChange={set("objective")}
              placeholder="Confirm attendance, capture dietary needs, be warm and concise."
              required
            />
          ))}
          <Button type="submit" loading={submitting} className="w-full">
            Create campaign
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
