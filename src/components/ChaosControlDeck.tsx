import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Zap,
  Waves,
  Scissors,
  Send,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Radio,
  RotateCcw,
  ArrowUpDown,
  Square,
  X,
  ArrowRight,
} from 'lucide-react';
import { NetworkNode, ActivePing } from '../types/spatial';
import { TRANSLATIONS, Language } from '../i18n/translations';

interface ChaosControlDeckProps {
  onRunScenario: (scenarioIndex: 1 | 2 | 3) => void;
  onTriggerEarthshaker: () => void;
  onToggleFiberCutMode: () => void;
  fiberCutMode: boolean;
  nodes: NetworkNode[];
  onTracePing: (originId: string, targetId: string) => void;
  onResetNetwork: () => void;
  isDegraded: boolean;
  isAnimating: boolean;
  lang?: Language;
  selectedOrigin?: string;
  selectedTarget?: string;
  onOriginChange?: (originId: string) => void;
  onTargetChange?: (targetId: string) => void;
  activePings?: ActivePing[];
  onStopPing?: (pingId?: string) => void;
  onFocusPing?: (pingId: string) => void;
}

export const ChaosControlDeck: React.FC<ChaosControlDeckProps> = ({
  onRunScenario,
  onTriggerEarthshaker,
  onToggleFiberCutMode,
  fiberCutMode,
  nodes,
  onTracePing,
  onResetNetwork,
  isDegraded,
  isAnimating,
  lang = 'es',
  selectedOrigin: propOrigin,
  selectedTarget: propTarget,
  onOriginChange,
  onTargetChange,
  activePings = [],
  onStopPing,
  onFocusPing,
}) => {
  const t = TRANSLATIONS[lang].controlDeck;
  const [internalOrigin, setInternalOrigin] = useState<string>('node-cbba'); // Default: Cochabamba
  const [internalTarget, setInternalTarget] = useState<string>('aws-us-east-1'); // Default: N. Virginia
  const [isDeckCollapsed, setIsDeckCollapsed] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [activeSection, setActiveSection] = useState<'scenarios' | 'arsenal' | 'ping'>('scenarios');

  const selectedOrigin = propOrigin !== undefined ? propOrigin : internalOrigin;
  const selectedTarget = propTarget !== undefined ? propTarget : internalTarget;

  // Auto-switch to Ping tab only when origin or target is modified AFTER initial mount
  const prevOriginRef = useRef(propOrigin);
  const prevTargetRef = useRef(propTarget);
  useEffect(() => {
    if (
      (propOrigin && propOrigin !== prevOriginRef.current) ||
      (propTarget && propTarget !== prevTargetRef.current)
    ) {
      setActiveSection('ping');
    }
    prevOriginRef.current = propOrigin;
    prevTargetRef.current = propTarget;
  }, [propOrigin, propTarget]);

  const handleOriginChange = (val: string) => {
    if (onOriginChange) onOriginChange(val);
    else setInternalOrigin(val);
  };

  const handleTargetChange = (val: string) => {
    if (onTargetChange) onTargetChange(val);
    else setInternalTarget(val);
  };

  const handleSelectScenario = (scenarioIndex: 1 | 2 | 3) => {
    onRunScenario(scenarioIndex);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsDeckCollapsed(true);
    }
  };

  const handleTriggerEarthshaker = () => {
    onTriggerEarthshaker();
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsDeckCollapsed(true);
    }
  };

  const handleSwapOriginTarget = () => {
    const temp = selectedOrigin;
    handleOriginChange(selectedTarget);
    handleTargetChange(temp);
  };

  // Group selectable nodes across all global topologies
  const awsRegions = nodes.filter((n) => n.type === 'aws_region');
  const landingStations = nodes.filter((n) => n.type === 'landing_station');
  const ixps = nodes.filter((n) => n.type === 'ixp');
  const depots = nodes.filter((n) => n.type === 'depot');

  const renderNodeOptions = () => (
    <>
      <optgroup label={t.groupAwsRegions} className="bg-slate-950 text-amber-400 font-bold">
        {awsRegions.map((n) => (
          <option key={n.id} value={n.id} className="bg-slate-900 text-slate-200 font-normal">
            {n.name} ({n.country})
          </option>
        ))}
      </optgroup>
      <optgroup label={t.groupLandingStations} className="bg-slate-950 text-cyan-400 font-bold">
        {landingStations.map((n) => (
          <option key={n.id} value={n.id} className="bg-slate-900 text-slate-200 font-normal">
            {n.name} ({n.country})
          </option>
        ))}
      </optgroup>
      <optgroup label={t.groupIxps} className="bg-slate-950 text-purple-400 font-bold">
        {ixps.map((n) => (
          <option key={n.id} value={n.id} className="bg-slate-900 text-slate-200 font-normal">
            {n.name} ({n.country})
          </option>
        ))}
      </optgroup>
      <optgroup label={t.groupDepots} className="bg-slate-950 text-emerald-400 font-bold">
        {depots.map((n) => (
          <option key={n.id} value={n.id} className="bg-slate-900 text-slate-200 font-normal">
            {n.name} ({n.country})
          </option>
        ))}
      </optgroup>
    </>
  );

  if (isDeckCollapsed) {
    return (
      <aside className="absolute top-20 sm:top-[74px] left-3 sm:left-4 z-20 font-sans pointer-events-auto">
        <button
          onClick={() => setIsDeckCollapsed(false)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0B0F19]/95 border-2 border-purple-500/70 text-purple-200 text-xs font-bold shadow-[0_4px_20px_rgba(168,85,247,0.35)] backdrop-blur-2xl hover:bg-slate-900 hover:border-purple-400 hover:text-white transition-all cursor-pointer group active:scale-95"
          title={lang === 'es' ? 'Abrir Consola de Caos' : 'Open Command Deck'}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition shrink-0" />
          <span className="font-mono text-xs tracking-wider">{lang === 'es' ? 'CONSOLA DE CAOS' : 'COMMAND DECK'}</span>
          <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition shrink-0" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="absolute top-20 sm:top-[74px] left-3 sm:left-4 z-20 w-[285px] max-w-[calc(100vw-24px)] max-h-[calc(100vh-220px)] sm:max-h-[calc(100vh-285px)] flex flex-col bg-[#0B0F19]/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans pointer-events-auto transition-all duration-300">
      {/* 1. Header with Active LED & Collapse Button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span className="text-xs font-bold font-mono tracking-wider text-slate-200 uppercase truncate">
            {lang === 'es' ? 'CONSOLA DE CAOS' : 'COMMAND DECK'}
          </span>
        </div>
        <button
          onClick={() => setIsDeckCollapsed(true)}
          className="text-slate-400 hover:text-purple-300 p-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer flex items-center justify-center shrink-0"
          title={lang === 'es' ? 'Plegar consola de caos' : 'Collapse command deck'}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Segmented 3-Tab Selector */}
      <div className="grid grid-cols-3 p-1.5 bg-slate-950/80 border-b border-slate-800/80 text-[11px] font-mono shrink-0">
        <button
          onClick={() => setActiveSection('scenarios')}
          className={`py-1 rounded-lg transition font-bold flex items-center justify-center gap-1 cursor-pointer ${
            activeSection === 'scenarios'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={lang === 'es' ? 'Escenarios de evaluación' : 'Evaluation scenarios'}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{lang === 'es' ? 'Presets' : 'Presets'}</span>
        </button>
        <button
          onClick={() => setActiveSection('arsenal')}
          className={`py-1 rounded-lg transition font-bold flex items-center justify-center gap-1 cursor-pointer ${
            activeSection === 'arsenal'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={lang === 'es' ? 'Disparadores de Caos' : 'Chaos Triggers'}
        >
          <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>{lang === 'es' ? 'Caos' : 'Chaos'}</span>
        </button>
        <button
          onClick={() => setActiveSection('ping')}
          className={`py-1 rounded-lg transition font-bold flex items-center justify-center gap-1 cursor-pointer ${
            activeSection === 'ping'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={lang === 'es' ? 'Trazador de Ping BGP' : 'BGP Ping Tracer'}
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Ping</span>
          {activePings.length > 0 && (
            <span className="px-1 py-0.2 rounded-full text-[9px] bg-cyan-400/20 text-cyan-300 font-mono font-bold">
              {activePings.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Tab Contents with Internal Custom Scrollbar */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* TAB 1: 1-Click Judge Presets */}
      {activeSection === 'scenarios' && (
        <div className="p-2.5 flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
          {/* Scenario 1: Andean Quake */}
          <button
            onClick={() => handleSelectScenario(1)}
            disabled={isAnimating}
            className="group relative flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-purple-500/40 hover:border-purple-400 hover:bg-purple-950/30 transition shadow-md disabled:opacity-50 text-left cursor-pointer"
          >
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold shrink-0">
                  ANDES
                </span>
                <span className="text-xs font-bold text-purple-200 truncate">{t.scenario1Name}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{t.scenario1Desc}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Scenario 2: Fortaleza */}
          <button
            onClick={() => handleSelectScenario(2)}
            disabled={isAnimating}
            className="group relative flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 hover:bg-amber-950/30 transition shadow-md disabled:opacity-50 text-left cursor-pointer"
          >
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shrink-0">
                  BRASIL
                </span>
                <span className="text-xs font-bold text-amber-200 truncate">{t.scenario2Name}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{t.scenario2Desc}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:translate-x-0.5 transition" />
          </button>

          {/* Scenario 3: Transatlantic */}
          <button
            onClick={() => handleSelectScenario(3)}
            disabled={isAnimating}
            className="group relative flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/30 transition shadow-md disabled:opacity-50 text-left cursor-pointer"
          >
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shrink-0">
                  ATLÁNTICO
                </span>
                <span className="text-xs font-bold text-cyan-200 truncate">{t.scenario3Name}</span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{t.scenario3Desc}</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      )}

      {/* TAB 2: Chaos Arsenal */}
      {activeSection === 'arsenal' && (
        <div className="p-3 flex flex-col gap-2">
          {/* Unleash Giant Kiro Earthshaker Button */}
          <button
            onClick={handleTriggerEarthshaker}
            disabled={isAnimating}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 text-purple-100 font-bold text-xs shadow-lg shadow-purple-950/50 border border-purple-500/50 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-4 h-4 fill-purple-300 shrink-0" viewBox="0 0 24 24">
              <path d="M12 2C7.58 2 4 5.58 4 10v9.5c0 .83.67 1.5 1.5 1.5.4 0 .78-.16 1.06-.44L8 19.12l1.44 1.44c.28.28.66.44 1.06.44s.78-.16 1.06-.44L12 19.12l1.44 1.44c.28.28.66.44 1.06.44s.78-.16 1.06-.44L16 19.12l1.44 1.44c.28.28.66.44 1.06.44.83 0 1.5-.67 1.5-1.5V10c0-4.42-3.58-8-8-8zm-2.2 7c.66 0 1.2.67 1.2 1.5s-.54 1.5-1.2 1.5-1.2-.67-1.2-1.5.54-1.5 1.2-1.5zm4.4 0c.66 0 1.2.67 1.2 1.5s-.54 1.5-1.2 1.5-1.2-.67-1.2-1.5.54-1.5 1.2-1.5z" />
            </svg>
            <span>{t.earthshakerBtn.toUpperCase()}</span>
          </button>

          {/* Simulate Fiber Cut Mode Toggle */}
          <button
            onClick={onToggleFiberCutMode}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs border transition cursor-pointer ${
              fiberCutMode
                ? 'bg-rose-600 text-white border-rose-400 shadow-lg shadow-rose-600/40 animate-pulse'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600/50'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 shrink-0" />
            <span>{fiberCutMode ? (lang === 'es' ? 'CANCELAR CORTE' : 'CANCEL FIBER CUT') : t.cutFiberBtn.toUpperCase()}</span>
          </button>

          {/* Restore Network Button if Degraded */}
          {isDegraded && (
            <button
              onClick={onResetNetwork}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold text-xs border border-emerald-500/50 transition cursor-pointer shadow-md"
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'es' ? 'Restaurar Red (100%)' : 'Restore Network (100%)'}</span>
            </button>
          )}
        </div>
      )}

      {/* TAB 3: Packet Ping Tracer */}
      {activeSection === 'ping' && (
        <div className="p-3 flex flex-col gap-2 font-mono text-[11px]">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">{t.originLabel}:</label>
            <select
              value={selectedOrigin}
              onChange={(e) => handleOriginChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-cyan-400 text-xs"
            >
              {renderNodeOptions()}
            </select>
          </div>

          <div className="flex items-center justify-center -my-1">
            <button
              onClick={handleSwapOriginTarget}
              className="p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-slate-700 transition cursor-pointer"
              title={lang === 'es' ? 'Invertir Origen / Destino' : 'Swap Origin / Destination'}
            >
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">{t.targetLabel}:</label>
            <select
              value={selectedTarget}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-1.5 focus:outline-none focus:border-cyan-400 text-xs"
            >
              {renderNodeOptions()}
            </select>
          </div>

          <button
            onClick={() => onTracePing(selectedOrigin, selectedTarget)}
            disabled={selectedOrigin === selectedTarget}
            className="mt-1 w-full py-2 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 text-cyan-200 border border-cyan-500/50 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/60 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{selectedOrigin === selectedTarget ? (lang === 'es' ? 'Selecciona Nodos Distintos' : 'Select Different Nodes') : t.traceRouteBtn}</span>
            <Send className="w-3 h-3 text-cyan-400 shrink-0" />
          </button>

          {/* Stop Ping Button */}
          {activePings.length > 0 && (
            <button
              onClick={() => onStopPing && onStopPing()}
              className="w-full py-1.5 px-2 bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-[11px] transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Square className="w-3 h-3 fill-rose-400 text-rose-400 shrink-0" />
              <span>
                {activePings.length > 1
                  ? (lang === 'es' ? `Detener Todos los Pings (${activePings.length})` : `Stop All Pings (${activePings.length})`)
                  : (lang === 'es' ? 'Detener Ping' : 'Stop Ping')}
              </span>
            </button>
          )}

          {/* Active Running Pings List */}
          {activePings.length > 0 && (
            <div className="mt-1 flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-0.5 custom-scrollbar border-t border-slate-800/80 pt-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-0.5">
                <span className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
                  <span>{lang === 'es' ? `PINGS EN VIVO (${activePings.length})` : `LIVE PINGS (${activePings.length})`}</span>
                </span>
                <span className="text-[9px] font-mono text-slate-500">
                  {lang === 'es' ? 'Simultáneos' : 'Concurrent'}
                </span>
              </div>
              {activePings.map((ping) => {
                const isDropped = ping.path.length < 2 || ping.rttMs >= 999;
                return (
                  <div
                    key={ping.id}
                    className={`p-1.5 rounded-xl border text-[10px] flex items-center justify-between gap-1.5 transition ${
                      isDropped
                        ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        : 'bg-slate-900/90 border-cyan-500/30 text-slate-200 hover:border-cyan-400/60'
                    }`}
                  >
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => onFocusPing && onFocusPing(ping.id)}
                      title={lang === 'es' ? 'Enfocar ruta en el mapa' : 'Focus route on map'}
                    >
                      <div className="font-bold truncate text-[11px] text-slate-100 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDropped ? 'bg-rose-500' : 'bg-cyan-400 animate-pulse'} shrink-0`}></span>
                        <span className="truncate flex items-center">
                          {ping.originName.split(' (')[0]}
                          <ArrowRight className="w-2.5 h-2.5 inline mx-1 text-cyan-400 shrink-0" />
                          {ping.targetName.split(' (')[0]}
                        </span>
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className={isDropped ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {isDropped ? 'DROP' : `${ping.rttMs} ms`}
                        </span>
                        <span>•</span>
                        <span>{ping.hops} {lang === 'es' ? 'saltos' : 'hops'}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopPing && onStopPing(ping.id);
                      }}
                      className="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition shrink-0 cursor-pointer"
                      title={lang === 'es' ? 'Detener este ping' : 'Stop this ping'}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </aside>
  );
};
