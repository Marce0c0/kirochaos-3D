import React from 'react';
import { Volume2, VolumeX, Layers, Camera, ShieldAlert, Activity, RefreshCw, Languages } from 'lucide-react';
import { TRANSLATIONS, Language } from '../i18n/translations';

interface TopHudBarProps {
  healthPercentage: number;
  activeCablesCount: number;
  totalCablesCount: number;
  severedCablesCount: number;
  avgLatencyMs: number;
  isMuted: boolean;
  lang: Language;
  onToggleMute: () => void;
  onOpenArchitecture: () => void;
  onToggleCoverMode: () => void;
  onResetNetwork: () => void;
  onToggleLang: () => void;
}

export const TopHudBar: React.FC<TopHudBarProps> = ({
  healthPercentage,
  activeCablesCount,
  totalCablesCount,
  severedCablesCount,
  avgLatencyMs,
  isMuted,
  lang,
  onToggleMute,
  onOpenArchitecture,
  onToggleCoverMode,
  onResetNetwork,
  onToggleLang,
}) => {
  const isDegraded = healthPercentage < 100;
  const t = TRANSLATIONS[lang].topHud;

  return (
    <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 bg-[#0B0F19]/80 backdrop-blur-md border-b border-slate-800/80 shadow-2xl pointer-events-auto">
      {/* Brand & Mission Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <img
          src="/kiros_escondite.webp"
          alt="Kiro Mascot"
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-purple-400/40 shadow-lg shadow-purple-600/30 shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-extrabold text-sm sm:text-base tracking-wider text-slate-100 flex items-center gap-1">
              <span className="text-[#FF9900]">KIRO</span>CHAOS <span className="text-cyan-400 font-mono text-[10px] sm:text-xs">3D</span>
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 shrink-0">
              AWS NOC
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono hidden md:block truncate max-w-[280px] xl:max-w-none">
            {t.subtitle}
          </p>
        </div>
      </div>

      {/* Telemetry Metrics Pill (Desktop) */}
      <div className="hidden lg:flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-2xl shadow-inner font-mono text-xs shrink-0">
        {/* Global Mesh Health */}
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${isDegraded ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
          <span className="text-slate-400">{t.meshHealth}:</span>
          <span
            className={`font-bold px-1.5 py-0.5 rounded ${
              isDegraded ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}
          >
            {healthPercentage}%
          </span>
        </div>

        <div className="w-px h-4 bg-slate-700" />

        {/* Cable Status */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">{t.optics}:</span>
          <span className="text-emerald-400 font-bold">{activeCablesCount}</span>
          <span className="text-slate-500">/</span>
          <span className="text-slate-300">{totalCablesCount}</span>
          {severedCablesCount > 0 && (
            <span className="ml-1.5 flex items-center gap-1 text-rose-400 font-bold bg-rose-500/15 px-1.5 py-0.5 rounded animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" /> {severedCablesCount} {t.cut}
            </span>
          )}
        </div>

        <div className="w-px h-4 bg-slate-700" />

        {/* BGP Average Latency */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">{t.globalRtt}:</span>
          <span
            className={`font-bold ${
              avgLatencyMs > 100 ? 'text-amber-400' : 'text-cyan-400'
            }`}
          >
            {avgLatencyMs} ms
          </span>
        </div>
      </div>

      {/* Mobile/Tablet Compact Metrics Pill */}
      <div className="flex lg:hidden items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2 py-1 rounded-xl font-mono text-[10px] shrink-0">
        <Activity className={`w-3 h-3 ${isDegraded ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
        <span className={`font-bold ${isDegraded ? 'text-rose-300' : 'text-emerald-300'}`}>
          {healthPercentage}%
        </span>
        <span className="text-slate-600">|</span>
        <span className={avgLatencyMs > 100 ? 'text-amber-400 font-bold' : 'text-cyan-300 font-bold'}>
          {avgLatencyMs}ms
        </span>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* Language Selector ES | EN */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold text-sky-200 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-400/50 rounded-xl transition shadow-lg shadow-sky-950/40"
          title={lang === 'es' ? 'Switch interface to English' : 'Cambiar interfaz a Español'}
        >
          <Languages className="w-3.5 h-3.5 text-sky-400" />
          <span>{lang.toUpperCase()}</span>
        </button>

        {/* Reset Network State */}
        {severedCablesCount > 0 && (
          <button
            onClick={onResetNetwork}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 rounded-xl transition shadow-lg shadow-emerald-950/40"
            title={t.resetGrid}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.resetGrid}</span>
          </button>
        )}

        {/* Audio Toggle */}
        <button
          onClick={onToggleMute}
          className={`p-2 rounded-xl border transition ${
            isMuted
              ? 'bg-slate-800/80 text-slate-400 border-slate-700'
              : 'bg-purple-950/50 text-purple-300 border-purple-500/40 shadow-lg shadow-purple-950/30'
          }`}
          title={isMuted ? t.audioUnmuted : t.audioMuted}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* AWS Architecture Diagram Modal */}
        <button
          onClick={onOpenArchitecture}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 rounded-xl transition shadow-lg shadow-amber-950/20"
          title={t.awsArch}
        >
          <Layers className="w-4 h-4" />
          <span className="hidden sm:inline">{t.awsArch}</span>
        </button>

        {/* Cover Photo Mode (Press H) */}
        <button
          onClick={onToggleCoverMode}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-200 bg-purple-900/60 hover:bg-purple-800/80 border border-purple-400/50 rounded-xl transition shadow-lg shadow-purple-900/40"
          title={t.coverMode}
        >
          <Camera className="w-4 h-4 text-purple-300" />
          <span className="hidden xl:inline">{t.coverMode}</span>
          <span className="hidden sm:inline xl:hidden">Cover (H)</span>
        </button>
      </div>
    </header>
  );
};
