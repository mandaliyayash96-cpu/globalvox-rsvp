/**
 * Mock AI-calling provider.
 *
 * This is the ONLY file that contains randomness. Everything else in the app
 * treats `callingService` as an opaque provider, so swapping in a real vendor
 * (Twilio + an LLM voice agent, Vapi, Bland, etc.) means re-implementing
 * `CallingService.simulateCall` here and nothing else.
 *
 * Behaviour is deliberately imperfect to exercise retry + failure handling:
 *   -  8%  -> throws Error("call service timeout")   (provider failure, retryable)
 *   - 12%  -> { outcome: "no_answer" }               (not reached, retryable)
 *   - else -> RSVP weighted confirmed 60 / undecided 22 / declined 18
 */

export type RsvpOutcome = "confirmed" | "declined" | "undecided";
export type CallOutcome = RsvpOutcome | "no_answer";

export interface CallResult {
  outcome: CallOutcome;
  /** Short transcript-style summary. Absent for no_answer. */
  notes?: string;
  /** Simulated call duration in ms (useful for logging / future billing). */
  durationMs: number;
}

export interface CallableInvitee {
  id: string;
  name: string;
  phone: string;
}

export interface CallContext {
  eventName: string;
  eventDate: Date;
}

export interface CallingService {
  simulateCall(invitee: CallableInvitee, context: CallContext): Promise<CallResult>;
}

// ---- Tunables -----------------------------------------------------------------

const MIN_DELAY_MS = 200;
const MAX_DELAY_MS = 1500;
const TIMEOUT_RATE = 0.08;
const NO_ANSWER_RATE = 0.12;
const RSVP_WEIGHTS: Array<{ outcome: RsvpOutcome; weight: number }> = [
  { outcome: "confirmed", weight: 60 },
  { outcome: "undecided", weight: 22 },
  { outcome: "declined", weight: 18 },
];

// ---- Randomness helpers (the only place Math.random is used) ------------------

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedPick(): RsvpOutcome {
  const total = RSVP_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * total;
  for (const entry of RSVP_WEIGHTS) {
    roll -= entry.weight;
    if (roll < 0) return entry.outcome;
  }
  return RSVP_WEIGHTS[RSVP_WEIGHTS.length - 1].outcome;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ---- Transcript templates -----------------------------------------------------

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "the invitee";

type Template = (name: string, event: string, date: string) => string;

const TEMPLATES: Record<RsvpOutcome, Template[]> = {
  confirmed: [
    (n, e) => `${n} confirmed attendance for ${e}. Asked whether parking is available; said they'll arrive around 6:30 PM.`,
    (n, e) => `${n} said "count me in" for ${e}. Requested a vegetarian meal option.`,
    (n, e, d) => `${n} confirmed for ${e} on ${d}. Will bring one guest (spouse). No dietary restrictions.`,
    (n, e) => `${n} is attending ${e}. Asked for the calendar invite to be re-sent to their work email.`,
  ],
  declined: [
    (n, e) => `${n} declined - travelling for work that week. Asked to be invited to the next ${e}-style event.`,
    (n, e, d) => `${n} can't make ${e} on ${d}; has a prior family commitment. Sends regards to the organisers.`,
    (n) => `${n} politely declined and asked not to be called about this event again.`,
  ],
  undecided: [
    (n, e) => `${n} is interested in ${e} but needs to check their schedule. Asked for a follow-up next week.`,
    (n, e) => `${n} said "maybe" - waiting on a project deadline. Will confirm by email closer to the date.`,
    (n, e, d) => `${n} wasn't sure about ${d}. Requested the agenda before deciding on ${e}.`,
  ],
};

// ---- Implementation -----------------------------------------------------------

export const mockCallingService: CallingService = {
  async simulateCall(invitee, context) {
    const durationMs = Math.round(randomBetween(MIN_DELAY_MS, MAX_DELAY_MS));
    await sleep(durationMs);

    const roll = Math.random();
    if (roll < TIMEOUT_RATE) {
      throw new Error("call service timeout");
    }
    if (roll < TIMEOUT_RATE + NO_ANSWER_RATE) {
      return { outcome: "no_answer", durationMs };
    }

    const outcome = weightedPick();
    const dateLabel = context.eventDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const notes = pick(TEMPLATES[outcome])(firstName(invitee.name), context.eventName, dateLabel);
    return { outcome, notes, durationMs };
  },
};

/** The provider the worker uses. Swap this binding to go live. */
export const callingService: CallingService = mockCallingService;
