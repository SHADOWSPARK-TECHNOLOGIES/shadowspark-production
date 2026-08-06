'use client';
import { usePageView } from "@/hooks/useAnalytics";
import Hero from "@/components/marketing/Hero";
import CTABlock from "@/components/marketing/CTABlock";
import WhatWeDoSlideshow from "@/components/marketing/WhatWeDoSlideshow";

export default function HomePageClient() {
  usePageView("Homepage");

  return (
    <div className="w-full flex flex-col items-center bg-black selection:bg-cyan-500/30">
      <Hero />
      <WhatWeDoSlideshow />
      <CTABlock />
    </div>
  );
}
