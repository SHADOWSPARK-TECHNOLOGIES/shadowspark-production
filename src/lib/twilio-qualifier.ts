export type QualifierTag = "Hot" | "Warm" | "Cold";

export interface QualifierState {
  step: number;
  answers: string[];
  messageSids: string[];
  lastInboundAt?: string;
  completedAt?: string;
  tag?: QualifierTag;
  operatorNotified?: boolean;
}

export const QUALIFIER_PROMPTS = [
  "What do you need help with?",
  "Which institution and country are you with?",
  "What volume do you handle, and what is the biggest pain point?",
  "What is your name and preferred time slot?",
] as const;

function isTag(value: unknown): value is QualifierTag {
  return value === "Hot" || value === "Warm" || value === "Cold";
}

export function readQualifierState(metadata: unknown): QualifierState {
  const raw = (metadata as { twilioQualifier?: unknown } | null)?.twilioQualifier;
  if (!raw || typeof raw !== "object") return { step: 0, answers: [], messageSids: [] };

  const state = raw as Partial<QualifierState>;
  return {
    step: typeof state.step === "number" && state.step >= 0 ? Math.min(state.step, 4) : 0,
    answers: Array.isArray(state.answers)
      ? state.answers.filter((answer): answer is string => typeof answer === "string")
      : [],
    messageSids: Array.isArray(state.messageSids)
      ? state.messageSids.filter((sid): sid is string => typeof sid === "string")
      : [],
    lastInboundAt: typeof state.lastInboundAt === "string" ? state.lastInboundAt : undefined,
    completedAt: typeof state.completedAt === "string" ? state.completedAt : undefined,
    tag: isTag(state.tag) ? state.tag : undefined,
    operatorNotified: state.operatorNotified === true,
  };
}

export function isWithinFreeformWindow(state: QualifierState, now = new Date()): boolean {
  if (!state.lastInboundAt) return true;
  const timestamp = Date.parse(state.lastInboundAt);
  return Number.isFinite(timestamp) && now.getTime() - timestamp < 24 * 60 * 60 * 1000;
}

export function classifyQualifierTag(answers: string[]): QualifierTag {
  const combined = answers.join(" ").toLowerCase();
  if (/(urgent|asap|immediately|today|this week|slow|lost|leak)/.test(combined)) return "Hot";
  if (/(\b[5-9]\d{2,}\b|\b\d{4,}\b|hundred|thousand|volume|many)/.test(combined)) return "Hot";
  if (answers.length >= 2 && combined.length >= 30) return "Warm";
  return "Cold";
}

export function advanceQualifier(
  current: QualifierState,
  input: string,
  now = new Date(),
): { state: QualifierState; reply: string; completed: boolean } {
  const answer = input.trim().slice(0, 500);
  const answers = [...current.answers, answer];
  const nextStep = Math.min(current.step + 1, QUALIFIER_PROMPTS.length);
  const completed = nextStep === QUALIFIER_PROMPTS.length;
  const state: QualifierState = {
    ...current,
    step: nextStep,
    answers,
    lastInboundAt: now.toISOString(),
    ...(completed ? { completedAt: now.toISOString(), tag: classifyQualifierTag(answers) } : {}),
  };

  return {
    state,
    completed,
    reply: completed
      ? `Thanks, ${answer.split(/[\s,]/, 1)[0] || "there"}. We have your details and a team member will follow up soon.`
      : QUALIFIER_PROMPTS[nextStep],
  };
}
