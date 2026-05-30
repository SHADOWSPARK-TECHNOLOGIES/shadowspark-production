import type { Metadata } from "next";
import { Contact } from "@/components/landing/Contact";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell us what you're trying to build. We'll come back with a plan within 48 hours.",
};

export default function ContactPage() {
  return (
    <main className="bg-[#0B1B2B] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-4">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-[1.15]">
          Get in touch.
        </h1>
      </div>
      <Contact />
      <Footer />
    </main>
  );
}
