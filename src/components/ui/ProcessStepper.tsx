"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { ContextualFooter } from "@/components/ui/ContextualFooter";
import { GlassCard } from "@/components/ui/templates/GlassCard";

type ProcessStep = {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
};

type ProcessStepperProps = {
  steps: ProcessStep[];
  activeStep?: string;
  className?: string;
};

export function ProcessStepper({ steps, activeStep, className }: ProcessStepperProps) {
  return (
    <div className={className}>
      <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-cyan-500/0 via-cyan-500/40 to-cyan-500/0 md:block" />

      <div className="space-y-6">
        {steps.map((step, index) => {
          const isActive = step.step === activeStep || (!activeStep && index === 0);
          const nextStep = steps[index + 1];

          return (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="relative md:pl-20"
            >
              <div
                className={[
                  "absolute left-0 top-8 hidden h-12 w-12 items-center justify-center rounded-full border md:flex",
                  isActive
                    ? "border-cyan-400/50 bg-cyan-400/15 shadow-[0_0_24px_rgba(8,217,214,0.22)]"
                    : "border-cyan-500/30 bg-cyan-500/10",
                ].join(" ")}
              >
                <span className="text-sm font-mono font-bold text-cyan-300">{step.step}</span>
              </div>

              <GlassCard
                title={step.title}
                description={step.description}
                icon={<step.icon className="h-6 w-6" />}
                highlighted={isActive || index === steps.length - 1}
                className="overflow-visible"
              >
                <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
                  <p className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300/80">
                    Step {step.step}
                  </p>
                  {nextStep ? (
                    <ContextualFooter href={nextStep.href} label={nextStep.title} className="shrink-0" />
                  ) : (
                    <ContextualFooter
                      label="Launch Support Active"
                      prefix="STATUS"
                      className="shrink-0"
                    />
                  )}
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default ProcessStepper;
