import React from 'react';
import { Flame } from 'lucide-react';

export const CoverShowcaseBadge: React.FC = () => {
  return (
    <div className="absolute top-4 left-4 sm:top-6 sm:left-7 z-30 pointer-events-none select-none opacity-100 translate-y-0 transition-opacity duration-500 animate-in fade-in">
      <div className="flex items-center gap-3.5 sm:gap-4 p-2.5 sm:p-3 rounded-2xl bg-[#0B0F19]/85 backdrop-blur-xl border border-slate-700/80 shadow-[0_12px_40px_rgba(0,0,0,0.85)] max-w-[92vw] sm:max-w-none">
        {/* Burning Rack Server Graphic (Pure SVG with animated flame keyframes) */}
        <div className="relative w-14 h-16 sm:w-16 sm:h-20 shrink-0 flex items-end justify-center pb-1">
          {/* Animated SVG Flames */}
          <svg
            className="absolute -top-3 inset-x-0 w-full h-14 overflow-visible pointer-events-none"
            viewBox="0 0 64 64"
            fill="none"
          >
            <defs>
              <linearGradient id="flameOuterGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#DC2626" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#EA580C" stopOpacity="0.95" />
                <stop offset="85%" stopColor="#F59E0B" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="flameInnerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.8" />
                <stop offset="20%" stopColor="#F97316" stopOpacity="0.95" />
                <stop offset="70%" stopColor="#FEF08A" stopOpacity="1" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
              </linearGradient>
              <filter id="flameGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Rising Sparks / Embers */}
            <circle cx="20" cy="18" r="1.5" fill="#FDE047" className="animate-ember-1" />
            <circle cx="34" cy="12" r="1.8" fill="#F97316" className="animate-ember-2" />
            <circle cx="46" cy="22" r="1.2" fill="#FEF08A" className="animate-ember-3" />

            {/* Outer Flame Tongue (Large) */}
            <path
              className="animate-flame-main"
              filter="url(#flameGlow)"
              d="M14 54 C10 40 16 30 22 22 C26 17 28 10 32 4 C36 10 40 16 44 24 C50 32 54 42 48 54 Z"
              fill="url(#flameOuterGrad)"
            />

            {/* Left Secondary Flame */}
            <path
              className="animate-flame-inner"
              d="M18 54 C14 44 18 36 22 28 C25 22 26 16 28 14 C30 20 33 26 31 34 C29 42 30 48 24 54 Z"
              fill="#F97316"
              opacity="0.85"
            />

            {/* Right Secondary Flame */}
            <path
              className="animate-flame-inner"
              d="M34 54 C38 46 41 38 40 30 C39 24 43 18 45 16 C47 22 49 28 47 36 C45 44 47 50 42 54 Z"
              fill="#EA580C"
              opacity="0.85"
            />

            {/* Intense Yellow/White Core Flame */}
            <path
              className="animate-flame-inner"
              d="M24 54 C22 44 26 36 30 28 C32 24 32 18 33 16 C34 18 36 24 37 28 C40 36 42 44 38 54 Z"
              fill="url(#flameInnerGrad)"
            />
          </svg>

          {/* 19-inch 2U Rack Server Chassis */}
          <div className="relative w-12 sm:w-14 h-9 sm:h-10 rounded bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600 shadow-xl overflow-hidden flex flex-col justify-between p-1 z-10">
            {/* Server Rack Ear Screws */}
            <div className="absolute top-1 left-0.5 w-1 h-1 rounded-full bg-slate-400 border border-slate-900"></div>
            <div className="absolute bottom-1 left-0.5 w-1 h-1 rounded-full bg-slate-400 border border-slate-900"></div>
            <div className="absolute top-1 right-0.5 w-1 h-1 rounded-full bg-slate-400 border border-slate-900"></div>
            <div className="absolute bottom-1 right-0.5 w-1 h-1 rounded-full bg-slate-400 border border-slate-900"></div>

            {/* Top Drive Bays Slot */}
            <div className="flex items-center gap-0.5 px-1.5 pt-0.5">
              <div className="flex-1 h-2 bg-slate-900 rounded-[2px] border border-slate-700 flex items-center justify-between px-0.5">
                <span className="w-1 h-0.5 bg-slate-600 rounded-sm"></span>
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="flex-1 h-2 bg-slate-900 rounded-[2px] border border-slate-700 flex items-center justify-between px-0.5">
                <span className="w-1 h-0.5 bg-slate-600 rounded-sm"></span>
                <span className="w-1 h-1 rounded-full bg-amber-400"></span>
              </div>
              <div className="flex-1 h-2 bg-slate-900 rounded-[2px] border border-rose-500/80 flex items-center justify-between px-0.5">
                <span className="w-1 h-0.5 bg-rose-400 rounded-sm"></span>
                <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping"></span>
              </div>
            </div>

            {/* Center Glowing Heat Vent (Severely overheating) */}
            <div className="mx-1.5 h-1 bg-gradient-to-r from-amber-500 via-red-500 to-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>

            {/* Bottom Status Panel & SAS Port */}
            <div className="flex items-center justify-between px-1.5 pb-0.5 text-[6px] font-mono text-slate-400">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                <span className="text-rose-400 font-bold uppercase tracking-tighter">ALARM</span>
              </div>
              <span className="text-[7px] text-amber-300 font-bold font-mono">SEV-1</span>
            </div>
          </div>
        </div>

        {/* Cinematic Title & Typography */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-['Orbitron',sans-serif] font-black text-xl sm:text-2xl md:text-3xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FF9900] via-[#EF4444] to-[#C084FC] drop-shadow-[0_0_22px_rgba(255,153,0,0.5)] flex items-center gap-2 leading-none">
              <span>KIRO CHAOS</span>
              <span className="text-cyan-300 font-mono text-xs sm:text-sm font-extrabold px-1.5 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-400/60 shadow-lg shadow-cyan-900/40">
                3D
              </span>
            </h1>
          </div>

          <p className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5 mt-1.5 truncate">
            <span className="text-amber-400 font-extrabold">Planetary Internet Resilience</span>
            <span className="text-slate-600">•</span>
            <span className="text-purple-300">AWS Spatial Challenge</span>
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/50 text-rose-300 font-mono text-[9px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3 text-rose-400 animate-pulse shrink-0" />
              <span>SRE Chaos Laboratory</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700/80 text-emerald-300 font-mono text-[9px] font-bold">
              100% Free Tier ($0.00 USD)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

