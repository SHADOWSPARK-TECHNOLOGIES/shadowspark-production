import { Search, Zap, Shield, BarChart3 } from "lucide-react";
import GlassCard from "./GlassCard";

const features = [
  {
    title: "Instant Audit",
    desc: "$10 to identify every leak in your sales funnel.",
    icon: Search,
    grid: "md:col-span-2",
  },
  {
    title: "Zero Latency",
    desc: "Optimized for Nigerian mobile networks.",
    icon: Zap,
    grid: "md:col-span-1",
  },
  {
    title: "Secured by Design",
    desc: "Enterprise encryption on every conversation.",
    icon: Shield,
    grid: "md:col-span-1",
  },
  {
    title: "Growth Metrics",
    desc: "Real-time revenue attribution for every lead.",
    icon: BarChart3,
    grid: "md:col-span-2",
  }
];

export default function BentoFeatures() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-6xl">
      {features.map((f, i) => (
        <GlassCard key={i} className={f.grid + " p-8 flex flex-col justify-between"}>
          <f.icon className="text-cyan-400 w-10 h-10 mb-8" />
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
            <p className="text-zinc-500 text-sm">{f.desc}</p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
