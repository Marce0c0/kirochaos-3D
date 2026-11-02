import React from 'react';
import {
  AlertTriangle,
  Server,
  CloudLightning,
  Database,
  Flame,
  WifiOff,
  Zap,
  TrendingDown,
  Cpu,
  Cloud,
  Truck,
  LucideIcon,
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface AwsChaosOverlayProps {
  isActive: boolean;
  scenarioName?: string;
  lang?: Language;
}

interface FallingItem {
  id: number;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  leftPercent: number;
  durationSec: number;
  delaySec: number;
  colorClass: string;
  rotationDir: number;
}

const CHAOS_ITEMS: FallingItem[] = [
  { id: 1, icon: Server, label: 'EC2 Rack #09', sublabel: 'KERNEL PANIC', leftPercent: 8, durationSec: 1.8, delaySec: 0.1, colorClass: 'border-rose-500/80 bg-rose-950/90 text-rose-200', rotationDir: 1 },
  { id: 2, icon: Database, label: 's3://lakehouse-data', sublabel: 'BUCKET OFFLINE', leftPercent: 18, durationSec: 2.1, delaySec: 0.3, colorClass: 'border-amber-500/80 bg-amber-950/90 text-amber-200', rotationDir: -1 },
  { id: 3, icon: Cloud, label: 'AWS Route 53', sublabel: 'DNS RESOLUTION TIMEOUT', leftPercent: 28, durationSec: 1.9, delaySec: 0.05, colorClass: 'border-cyan-500/80 bg-cyan-950/90 text-cyan-200', rotationDir: 1 },
  { id: 4, icon: WifiOff, label: 'Fiber Core Tacna', sublabel: '100 Gbps OPTICAL SEVER', leftPercent: 38, durationSec: 2.2, delaySec: 0.4, colorClass: 'border-red-500/90 bg-red-950/95 text-red-200', rotationDir: -1 },
  { id: 5, icon: Zap, label: 'HTTP 500 SERVER ERROR', sublabel: 'BGP PEERING DROPPED', leftPercent: 52, durationSec: 1.7, delaySec: 0.2, colorClass: 'border-purple-500/80 bg-purple-950/90 text-purple-200', rotationDir: 1 },
  { id: 6, icon: Server, label: 'sa-east-1 Core Node', sublabel: 'DATA CENTER UNREACHABLE', leftPercent: 62, durationSec: 2.0, delaySec: 0.15, colorClass: 'border-rose-500/80 bg-rose-950/90 text-rose-200', rotationDir: -1 },
  { id: 7, icon: TrendingDown, label: 'Latency: +380ms', sublabel: 'PACKET LOSS: 99.4%', leftPercent: 74, durationSec: 2.3, delaySec: 0.35, colorClass: 'border-amber-500/80 bg-amber-950/90 text-amber-200', rotationDir: 1 },
  { id: 8, icon: Database, label: 'DynamoDB Shard #4', sublabel: 'THROTTLED: 100% RETRIES', leftPercent: 84, durationSec: 1.8, delaySec: 0.25, colorClass: 'border-blue-500/80 bg-blue-950/90 text-blue-200', rotationDir: -1 },
  { id: 9, icon: AlertTriangle, label: 'US-EAST-1 DEGRADED', sublabel: 'AVAILABILITY ZONE FAIL', leftPercent: 12, durationSec: 2.4, delaySec: 0.5, colorClass: 'border-rose-500/80 bg-rose-950/90 text-rose-200', rotationDir: 1 },
  { id: 10, icon: Cpu, label: 'Lambda Cold Start', sublabel: 'TIMEOUT (15m)', leftPercent: 44, durationSec: 2.0, delaySec: 0.6, colorClass: 'border-amber-500/80 bg-amber-950/90 text-amber-200', rotationDir: -1 },
  { id: 11, icon: WifiOff, label: 'Subsea Pacific-1', sublabel: 'OPTICAL LINK BREAK', leftPercent: 68, durationSec: 2.2, delaySec: 0.45, colorClass: 'border-red-500/90 bg-red-950/95 text-red-200', rotationDir: 1 },
  { id: 12, icon: CloudLightning, label: 'CloudFront Edge POP', sublabel: 'CACHE MISS OFFLINE', leftPercent: 88, durationSec: 1.9, delaySec: 0.55, colorClass: 'border-purple-500/80 bg-purple-950/90 text-purple-200', rotationDir: -1 },
];

export const AwsChaosOverlay: React.FC<AwsChaosOverlayProps> = ({ isActive, scenarioName, lang = 'es' }) => {
  if (!isActive) return null;

  const t = TRANSLATIONS[lang];

  return (
    <div className="fixed inset-0 z-30 pointer-events-none overflow-hidden select-none">
      {/* 1. Dramatic Alarm Vignette & Glitch CRT lines */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-rose-950/20 to-rose-950/60 animate-pulse pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_4px] opacity-40 pointer-events-none" />

      {/* 2. Top Centered Critical Incident Warning Banner */}
      <div className="absolute top-14 sm:top-[62px] inset-x-0 z-40 flex justify-center px-3 pointer-events-none">
        <div className="flex flex-col items-center gap-1 sm:gap-1.5 bg-[#080B12]/95 border-2 border-rose-500/90 px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.5)] backdrop-blur-2xl max-w-[calc(100vw-24px)] sm:max-w-xl text-center pointer-events-auto">
          <div className="flex items-center justify-center gap-2 text-rose-400 font-bold tracking-wider sm:tracking-widest text-xs sm:text-sm font-mono uppercase text-center">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 animate-pulse shrink-0" />
            <span className="drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]">{t.chaosOverlay.alertTitle}</span>
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 animate-pulse shrink-0" />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-slate-300">
            <span className="text-amber-300 font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30">
              {scenarioName || (lang === 'en' ? 'Planetary Seismic Impact' : 'Impacto Sísmico Planetario')}
            </span>
            <span className="text-rose-300 font-semibold px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30">
              {lang === 'en' ? 'AWS Failover Active' : 'Failover AWS Activo'}
            </span>
            <span className="text-cyan-300 flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30">
              {lang === 'en' ? 'Dispatching Crew' : 'Despachando Cuadrilla'}
              <Truck className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            </span>
          </div>
        </div>
      </div>

      {/* 3. Falling Servers & Tumbling AWS Badges */}
      {CHAOS_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={`absolute flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono shadow-2xl backdrop-blur-md ${item.colorClass}`}
            style={{
              left: `${item.leftPercent}%`,
              top: '-80px',
              animation: `serverFall ${item.durationSec}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${item.delaySec}s infinite`,
              transform: `rotate(${item.rotationDir * 15}deg)`,
            }}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-xs whitespace-nowrap leading-tight">{item.label}</span>
              <span className="text-[9px] opacity-80 whitespace-nowrap tracking-wider font-bold">{item.sublabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

