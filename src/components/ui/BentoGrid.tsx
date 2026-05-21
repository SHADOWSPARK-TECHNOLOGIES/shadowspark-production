import { Search, Zap, TrendingUp, Cpu } from "lucide-react";
import GlassCard from "./GlassCard";

const features = [
  {
    title: "Market Mapping",
    desc: "Visualize every interaction and opportunity across your digital footprint.",
    icon: Search,
    grid: "md:col-span-2",
  },
  {
    title: "Revenue Leak Detection",
    desc: "Autonomous agents identify exactly where your funnel is losing capital.",
    icon: Zap,
    grid: "md:col-span-1",
  },
  {
    title: "Competitor Analysis",
    desc: "Real-time indexing of market shifts and competitor response strategies.",
    icon: TrendingUp,
    grid: "md:col-span-1",
  },
  {
    title: "AI Integration",
    desc: "Deploy custom LLM nodes into your existing operational workflows.",
    icon: Cpu,
    grid: "md:col-span-2",
  }
];

export default function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl mx-auto px-6">
      {features.map((f, i) => (
        <GlassCard key={i} className={f.grid + " p-10 flex flex-col justify-between group h-[300px]"}>
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform duration-500">
              <f.icon className="w-8 h-8" />
            </div>
            <div className="text-[10px] font-mono text-zinc-700 tracking-widest uppercase">MODULE_0{i+1}</div>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-3">{f.title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-sm">{f.desc}</p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
