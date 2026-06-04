import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { WhatWeDo } from "@/components/landing/WhatWeDo";
import { Flagship } from "@/components/landing/Flagship";
import { HowWeWork } from "@/components/landing/HowWeWork";
import { LiveDeployment } from "@/components/landing/LiveDeployment";
import { WhyShadowspark } from "@/components/landing/WhyShadowspark";
import { Services } from "@/components/landing/Services";
import { Stack } from "@/components/landing/Stack";
import { Contact } from "@/components/landing/Contact";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "ShadowSpark Technologies — Nigerian AI Agency",
  description:
    "We design and build AI-powered products for Nigerian businesses. From identity verification to automation. Our flagship product, Lodgist, is live and protecting students today.",
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WhatWeDo />
      <Flagship />
      <HowWeWork />
      <LiveDeployment />
      <WhyShadowspark />
      <Services />
      <Stack />
      <Contact />
      <Footer />
    </main>
  );
}
