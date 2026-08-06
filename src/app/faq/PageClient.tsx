"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { GlassCard } from "@/components/ui/templates/GlassCard";
import { SovereignHero } from "@/components/ui/templates/SovereignHero";
import { faqJsonLd } from "@/lib/seo";

const faqItems = [
  {
    question: "How is pricing structured?",
    answer:
      "ShadowSpark pricing is based on the system tier you need, the channels involved, and the operational complexity of your deployment. Standard systems start with managed monthly plans, while enterprise deployments are scoped around workflow depth and lead volume.",
  },
  {
    question: "What happens after I start?",
    answer:
      "Every deployment follows a structured path: qualification, tailored audit, demo deployment, approval and refinement, then managed launch. The process page outlines the sequence in detail, but the key point is that we do not drop you into a generic template.",
  },
  {
    question: "Does ShadowSpark integrate with WhatsApp?",
    answer:
      "Yes. WhatsApp is a core part of the system. We build AI-assisted conversation flows for inquiry capture, qualification, follow-up, and human handoff so your team can respond instantly without living inside chat all day.",
  },
  {
    question: "How much support is included after launch?",
    answer:
      "Managed support is part of the system, not an afterthought. We monitor the deployment, handle refinements, support operators, and keep the revenue infrastructure stable as lead volume and workflows evolve.",
  },
  {
    question: "Can you build custom enterprise deployments?",
    answer:
      "Yes. Enterprise deployments are designed for high-volume operations, multi-channel routing, specialized approval flows, and custom integration requirements. Those systems are scoped through a direct consultation rather than a fixed template.",
  },
  {
    question: "Do you replace our sales or support team?",
    answer:
      "No. ShadowSpark automates repetitive first-response, qualification, and routing work so your team can spend its time on judgment-heavy conversations, approvals, and closing. The system is built to protect operator time, not remove it.",
  },
  {
    question: "How quickly can a system go live?",
    answer:
      "Launch timing depends on scope. Smaller systems can move quickly once the audit is complete, while enterprise builds take longer because of workflow design, refinement, and approval requirements. We prioritize a controlled launch over a rushed one.",
  },
  {
    question: "Can ShadowSpark connect to our existing tools?",
    answer:
      "Yes, where the deployment requires it. Booking systems, payment flows, lead routing, operator notifications, and internal approval steps can all be integrated into the system design when they materially improve conversion and visibility.",
  },
];

export default function FAQClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqLd = faqJsonLd(faqItems);

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-400 selection:bg-cyan-500/30">
      {/* FAQ JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqLd }}
      />
      <SovereignHero
        headline={
          <>
            Frequently Asked <span className="text-cyan-500">Questions</span>
          </>
        }
        subheadline="Answers to the most common questions about pricing, process, support, and deployment architecture."
        ctaText="Start Qualification Audit"
        ctaLink="/checkout/new"
        secondaryCtaText="Contact Enterprise"
        secondaryCtaLink="/enterprise"
      />

      <section className="border-t border-zinc-900 bg-zinc-950/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-400/80">
              Knowledge Base
            </p>
            <h2 className="mt-4 text-3xl font-bold text-white md:text-5xl">
              Practical answers before you deploy.
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-zinc-300">
              If you need a tailored answer for your lead volume, workflow, or internal operations,
              use the enterprise contact route and we will scope it directly.
            </p>
          </div>

          <div className="mt-16 space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;

              return (
                <motion.div
                  key={item.question}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="block w-full text-left"
                  >
                    <GlassCard
                      title={item.question}
                      icon={<HelpCircle className="h-6 w-6" />}
                      highlighted={isOpen}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                        <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300/80">
                          {isOpen ? "Open" : "Expand"}
                        </p>
                        <ChevronDown
                          className={`h-4 w-4 text-cyan-400 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-5 text-sm leading-7 text-zinc-300">
                              {item.answer}
                            </p>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </GlassCard>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
