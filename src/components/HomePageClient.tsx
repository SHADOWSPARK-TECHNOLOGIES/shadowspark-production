'use client';
import { usePageView } from "@/hooks/useAnalytics";
import Hero from "@/components/marketing/Hero";
import CTABlock from "@/components/marketing/CTABlock";
import WhatWeDoSlideshow from "@/components/marketing/WhatWeDoSlideshow";
import RevenueLeakDiagnostic from "@/components/RevenueLeakDiagnostic";
import { EcosystemStrip } from "@/components/ui/EcosystemStrip";

export default function HomePageClient() {
  usePageView("Homepage");

  return (
    <div className="w-full flex flex-col items-center bg-black selection:bg-cyan-500/30">
      <Hero />
      <WhatWeDoSlideshow />
      <RevenueLeakDiagnostic />
      <EcosystemStrip />
      <CTABlock />
    </div>
  );
}
