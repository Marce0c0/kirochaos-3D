import React, { useState, useEffect } from 'react';
import {
  Terminal,
  MapPin,
  GitBranch,
  Bot,
  Database,
  ChevronUp,
  ChevronDown,
  Navigation,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap,
  RotateCcw,
  Download,
  Copy,
  Scissors,
  Truck,
  Anchor,
  X,
  ArrowRight,
} from 'lucide-react';
import { KiroAttackEvent, NetworkCable, NetworkNode, ActivePing } from '../types/spatial';
import { TRANSLATIONS, Language } from '../i18n/translations';

interface AwsTelemetryDrawerProps {
  activeEvent: KiroAttackEvent | null;
  cables: NetworkCable[];
  nodes?: NetworkNode[];
  pingResult?: {
    originName: string;
    targetName: string;
    path: string[];
    rttMs: number;
    hops: number;
  } | null;
  activePings?: ActivePing[];
  onStopPing?: (pingId?: string) => void;
  requestedTab?: {
    tab: 'location' | 'bgp' | 'bedrock' | 'iceberg';
    seq: number;
  } | null;
  forceExpand?: boolean;
  lang?: Language;
  repairProgress?: number;
  incidentPhase?: 'idle' | 'severed' | 'repairing' | 'restored';
}

export const AwsTelemetryDrawer: React.FC<AwsTelemetryDrawerProps> = ({
  activeEvent,
  cables,
  nodes,
  pingResult,
  activePings = [],
  onStopPing,
  requestedTab,
  forceExpand,
  lang = 'es',
  repairProgress = 0,
  incidentPhase = 'idle',
}) => {
  const t = TRANSLATIONS[lang].telemetryDrawer;
  const [activeTab, setActiveTab] = useState<'location' | 'bgp' | 'bedrock' | 'iceberg'>('location');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isAthenaRunning, setIsAthenaRunning] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [athenaResult, setAthenaResult] = useState<{
    runtimeMs: number;
    scannedMb: number;
    records: Array<{ name: string; capacityTbps: number; status: string; type: string }>;
  } | null>(null);

  const getNodeLabel = (id: string): string => {
    const node = nodes?.find((n) => n.id === id);
    if (!node) return id;
    const cleanId = node.id.replace('cls-', '').replace('node-', '').replace('depot-', '').replace('aws-', '');
    return `${node.city} (${cleanId})`;
  };

  // Automatically refresh Athena results when cables or activeEvent changes
  useEffect(() => {
    if (athenaResult !== null) {
      let matched = cables.filter((c) => activeEvent?.severedCableIds.includes(c.id));
      if (matched.length === 0) matched = cables.slice(0, 5);
      setAthenaResult((prev) =>
        prev
          ? {
              ...prev,
              records: matched.map((c) => ({
                name: c.name,
                capacityTbps: c.capacityTbps,
                status: c.status,
                type: c.type,
              })),
            }
          : null
      );
    }
  }, [cables, activeEvent]);

  // Automatically expand drawer and switch to requested tab on every seq increment
  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab.tab);
      setIsCollapsed(false);
      if (requestedTab.tab === 'iceberg' && athenaResult === null) {
        handleRunAthenaQuery();
      }
    }
  }, [requestedTab?.seq]);

  useEffect(() => {
    if (forceExpand) {
      setIsCollapsed(false);
    }
  }, [forceExpand]);

  const handleTabChange = (tab: 'location' | 'bgp' | 'bedrock' | 'iceberg') => {
    setActiveTab(tab);
    if (tab === 'iceberg' && athenaResult === null) {
      handleRunAthenaQuery();
    }
  };

  const handleRunAthenaQuery = () => {
    setIsAthenaRunning(true);
    setTimeout(() => {
      let matched = cables.filter((c) => activeEvent?.severedCableIds.includes(c.id));
      if (matched.length === 0) {
        matched = cables.slice(0, 6);
      }
      setAthenaResult({
        runtimeMs: 118,
        scannedMb: 4.2,
        records: matched.map((c) => ({
          name: c.name,
          capacityTbps: c.capacityTbps,
          status: c.status,
          type: c.type,
        })),
      });
      setIsAthenaRunning(false);
    }, 240);
  };

  const handleExportGeoJson = () => {
    if (!activeEvent) return;
    const features: GeoJSON.Feature[] = [
      activeEvent.crater.polygonGeoJson,
      {
        type: 'Feature',
        properties: {
          name: 'Emergency Highway Repair Route (AWS Location Service)',
          distanceKm: activeEvent.routeResult.distanceKm,
          durationMinutes: activeEvent.routeResult.durationMinutes,
          engine: activeEvent.routeResult.engine,
          avoidanceAreasCount: activeEvent.routeResult.avoidanceAreasCount,
        },
        geometry: {
          type: 'LineString',
          coordinates: activeEvent.routeResult.coordinates,
        },
      },
    ];

    if (activeEvent.maritimeRouteCoords && activeEvent.maritimeRouteCoords.length > 0) {
      features.push({
        type: 'Feature',
        properties: {
          name: 'Subsea Cable Ship Route (CS-Kiro)',
          vessel: 'CS-Kiro',
          operation: 'Subsea ROV Fiber Grapple & Splicing',
        },
        geometry: {
          type: 'LineString',
          coordinates: activeEvent.maritimeRouteCoords,
        },
      });
    }

    const geojsonData = {
      type: 'FeatureCollection',
      features,
    };
    const blob = new Blob([JSON.stringify(geojsonData, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-spatial-dispatch-${activeEvent.id.slice(0, 8)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySql = () => {
    const sqlText = `-- Amazon Athena DDL: Apache Iceberg v2 Global Fiber Topology
CREATE TABLE IF NOT EXISTS kiro_spatial_db.global_fiber_topology (
  feature_id STRING,
  feature_name STRING,
  layer_type STRING,
  corridor_name STRING,
  region_code STRING,
  capacity_tbps DOUBLE,
  latency_base_ms DOUBLE,
  status STRING,
  wkt_geometry STRING,
  last_updated TIMESTAMP
)
LOCATION 's3://kiro-chaos-spatial-lakehouse-prod/iceberg-tables/global_fiber_topology/'
TBLPROPERTIES (
  'table_type'='ICEBERG',
  'format'='parquet',
  'write_compression'='snappy'
);

-- Spatial Avoidance Query:
SELECT feature_id, feature_name, layer_type, capacity_tbps, status
FROM "kiro_spatial_db"."global_fiber_topology"
WHERE ST_Intersects(ST_GeometryFromText(wkt_geometry), ST_GeometryFromText('${activeEvent ? 'POLYGON_HAZARD_AVOIDANCE' : 'POLYGON_REGION_EXTENTS'}'));`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Helper to parse Bedrock SRE post-mortem into 4 executive blocks
  const parseBedrockLines = (text: string) => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const defaultBlocks = [
      {
        icon: <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
        title: lang === 'es' ? '1. Impacto Geoespacial' : '1. Geospatial Impact',
        desc: lines[0] || (lang === 'es' ? 'Ruptura física de fibra monomodo detectada en zona de subducción tectónica.' : 'Physical single-mode fiber rupture detected in tectonic zone.'),
      },
      {
        icon: <Scissors className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
        title: lang === 'es' ? '2. Fibras Afectadas' : '2. Affected Fibers',
        desc: lines[1] || (lang === 'es' ? 'Corredor óptico primario fuera de servicio; degradación de ancho de banda mitigada.' : 'Primary optical corridor out of service; capacity degradation mitigated.'),
      },
      {
        icon: <GitBranch className="w-3.5 h-3.5 text-cyan-400 shrink-0" />,
        title: lang === 'es' ? '3. Convergencia BGP' : '3. BGP Failover Convergence',
        desc: lines[2] || (lang === 'es' ? 'Conmutación Dijkstra en submilisegundos por rutas alternativas de menor costo.' : 'Sub-millisecond Dijkstra failover through lowest-cost alternative paths.'),
      },
      {
        icon: <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />,
        title: lang === 'es' ? '4. Despacho de Flota AWS' : '4. AWS Fleet Dispatch',
        desc: lines[3] || (lang === 'es' ? 'Cuadrilla terrestre y buque cablero despachados con polígono AvoidanceAreas.' : 'Emergency crew and subsea vessel dispatched avoiding hazard polygon.'),
      },
    ];

    return defaultBlocks;
  };

  return (
    <div
      className={`absolute bottom-3 right-3 left-3 sm:left-auto sm:bottom-4 sm:right-5 z-20 sm:w-[430px] lg:w-[460px] xl:w-[485px] bg-[#0B0F19]/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl transition-all duration-300 flex flex-col font-mono text-xs overflow-hidden ${
        isCollapsed ? 'h-11' : 'h-auto max-h-[360px] sm:max-h-[380px]'
      }`}
    >
      {/* Top Header & Tab Switcher (Responsive, Anti-Overflow) */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1.5 bg-slate-900/90 border-b border-slate-800 shrink-0 gap-1">
        <div className="flex items-center gap-1.5 min-w-0 pr-1 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          {isCollapsed && (
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] hidden sm:inline">
              AWS Telemetry
            </span>
          )}

          {isCollapsed && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono truncate max-w-[200px] sm:max-w-none">
              {activePings.length > 0 ? (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 truncate flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span className="truncate">
                    {activePings.length > 1
                      ? `${activePings.length} Pings: ${activePings[0].rttMs}ms...`
                      : `${t.miniPing}: ${activePings[0].rttMs}ms (${activePings[0].hops} ${t.miniHops})`}
                  </span>
                </span>
              ) : pingResult ? (
                <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 truncate flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  <span className="truncate">{t.miniPing}: {pingResult.rttMs}ms ({pingResult.hops} {t.miniHops})</span>
                </span>
              ) : activeEvent ? (
                <span className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-rose-300 truncate flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                  <span className="truncate">{activeEvent.scenarioName.split(':')[0]} (+{Math.max(0, activeEvent.latencyAfterMs - activeEvent.latencyBeforeMs)}ms)</span>
                </span>
              ) : (
                <span className="text-slate-500 text-[10px] truncate">{lang === 'es' ? '68ms nominal (Red Activa)' : '68ms nominal (Grid Active)'}</span>
              )}
            </div>
          )}
        </div>

        {/* Tab Buttons (Responsive compact labels on mobile, full names on desktop) */}
        {!isCollapsed && (
          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950 p-0.5 sm:p-1 rounded-xl border border-slate-800 text-[10px] overflow-x-auto no-scrollbar shrink min-w-0">
            <button
              onClick={() => handleTabChange('location')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap text-[9px] sm:text-[10px] shrink-0 ${
                activeTab === 'location'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Location</span>
              <span className="sm:hidden">Loc</span>
            </button>
            <button
              onClick={() => handleTabChange('bgp')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap text-[9px] sm:text-[10px] shrink-0 ${
                activeTab === 'bgp'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">{lang === 'es' ? 'Matriz BGP' : 'BGP Matrix'}</span>
              <span className="sm:hidden">BGP</span>
            </button>
            <button
              onClick={() => handleTabChange('bedrock')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap text-[9px] sm:text-[10px] shrink-0 ${
                activeTab === 'bedrock'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Bedrock SRE</span>
              <span className="sm:hidden">SRE</span>
            </button>
            <button
              onClick={() => handleTabChange('iceberg')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap text-[9px] sm:text-[10px] shrink-0 ${
                activeTab === 'iceberg'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline">Iceberg S3</span>
              <span className="sm:hidden">S3</span>
            </button>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded text-slate-400 hover:text-slate-200 cursor-pointer shrink-0 ml-1"
          title={isCollapsed ? 'Expand console' : 'Collapse console'}
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Drawer Content */}
      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3 sm:p-3.5 overflow-y-auto custom-scrollbar space-y-2.5 text-[11px] leading-relaxed">
          {/* TAB 1: AMAZON LOCATION SERVICE (MULTIMODAL DISPATCH) */}
          {activeTab === 'location' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wide">
                  AWS LOCATION DISPATCH
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {activeEvent && (
                    <button
                      onClick={handleExportGeoJson}
                      className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title={lang === 'es' ? 'Exportar Polígono de Evasión y Ruta en GeoJSON' : 'Export Avoidance Polygon & Route as GeoJSON'}
                    >
                      <Download className="w-2.5 h-2.5 text-cyan-400" />
                      <span>GeoJSON</span>
                    </button>
                  )}
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                      activeEvent?.routeResult.engine.includes('LIVE')
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {activeEvent
                      ? activeEvent.routeResult.engine.includes('LIVE')
                        ? 'AWS SDK LIVE'
                        : 'TURF.JS ENGINE'
                      : 'STANDBY'}
                  </span>
                </div>
              </div>

              {activeEvent ? (
                <div className="space-y-2.5">
                  {/* Live Operation Progress Bar */}
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 uppercase tracking-wide truncate">
                        {incidentPhase === 'restored'
                          ? (lang === 'es' ? 'Fase: Enlace 100% Restaurado' : 'Phase: 100% Restored')
                          : repairProgress >= 75
                          ? (lang === 'es' ? 'Fase: Empalme Óptico / ROV en Sitio' : 'Phase: Optical Splice / ROV on Site')
                          : (lang === 'es' ? 'Fase: Despacho en Ruta' : 'Phase: En Route Dispatch')}
                      </span>
                      <span className="font-bold text-cyan-300 shrink-0">
                        {incidentPhase === 'restored' ? '100%' : `${repairProgress}%`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          incidentPhase === 'restored'
                            ? 'bg-emerald-400 w-full'
                            : 'bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400'
                        }`}
                        style={{ width: `${incidentPhase === 'restored' ? 100 : Math.max(repairProgress, 5)}%` }}
                      />
                    </div>
                  </div>

                  {/* Multimodal Fleet Cards: Terrestrial Truck + Maritime Cable Ship */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-2 font-mono">
                    {/* Land Truck Unit */}
                    <div className="flex items-center justify-between bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[10px] gap-1">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-slate-200 font-bold truncate flex items-center">
                          {activeEvent.repairDepot.city}
                          <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400 shrink-0" />
                          {activeEvent.targetNode.city}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-slate-400 font-mono text-[9px] sm:text-[10px]">
                        <span className="text-emerald-300 font-bold">{activeEvent.routeResult.distanceKm} km</span>
                        <span>|</span>
                        <span>ETA {activeEvent.routeResult.durationMinutes} min</span>
                      </div>
                    </div>

                    {/* Maritime Cable Ship Unit (if submarine cut) */}
                    {activeEvent.isSubmarineCut && (
                      <div className="flex items-center justify-between bg-cyan-950/30 p-2 rounded-lg border border-cyan-500/30 text-[10px] gap-1">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <Anchor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="text-cyan-200 font-bold truncate flex items-center">
                            {lang === 'es' ? (
                              <>Puerto {activeEvent.targetNode.city} <ArrowRight className="w-3 h-3 inline mx-1 text-cyan-400 shrink-0" /> Empalme ROV Oceánico</>
                            ) : (
                              <>Port {activeEvent.targetNode.city} <ArrowRight className="w-3 h-3 inline mx-1 text-cyan-400 shrink-0" /> Oceanic ROV Splice</>
                            )}
                          </span>
                        </div>
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[9px] font-bold shrink-0">
                          CS-KIRO
                        </span>
                      </div>
                    )}

                    {/* Geocode Place Name */}
                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between gap-1">
                      <span className="text-slate-500 shrink-0">{lang === 'es' ? 'Epicentro:' : 'Epicenter:'}</span>
                      <span className="text-purple-300 font-semibold truncate ml-1 text-right max-w-[200px] sm:max-w-none" title={activeEvent.placeName}>
                        {activeEvent.placeName}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Navigation className="w-8 h-8 mx-auto mb-2 text-slate-700 animate-pulse" />
                  <p>{lang === 'es' ? 'Sin despacho de incidente activo.' : 'No active incident dispatch.'}</p>
                  <p className="text-[10px] mt-1 text-slate-600">
                    {lang === 'es'
                      ? 'Dispara un escenario o terremoto arriba para calcular el despacho vial y marítimo.'
                      : 'Trigger a scenario or earthshaker above to compute road & subsea dispatch.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BGP ROUTING & DIJKSTRA MATRIX */}
          {activeTab === 'bgp' && (
            <div className="space-y-3">
              <span className="text-slate-400 font-semibold uppercase text-[10px]">
                {lang === 'es' ? 'Malla BGP de Sistemas Autónomos y Conmutación Dijkstra' : 'Autonomous System BGP Mesh & Dijkstra Failover'}
              </span>

              {/* Active Ping Traces */}
              {(activePings.length > 0 ? activePings : (pingResult ? [pingResult] : [])).map((ping, idx) => {
                const pingId = (ping as any).id;
                return (
                  <div key={pingId || idx} className="bg-cyan-950/50 border border-cyan-500/50 rounded-xl p-3 space-y-1.5 shadow-lg shadow-cyan-950/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-cyan-400" />
                        {lang === 'es'
                          ? `Traza de Ping ${activePings.length > 1 ? `#${idx + 1}` : 'Activa'}`
                          : `Ping Trace ${activePings.length > 1 ? `#${idx + 1}` : 'Active'}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/20 font-mono text-xs shrink-0">
                          {ping.rttMs} ms
                        </span>
                        {onStopPing && (
                          <button
                            onClick={() => onStopPing(pingId)}
                            className="text-slate-400 hover:text-rose-400 p-0.5 transition cursor-pointer rounded hover:bg-rose-950/40"
                            title={lang === 'es' ? 'Detener este ping' : 'Stop this ping'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-200 font-bold text-xs truncate flex items-center" title={`${ping.originName} → ${ping.targetName}`}>
                      <span>{ping.originName}</span>
                      <ArrowRight className="w-3 h-3 inline mx-1 text-slate-400 shrink-0" />
                      <span>{ping.targetName}</span>
                    </div>
                    <div className="text-slate-300 font-mono text-[10px] bg-slate-950/60 p-1.5 rounded-lg border border-slate-800 flex items-center flex-wrap gap-y-1">
                      <span className="text-slate-500 mr-1">{lang === 'es' ? `Ruta (${ping.hops} saltos): ` : `Path (${ping.hops} hops): `}</span>
                      <span className="text-cyan-200 flex items-center flex-wrap">
                        {ping.path.map((nodeId, nodeIdx) => (
                          <React.Fragment key={nodeIdx}>
                            <span>{getNodeLabel(nodeId)}</span>
                            {nodeIdx < ping.path.length - 1 && (
                              <ArrowRight className="w-2.5 h-2.5 inline mx-0.5 text-cyan-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Incident Failover Latency & Comparison Bar */}
              {activeEvent && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">{lang === 'es' ? 'RTT Pre-Incidente BGP:' : 'BGP Pre-Incident RTT:'}</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {activeEvent.latencyBeforeMs} ms
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">{lang === 'es' ? 'RTT Conmutación Post-Corte:' : 'Post-Cut Failover RTT:'}</span>
                      <span className="text-rose-400 font-bold text-sm">
                        {activeEvent.latencyAfterMs} ms <span className="text-xs text-rose-300">(+{activeEvent.latencyAfterMs - activeEvent.latencyBeforeMs} ms)</span>
                      </span>
                    </div>
                  </div>

                  {/* Visual Latency Degradation Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>{lang === 'es' ? 'Degradación de Latencia' : 'Latency Degradation'}</span>
                      <span className="text-amber-400 font-bold">+{activeEvent.latencyAfterMs - activeEvent.latencyBeforeMs} ms</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden flex border border-slate-800">
                      <div
                        className="bg-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (activeEvent.latencyBeforeMs / activeEvent.latencyAfterMs) * 100)}%` }}
                        title={`Nominal: ${activeEvent.latencyBeforeMs}ms`}
                      />
                      <div
                        className="bg-rose-500 h-full transition-all duration-300 animate-pulse"
                        style={{ width: `${Math.max(0, 100 - (activeEvent.latencyBeforeMs / activeEvent.latencyAfterMs) * 100)}%` }}
                        title={`Delta: +${activeEvent.latencyAfterMs - activeEvent.latencyBeforeMs}ms`}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[10px] mb-1">
                      {lang === 'es' ? 'Secuencia de Saltos de Conmutación Activa:' : 'Active Failover Hop Sequence:'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {activeEvent.failoverPath.map((hop, idx) => (
                        <React.Fragment key={idx}>
                          <span className="px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/30 text-purple-200 text-[10px]">
                            {getNodeLabel(hop)}
                          </span>
                          {idx < activeEvent.failoverPath.length - 1 && (
                            <ArrowRight className="w-2.5 h-2.5 inline mx-0.5 text-slate-500 shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activePings.length === 0 && !pingResult && !activeEvent && (
                <div className="text-center py-8 text-slate-500">
                  <GitBranch className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p>{lang === 'es' ? 'Red operando en rutas nominales óptimas.' : 'Grid running optimal nominal routes.'}</p>
                  <p className="text-[10px] mt-1 text-slate-600">
                    {lang === 'es'
                      ? 'Selecciona un escenario o ejecuta el Ping Tracer para inspeccionar matrices Dijkstra.'
                      : 'Select a scenario or run Packet Ping Tracer to inspect Dijkstra path matrices.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BEDROCK SRE INCIDENT BRIEF (EXECUTIVE NOC CARDS) */}
          {activeTab === 'bedrock' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full font-bold">
                  SEVERITY-1 CRITICAL
                </span>
                <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-bold">
                  MODEL: amazon.nova-micro-v1:0
                </span>
              </div>

              {activeEvent ? (
                <div className="bg-slate-900/90 border border-purple-900/50 rounded-xl p-3 space-y-2 text-slate-300 font-sans">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800 font-mono text-xs">
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold">
                      <Terminal className="w-4 h-4" />
                      <span>{lang === 'en' ? 'Incident Post-Mortem' : 'Post-Mortem Ejecutivo'} #{activeEvent.id.slice(0, 8)}</span>
                    </div>
                    <span className="text-[9px] text-slate-500">Inference: 42ms | $0.00 USD</span>
                  </div>

                  {/* 4 Executive Blocks with Lateral Icons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {parseBedrockLines(
                      lang === 'en'
                        ? (activeEvent.aiPostMortemEn || activeEvent.aiPostMortem)
                        : (activeEvent.aiPostMortemEs || activeEvent.aiPostMortem)
                    ).map((block, idx) => (
                      <div key={idx} className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 flex items-start gap-2">
                        <div className="mt-0.5">{block.icon}</div>
                        <div className="min-w-0">
                          <span className="font-mono text-[10px] font-bold text-slate-200 block truncate">{block.title}</span>
                          <p className="text-[10px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{block.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Terminal className="w-8 h-8 mx-auto mb-2 text-slate-700" />
                  <p>{lang === 'en' ? 'Amazon Bedrock SRE Telemetry on standby.' : 'Telemetría SRE Amazon Bedrock en espera.'}</p>
                  <p className="text-[10px] mt-1 text-slate-600">
                    {lang === 'en'
                      ? 'When an incident occurs, Nova Micro generates structured executive telemetry blocks here.'
                      : 'Cuando ocurre un incidente, Nova Micro genera aquí bloques ejecutivos estructurados de post-mortem.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: APACHE ICEBERG + ATHENA SPATIAL SQL */}
          {activeTab === 'iceberg' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-semibold uppercase text-[10px]">
                  Apache Iceberg Table &amp; Athena Spatial SQL
                </span>
                <span className="text-[9px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-bold">
                  S3 PARQUET + ICEBERG v2
                </span>
              </div>

              {/* SQL Query View */}
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-[10px] text-cyan-300 overflow-x-auto space-y-0.5">
                <p className="text-slate-500">-- Amazon Athena v3 (Trino / Presto Engine)</p>
                <p className="text-purple-300">
                  <span className="text-pink-400 font-bold">SELECT</span> feature_id, feature_name, layer_type, capacity_tbps, status
                </p>
                <p className="text-purple-300">
                  <span className="text-pink-400 font-bold">FROM</span> &quot;kiro_spatial_db&quot;.&quot;global_fiber_topology&quot;
                </p>
                <p className="text-purple-300">
                  <span className="text-pink-400 font-bold">WHERE</span> <span className="text-amber-300 font-bold">ST_Intersects</span>(ST_GeometryFromText(wkt_geometry), ST_GeometryFromText(&apos;{activeEvent ? 'POLYGON_HAZARD_AVOIDANCE' : 'POLYGON_REGION_EXTENTS'}&apos;));
                </p>
              </div>

              {/* Athena Query Run Action */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <button
                  onClick={handleRunAthenaQuery}
                  disabled={isAthenaRunning}
                  className="flex-1 py-1.5 px-2 sm:px-3 bg-gradient-to-r from-cyan-950/90 to-blue-900/80 hover:from-cyan-900 hover:to-blue-800 text-cyan-200 border border-cyan-500/40 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/60 disabled:opacity-50 cursor-pointer"
                >
                  {isAthenaRunning ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
                      <span>{t.runningQuery}</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30 shrink-0" />
                      <span>{t.runAthenaQuery}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopySql}
                  className="py-1.5 px-2 sm:px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl font-bold text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer shrink-0"
                  title="Copy Athena DDL & Spatial Query"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>{copiedSql ? (lang === 'es' ? '¡Copiado!' : 'Copied!') : (lang === 'es' ? 'Copiar SQL' : 'Copy SQL')}</span>
                </button>
              </div>

              {/* Live Query Results with Responsive Grid & Scroll */}
              {athenaResult ? (
                <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-2 space-y-1.5 text-[10px]">
                  <div className="grid grid-cols-4 gap-0.5 sm:gap-1 text-center font-mono text-[8px] sm:text-[9px] pb-1 border-b border-slate-800">
                    <div className="bg-slate-950/80 p-0.5 sm:p-1 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[7px] sm:text-[8px]">RUNTIME</span>
                      <span className="font-bold text-cyan-300">{athenaResult.runtimeMs}ms</span>
                    </div>
                    <div className="bg-slate-950/80 p-0.5 sm:p-1 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[7px] sm:text-[8px]">SCANNED</span>
                      <span className="font-bold text-emerald-300">{athenaResult.scannedMb}MB</span>
                    </div>
                    <div className="bg-slate-950/80 p-0.5 sm:p-1 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[7px] sm:text-[8px]">RECORDS</span>
                      <span className="font-bold text-purple-300 truncate block">{athenaResult.records.length}c</span>
                    </div>
                    <div className="bg-slate-950/80 p-0.5 sm:p-1 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[7px] sm:text-[8px]">COST</span>
                      <span className="font-bold text-amber-300">$0.00</span>
                    </div>
                  </div>

                  <div className="max-h-28 sm:max-h-32 overflow-y-auto space-y-1 pr-1 font-mono custom-scrollbar">
                    {athenaResult.records.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-1 rounded bg-slate-950/60 border border-slate-800/80 text-[10px]"
                      >
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded shrink-0 ${r.type === 'submarine' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'}`}>
                            {r.type === 'submarine' ? 'SUB' : 'TER'}
                          </span>
                          <span className="font-bold text-slate-200 truncate max-w-[120px] sm:max-w-[170px]" title={r.name}>
                            {r.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 text-[9px] sm:text-[10px]">
                          <span className="text-slate-400">{r.capacityTbps}T</span>
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                              r.status === 'severed'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : r.status === 'rerouted'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}
                          >
                            {r.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Athena ST_Intersects spatial query evaluated with snappy compression.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
