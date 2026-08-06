'use client';
import { usePageView } from "@/hooks/useAnalytics";
import Hero from "@/components/marketing/Hero";
import CTABlock from "@/components/marketing/CTABlock";
import WhatWeDoSlideshow from "@/components/marketing/WhatWeDoSlideshow";
import RevenueLeakDiagnostic from "@/components/RevenueLeakDiagnostic";
import { EcosystemStrip } from "@/components/ui/EcosystemStrip";
import CalendlyModal from "@/components/calendly-modal";
import Pricing from "@/components/sections/Pricing";
import FinalCTA from "@/components/sections/FinalCTA";

export default function HomePageClient() {
  usePageView("Homepage");

  return (
    <div className="w-full flex flex-col items-center bg-black selection:bg-cyan-500/30">
      <Hero />
      <WhatWeDoSlideshow />
      <RevenueLeakDiagnostic />
      <EcosystemStrip />
      <CTABlock />
      <Pricing />
      <div className="py-8">
        <CalendlyModal bookingUrl="https://calendly.com/shadowspark/demo" />
      </div>
      <FinalCTA whatsappUrl="https://wa.me/2340000000000" />
    </div>
  );
}
