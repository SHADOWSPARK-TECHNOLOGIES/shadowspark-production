import type { ReactNode } from "react";
import Link from "next/link";
import AssistantBubble from "@/components/ui/AssistantBubble";
import { BrowserWindow } from "@/components/ui/BrowserWindow";
import { ContextualFooter } from "@/components/ui/ContextualFooter";
import { Spotlight } from "@/components/ui/Spotlight";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { Vortex } from "@/components/ui/vortex-background";
import {
  deriveVaultSignalBrief,
  fetchLatestAuditMarkdown,
  fetchVaultInsights,
  type VaultLayoutMode,
} from "@/lib/gcs/fetch-audit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DemoPageProps = {
  params: Promise<{ slug: string }>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function pickFirstString(
  source: Record<string, unknown> | null,
  keys: string[],
  fallback: string
) {
  if (!source) return fallback;

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function normalizeTier(tier: string): "launch" | "growth" | "automation" {
  const normalized = tier.toLowerCase();
  if (normalized.includes("auto")) return "automation";
  if (normalized.includes("growth")) return "growth";
  return "launch";
}

function displayTier(tier: "launch" | "growth" | "automation") {
  if (tier === "automation") return "Autonomous";
  if (tier === "growth") return "Growth";
  return "Launch";
}

function tierBadgeTone(tier: "launch" | "growth" | "automation") {
  if (tier === "automation") return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  if (tier === "growth") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
}

function prettifySlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getRecommendation(
  config: Record<string, unknown> | null,
  audit: Record<string, unknown> | null
) {
  return normalizeTier(
    pickFirstString(
      config ?? audit,
      ["packageRecommendation", "recommendedPackage", "tier", "plan"],
      "automation"
    )
  );
}

function MarkdownShell({ markdown }: { markdown: string }) {
  return (
    <BrowserWindow
      title="Intelligence Stream"
      eyebrow="Vault markdown"
      contentClassName="px-6 py-8 sm:px-8 sm:py-10"
      markdown={markdown}
    />
  );
}

function scoreBadgeTone(score: number) {
  if (score >= 14) return "border-cyan-300/25 bg-cyan-300/12 text-cyan-100";
  if (score >= 10) return "border-amber-300/20 bg-amber-300/10 text-amber-100";
  return "border-white/10 bg-white/4 text-slate-200";
}

function shrinkExcerpt(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 190 ? `${normalized.slice(0, 187)}...` : normalized;
}

type IntelligenceNote = {
  title: string;
  body: string;
  kind: "proof" | "objection" | "cta";
};

function toSentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deriveIntelligenceNotes(
  insights: Awaited<ReturnType<typeof fetchVaultInsights>>,
  businessName: string
): IntelligenceNote[] {
  const keywordMap = {
    proof: ["results", "clients", "case study", "trusted", "revenue", "faster", "growth"],
    objection: ["slow", "manual", "delay", "drop", "friction", "leak", "bottleneck"],
    cta: ["book", "contact", "demo", "call", "whatsapp", "quote"],
  } as const;

  const pickInsight = (kind: IntelligenceNote["kind"]) =>
    insights.find((insight) =>
      keywordMap[kind].some((keyword) => insight.excerpt.toLowerCase().includes(keyword))
    ) ?? insights[0];

  return (["proof", "objection", "cta"] as const)
    .map((kind) => {
      const source = pickInsight(kind);
      if (!source) return null;

      if (kind === "proof") {
        return {
          kind,
          title: "Proof anchor",
          body: `Use "${shrinkExcerpt(source.excerpt)}" as the credibility line when framing the ${businessName} audit.`,
        };
      }

      if (kind === "objection") {
        return {
          kind,
          title: "Likely objection",
          body: `The strongest hesitation signal is operational drag: ${shrinkExcerpt(source.excerpt).toLowerCase()}`,
        };
      }

      return {
        kind,
        title: "CTA support line",
        body: `Guide the close with a direct next step tied to this signal: "${shrinkExcerpt(source.excerpt)}"`,
      };
    })
    .filter((note): note is IntelligenceNote => note !== null);
}

function signalLabel(title: string, excerpt: string) {
  const text = `${title} ${excerpt}`.toLowerCase();
  if (text.includes("cta") || text.includes("book") || text.includes("contact")) return "CTA";
  if (text.includes("proof") || text.includes("result") || text.includes("client")) return "Proof";
  if (text.includes("leak") || text.includes("problem") || text.includes("slow")) return "Leak";
  return "Signal";
}

function layoutTone(layout: VaultLayoutMode) {
  if (layout === "proof-heavy") {
    return {
      badge: "Proof-heavy layout",
      summary: "Lead with evidence and outcomes before discussing the system build.",
    };
  }

  if (layout === "objection-handling") {
    return {
      badge: "Objection-handling layout",
      summary: "Surface friction and cost of delay first, then convert into a build recommendation.",
    };
  }

  if (layout === "cta-comparison") {
    return {
      badge: "CTA-comparison layout",
      summary: "Frame the decision around the cleanest next step and reduce ambiguity around action.",
    };
  }

  return {
    badge: "Audit-summary layout",
    summary: "Use a balanced narrative: diagnosis, ranked signals, then a direct booking step.",
  };
}

function confidenceTone(confidence: "high" | "medium" | "low") {
  if (confidence === "high") {
    return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100";
  }

  if (confidence === "medium") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  return "border-white/10 bg-white/4 text-slate-200";
}

export default async function DemoPreviewPage({ params }: DemoPageProps) {
  const { slug } = await params;

  const demo = await prisma.demo.findUnique({
    where: { slug },
    include: { lead: true },
  });

  const miniAuditData = asRecord(demo?.lead.miniAuditData);
  const config = asRecord(demo?.config);
  const recommendedTier = getRecommendation(config, miniAuditData);
  const businessName = pickFirstString(
    miniAuditData,
    ["companyName", "businessName", "name", "businessType"],
    prettifySlug(slug) || "ShadowSpark Prospect"
  );
  const niche = pickFirstString(
    miniAuditData,
    ["niche", "businessType", "goals"],
    "Revenue intelligence and conversion infrastructure"
  );
  const createdAt = demo?.createdAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(demo.createdAt)
    : "Awaiting first live session";
  const [auditMarkdown, indexedInsights] = await Promise.all([
    fetchLatestAuditMarkdown(slug),
    fetchVaultInsights({
      slug,
      businessName,
      niche,
      k: 4,
    }),
  ]);
  const signalBrief = deriveVaultSignalBrief(
    indexedInsights,
    businessName,
    displayTier(recommendedTier)
  );
  const intelligenceNotes = deriveIntelligenceNotes(indexedInsights, businessName);
  const layoutBrief = layoutTone(signalBrief.layout);
  const heroSupportLine =
    signalBrief.heroSupportLine ??
    `The current intelligence stream suggests ${businessName} is leaking momentum between first interest and the booked conversation.`;
  const ctaSupportLine =
    signalBrief.ctaLine ??
    intelligenceNotes.find((note) => note.kind === "cta")?.body ??
    `Book the ${displayTier(recommendedTier)} walkthrough and review the highest-friction revenue gaps for ${businessName}.`;
  const proofLine =
    signalBrief.proofLine ??
    intelligenceNotes.find((note) => note.kind === "proof")?.body ??
    "Fresh crawl and vault signals are ranked here so recommendations stay tied to current site evidence.";
  const objectionLine =
    signalBrief.objectionLine ??
    intelligenceNotes.find((note) => note.kind === "objection")?.body ??
    "The default friction pattern is slow follow-up, unclear CTA pathways, and operator lag.";

  return (
    <Vortex className="min-h-screen selection:bg-emerald-500/30">
      <main className="relative mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <Spotlight
            className="-top-36 left-0 md:left-60 md:-top-20"
            fill="rgba(34,211,238,0.16)"
          />

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 px-6 py-8 shadow-[0_0_80px_rgba(14,165,233,0.08)] backdrop-blur-xl sm:px-8 sm:py-10">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.26em] text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.9)]" />
                Live GCS Intelligence Feed
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-6xl">
                {businessName}
                <span className="mt-3 block text-balance text-cyan-200/85">
                  Decision-grade audit rendered from the latest cloud intelligence snapshot.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                This page turns the latest markdown audit and ranked vault signals into a guided
                sales surface for <span className="text-white">{slug}</span>, so the client sees
                what is broken, why it matters, and which action to take next.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />
                {layoutBrief.badge}
              </div>
              <div
                className={[
                  "mt-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em]",
                  confidenceTone(signalBrief.confidence),
                ].join(" ")}
              >
                Confidence {signalBrief.confidence}
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">{heroSupportLine}</p>
              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/4 px-5 py-4 text-sm leading-7 text-slate-300">
                <span className="font-semibold text-white">Proof line:</span> {proofLine}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { label: "Recommended Tier", value: displayTier(recommendedTier) },
                { label: "Active Niche", value: niche },
                { label: "Latest Session", value: createdAt },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.5rem] border border-white/10 bg-white/3 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
                    {item.label}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-lg font-semibold leading-7 text-white">{item.value}</p>
                    {item.label === "Recommended Tier" ? (
                      <span
                        className={[
                          "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]",
                          tierBadgeTone(recommendedTier),
                        ].join(" ")}
                      >
                        {displayTier(recommendedTier)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
              <div className="rounded-[1.5rem] border border-cyan-300/15 bg-cyan-300/6 p-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/80">
                  Next Move
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{ctaSupportLine}</p>
                <div className="mt-5 flex flex-col gap-3">
                  <Link
                    href={`/checkout/new?tier=${encodeURIComponent(recommendedTier)}`}
                    className="inline-flex items-center justify-center rounded-[1.2rem] bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-200"
                  >
                    Book Demo
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-[1.2rem] border border-white/10 bg-white/3 px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/5"
                  >
                    Chat on WhatsApp
                  </Link>
                  <ContextualFooter href="/process" label="Deployment Path" className="justify-center" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/75">
                  Audit Stream
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                  Infrastructure audit, leakage analysis, and AI proposals.
                </h2>
              </div>
              <div className="hidden rounded-full border border-white/10 bg-white/3 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300 sm:block">
                Source: vault markdown
              </div>
            </div>

            <TracingBeam className="xl:pr-10">
              <MarkdownShell markdown={auditMarkdown} />
            </TracingBeam>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_0_50px_rgba(15,23,42,0.4)]">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
                Intelligence Summary
              </p>
              <h2 className="mt-4 text-2xl font-black tracking-tight text-white">
                What this audit should push the buyer to decide.
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Keep the business relevance explicit: the left column proves the diagnosis, and
                this right rail turns those signals into proof, objections, and close-ready next steps.
              </p>
              <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white/3 px-4 py-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-200/75">
                  Recommended framing
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{layoutBrief.summary}</p>
                {signalBrief.confidence === "low" ? (
                  <p className="mt-3 text-sm leading-7 text-slate-400">
                    Low-confidence crawls stay in summary mode and avoid aggressive proof or CTA claims until a denser audit lands.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] border border-cyan-300/10 bg-slate-950/80 p-6 shadow-[0_0_40px_rgba(8,145,178,0.12)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
                    Indexed Signals
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                    Ranked evidence from the vault.
                  </h2>
                </div>
                <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                  {indexedInsights.length > 0 ? `${indexedInsights.length} hits` : "awaiting index"}
                </div>
              </div>

              {indexedInsights.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {indexedInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="rounded-[1.4rem] border border-white/10 bg-white/3 p-5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-white/10 bg-white/3 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                            {signalLabel(insight.title, insight.excerpt)}
                          </span>
                          <p className="text-sm font-semibold text-white">{insight.title}</p>
                        </div>
                        <span
                          className={[
                            "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em]",
                            scoreBadgeTone(insight.score),
                          ].join(" ")}
                        >
                          score {insight.score}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{insight.excerpt}</p>
                      {insight.url ? (
                        <a
                          href={insight.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex text-xs font-medium uppercase tracking-[0.16em] text-cyan-300"
                        >
                          Source URL
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-slate-300">
                  The demo page is ready to read `indexes/${slug}/latest.json` from the vault as soon as the
                  crawl pipeline publishes one. Until then, the markdown stream remains the source of truth.
                </p>
              )}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
                Recommendation Blocks
              </p>
              <div className="mt-5 space-y-4">
                {intelligenceNotes.length > 0 ? (
                  intelligenceNotes.map((note) => (
                    <div key={note.title} className="rounded-[1.4rem] border border-white/10 bg-white/3 p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/4 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-300">
                          {toSentenceCase(note.kind)}
                        </span>
                        <p className="text-sm font-semibold text-white">{note.title}</p>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-300">{note.body}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-7 text-slate-300">
                    As soon as indexed signals are available, this rail will turn them into close-ready
                    proof, objection handling, and CTA guidance.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-cyan-300/10 bg-cyan-300/5 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
                What We Would Build Next
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/3 p-4">
                  <p className="text-sm font-semibold text-white">Why this matters</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{objectionLine}</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/3 p-4">
                  <p className="text-sm font-semibold text-white">What gets deployed</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    We would package the {displayTier(recommendedTier).toLowerCase()} layer set around
                    qualification speed, cleaner CTA routing, and a tighter operator handoff for {businessName}.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/3 p-4">
                  <p className="text-sm font-semibold text-white">Next commercial step</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{ctaSupportLine}</p>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href={`/checkout/new?tier=${encodeURIComponent(recommendedTier)}`}
                  className="inline-flex items-center justify-center rounded-[1.2rem] bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-200"
                >
                  Book Demo
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-[1.2rem] border border-white/10 bg-white/3 px-5 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white/5"
                >
                  Chat on WhatsApp
                </Link>
                <ContextualFooter href="/solutions" label="System Layers" className="justify-center" />
              </div>
            </div>

            <div className="rounded-[2rem] border border-cyan-300/10 bg-cyan-300/5 p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-200/80">
                GCS Bridge
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                <li className="list-inside list-disc marker:text-cyan-300">
                  Reads canonical audit markdown from <code>audits/{slug}/latest.md</code>.
                </li>
                <li className="list-inside list-disc marker:text-cyan-300">
                  Reads indexed signals from <code>indexes/{slug}/latest.json</code> with a global fallback.
                </li>
                <li className="list-inside list-disc marker:text-cyan-300">
                  Keeps the assistant bubble available for live follow-up questions while reviewing.
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </main>

      <AssistantBubble slug={slug} />
    </Vortex>
  );
}
