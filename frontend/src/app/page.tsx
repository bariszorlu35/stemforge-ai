import UploadZone from "@/components/UploadZone";

export default function Home() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-60 -right-20 w-[300px] h-[300px] bg-fuchsia-600/8 rounded-full blur-[100px]" />
      </div>

      {/* Hero */}
      <div className="text-center mb-10 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/5 text-violet-300 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Hierarchical AI Separation
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">
          Split any song into{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400">
            every stem
          </span>
        </h1>
        <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
          Lead vocal, backing vocals, kick, snare, hi-hat, cymbals — not just 4 tracks, but a full hierarchy.
        </p>
      </div>

      {/* Upload card */}
      <div className="bg-[#16162a] border border-[#1e1e35] rounded-2xl p-6 shadow-xl shadow-black/30">
        <UploadZone />
      </div>

      {/* How it works */}
      <div className="mt-10 grid grid-cols-3 gap-3 text-center">
        {[
          { step: "01", title: "Upload", desc: "MP3, WAV or FLAC", icon: "↑" },
          { step: "02", title: "AI Process", desc: "Hierarchical separation", icon: "⚡" },
          { step: "03", title: "Mix & Export", desc: "Solo, mute, download", icon: "↓" },
        ].map((s) => (
          <div key={s.step} className="p-4 rounded-xl bg-[#16162a] border border-[#1e1e35] group hover:border-violet-500/30 transition-colors">
            <div className="text-lg mb-1">{s.icon}</div>
            <div className="font-semibold text-sm text-slate-200">{s.title}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
