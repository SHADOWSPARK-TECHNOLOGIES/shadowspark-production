import { ShieldCheck, Lock, Globe } from "lucide-react";

export default function TrustBadges() {
  const badges = [
    {
      icon: <Lock className="w-5 h-5" />,
      text: "AES-256 Encryption at Rest",
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      text: "TLS 1.3 in Transit",
    },
    {
      icon: <Globe className="w-5 h-5" />,
      text: "NDPR-Compliant Data Handling",
    },
  ];

  return (
    <div className="py-12 bg-transparent">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
          {badges.map((badge, index) => (
            <div key={index} className="flex items-center gap-3 text-cyan-300/70">
              <div className="flex-shrink-0">
                {badge.icon}
              </div>
              <span className="text-sm font-medium tracking-wider">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
