import SovereignButton from "@/components/ui/templates/SovereignButton";
import GlassCard from "@/components/ui/templates/GlassCard";
import AnimatedDivider from "@/components/ui/templates/AnimatedDivider";
import SovereignHero from "@/components/ui/templates/SovereignHero";

export const templateRegistry = {
  "sovereign-button": SovereignButton,
  "glass-card": GlassCard,
  "animated-divider": AnimatedDivider,
  "sovereign-hero": SovereignHero,
};

export const templateCatalog = [
  {
    name: "sovereign-button",
    description: "Enterprise CTA button adapted from the Coders Evoker template source.",
  },
  {
    name: "glass-card",
    description: "Reusable audit and status card with Obsidian/Cyan glassmorphism.",
  },
  {
    name: "animated-divider",
    description: "Subtle animated divider for technical section transitions and system flows.",
  },
  {
    name: "sovereign-hero",
    description: "Hero section adapted from the Coders Evoker template into ShadowSpark's enterprise visual system.",
  },
];
