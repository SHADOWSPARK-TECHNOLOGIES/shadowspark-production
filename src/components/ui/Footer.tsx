import { Globe, MessageCircle, ShieldCheck } from "lucide-react";

export const SovereignFooter = () => (
  <footer className="bg-black border-t border-white/10 p-10">
    <div className="flex justify-between items-center max-w-7xl mx-auto">
      <div className="flex gap-4 items-center">
        <ShieldCheck className="text-cyan-500" />
        <span className="text-sm text-neutral-400">AES-256 Encryption at Rest</span>
      </div>
      <div className="flex gap-8">
        <a href="https://facebook.com/your-page-slug" className="hover:text-cyan-500 transition-all">
          <Globe />
        </a>
        <a href="https://wa.me/your-whatsapp-number" className="hover:text-cyan-500 transition-all text-cyan-500">
          <MessageCircle />
        </a>
      </div>
    </div>
  </footer>
);

export default SovereignFooter;
