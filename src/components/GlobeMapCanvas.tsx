import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Map as MapLibreMap, GeoJSONSource, Popup, MapMouseEvent } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  Globe,
  Mountain,
  Cloud,
  Flame,
  Truck,
  Compass,
  Scissors,
  Camera,
  Anchor,
  Unlock,
} from 'lucide-react';
import { NetworkNode, NetworkCable, FaultLine, KiroAttackEvent, ActivePing } from '../types/spatial';
import { Language, TRANSLATIONS } from '../i18n/translations';
import { snapPointToCable } from '../services/networkGraphEngine';

interface GlobeMapCanvasProps {
  coverMode?: boolean;
  lang?: Language;
  nodes: NetworkNode[];
  cables: NetworkCable[];
  faultLines: FaultLine[];
  activeEvent: KiroAttackEvent | null;
  fiberCutMode?: boolean;
  meteorMode?: boolean;
  onMapClickForFiberCut?: (coords: [number, number]) => void;
  onMapClickForMeteor?: (coords: [number, number]) => void;
  onCutCable?: (cableId: string, coords: [number, number]) => void;
  onSelectPingOrigin?: (nodeId: string) => void;
  onTracePing?: (originId: string, targetId: string) => void;
  onDispatchTruckToLocation?: (targetNodeId: string, coords: [number, number]) => void;
  onOpenIceberg?: () => void;
  onQuickRepairCable?: (cableId: string) => void;
  onTriggerStrikeAtNode?: (nodeId: string, coords: [number, number]) => void;
  onResetCameraToOrbit?: () => void;
  mapRefOut?: React.MutableRefObject<MapLibreMap | null>;
  reroutedCableIds?: string[];
  pingCableIds?: string[];
  selectedPingOrigin?: string;
  selectedPingTarget?: string;
  repairProgress?: number;
  incidentPhase?: 'idle' | 'severed' | 'repairing' | 'restored';
  pingResult?: {
    originName: string;
    targetName: string;
    path: string[];
    rttMs: number;
    hops: number;
  } | null;
  activePings?: ActivePing[];
  onStopPing?: (pingId?: string) => void;
}

export const GlobeMapCanvas: React.FC<GlobeMapCanvasProps> = ({
  coverMode = false,
  lang = 'es',
  nodes,
  cables,
  faultLines,
  activeEvent,
  fiberCutMode = false,
  meteorMode = false,
  onMapClickForFiberCut,
  onMapClickForMeteor,
  onCutCable,
  onSelectPingOrigin,
  onTracePing,
  onDispatchTruckToLocation,
  onOpenIceberg,
  onQuickRepairCable,
  onTriggerStrikeAtNode,
  onResetCameraToOrbit,
  mapRefOut,
  reroutedCableIds = [],
  pingCableIds = [],
  selectedPingOrigin,
  selectedPingTarget,
  repairProgress = 0,
  incidentPhase = 'idle',
  pingResult = null,
  activePings = [],
  onStopPing,
}) => {
  const isCutActive = fiberCutMode || meteorMode;
  const handleCutClick = onMapClickForFiberCut || onMapClickForMeteor;
  const t = TRANSLATIONS[lang];

  const isCutActiveRef = useRef(isCutActive);
  const handleCutClickRef = useRef(handleCutClick);
  const onCutCableRef = useRef(onCutCable);
  const onSelectPingOriginRef = useRef(onSelectPingOrigin);
  const onTracePingRef = useRef(onTracePing);
  const onDispatchTruckRef = useRef(onDispatchTruckToLocation);
  const onOpenIcebergRef = useRef(onOpenIceberg);
  const onQuickRepairCableRef = useRef(onQuickRepairCable);
  const onTriggerStrikeAtNodeRef = useRef(onTriggerStrikeAtNode);
  const nodesRef = useRef(nodes);
  const cablesRef = useRef(cables);
  const langRef = useRef(lang);
  langRef.current = lang;
  const activeEventRef = useRef(activeEvent);
  activeEventRef.current = activeEvent;
  const repairProgressRef = useRef(repairProgress);
  const incidentPhaseRef = useRef(incidentPhase);
  const currentPctRef = useRef(0);
  const lastEventIdRef = useRef<string | null>(null);

  isCutActiveRef.current = isCutActive;
  handleCutClickRef.current = handleCutClick;
  onCutCableRef.current = onCutCable;
  onSelectPingOriginRef.current = onSelectPingOrigin;
  onTracePingRef.current = onTracePing;
  onDispatchTruckRef.current = onDispatchTruckToLocation;
  onOpenIcebergRef.current = onOpenIceberg;
  onQuickRepairCableRef.current = onQuickRepairCable;
  onTriggerStrikeAtNodeRef.current = onTriggerStrikeAtNode;
  nodesRef.current = nodes;
  cablesRef.current = cables;
  repairProgressRef.current = repairProgress;
  incidentPhaseRef.current = incidentPhase;

  const pingResultRef = useRef(pingResult);
  pingResultRef.current = pingResult;

  const activePingsRef = useRef<ActivePing[]>([]);
  activePingsRef.current = activePings;
  const onStopPingRef = useRef(onStopPing);
  onStopPingRef.current = onStopPing;

  const selectedPingOriginRef = useRef(selectedPingOrigin);
  selectedPingOriginRef.current = selectedPingOrigin;
  const selectedPingTargetRef = useRef(selectedPingTarget);
  selectedPingTargetRef.current = selectedPingTarget;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const truckMarkerRef = useRef<maplibregl.Marker | null>(null);
  const shipMarkerRef = useRef<maplibregl.Marker | null>(null);
  const depotMarkerRef = useRef<maplibregl.Marker | null>(null);
  const spliceMarkerRef = useRef<maplibregl.Marker | null>(null);
  const subseaSpliceMarkerRef = useRef<maplibregl.Marker | null>(null);
  const restoredStartTimeRef = useRef<number | null>(null);
  const returningFleetRef = useRef<Array<{
    marker: maplibregl.Marker;
    line: GeoJSON.Feature<GeoJSON.LineString>;
    currentKm: number;
    speedKmPerFrame: number;
    isShip: boolean;
  }>>([]);
  const lastTruckLineRef = useRef<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const lastShipLineRef = useRef<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const fleetSeqRef = useRef<number>(1);
  const truckAnimationRef = useRef<number | null>(null);
  const pingPacketMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pingPacketMarkersMapRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const pingAnimationRef = useRef<number | null>(null);
  const pingTargetMarkerRef = useRef<maplibregl.Marker | null>(null);
  const pingOriginMarkerRef = useRef<maplibregl.Marker | null>(null);
  const activePopupRef = useRef<Popup | null>(null);
  const activeVehiclePopupTargetRef = useRef<'truck' | 'ship' | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const showActionHudRef = useRef<(
    coords: [number, number],
    context?: { directNode?: NetworkNode; directCable?: NetworkCable },
    forceExpand?: boolean,
    hudMode?: 'actions' | 'ping',
    isInverted?: boolean,
    initialTargetId?: string
  ) => void>(() => {});
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [mapBearing, setMapBearing] = useState<number>(0);
  const [mapPitch, setMapPitch] = useState<number>(0);

  // Layer Filter States (Default: all active)
  const [showSubmarine, setShowSubmarine] = useState(true);
  const [showTerrestrial, setShowTerrestrial] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [showFaults, setShowFaults] = useState(true);
  const [showRepairRoutes, setShowRepairRoutes] = useState(true);

  // 3D Tactical Drone Camera Tracking State: 'truck' | 'ship' | 'overview' | 'free'
  const [trackingMode, setTrackingMode] = useState<'truck' | 'ship' | 'overview' | 'free'>('free');
  const trackingModeRef = useRef<'truck' | 'ship' | 'overview' | 'free'>('free');
  trackingModeRef.current = trackingMode;
  const lastTrackingEaseTimeRef = useRef<number>(0);
  const dispatchStartTimeRef = useRef<number>(0);

  // Vehicles presence check for HUD controls & follow camera
  const vehicleRouteCoords = activeEvent?.routeResult?.coordinates || [];
  const vehicleMaritimeCoords = activeEvent?.maritimeRouteCoords || [];
  const shouldShowVehicles = Boolean(
    vehicleRouteCoords.length > 1 &&
    showRepairRoutes &&
    activeEvent &&
    incidentPhase !== 'idle'
  );
  const hasMaritimeVehicle = Boolean(vehicleMaritimeCoords.length > 1);

  const handleSelectTracking = (target: 'truck' | 'ship' | 'overview' | 'free') => {
    trackingModeRef.current = target;
    setTrackingMode(target);
    dispatchStartTimeRef.current = 0; // immediate follow on click
    const map = mapRef.current;
    if (!map) return;

    if (target === 'truck') {
      lastTrackingEaseTimeRef.current = performance.now() + 1050;
      if (truckMarkerRef.current) {
        const currLngLat = truckMarkerRef.current.getLngLat();
        map.flyTo({
          center: [currLngLat.lng, currLngLat.lat],
          zoom: 9.8,
          pitch: 52,
          bearing: -15,
          duration: 1000,
        });
      }
    } else if (target === 'ship') {
      lastTrackingEaseTimeRef.current = performance.now() + 1050;
      if (shipMarkerRef.current) {
        const currLngLat = shipMarkerRef.current.getLngLat();
        map.flyTo({
          center: [currLngLat.lng, currLngLat.lat],
          zoom: 9.6,
          pitch: 52,
          bearing: -15,
          duration: 1000,
        });
      }
    } else if (target === 'overview') {
      lastTrackingEaseTimeRef.current = performance.now() + 2050;
      const truckCoords = activeEvent?.routeResult?.coordinates || [];
      const shipCoords = activeEvent?.maritimeRouteCoords || [];
      const allCoords = [...truckCoords, ...shipCoords];
      if (allCoords.length > 1) {
        const lngs = allCoords.map((c) => c[0]);
        const lats = allCoords.map((c) => c[1]);
        const bottomPad = typeof window !== 'undefined' && window.innerHeight < 768 ? 160 : 200;
        const rightPad = typeof window !== 'undefined' && window.innerWidth < 1024 ? 100 : 220;
        map.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          {
            padding: { top: 120, bottom: bottomPad, left: 300, right: rightPad },
            pitch: 52,
            bearing: -15,
            duration: 1200,
            maxZoom: 10.5,
          }
        );
      }
    }
  };
  const handleSelectTrackingRef = useRef(handleSelectTracking);
  handleSelectTrackingRef.current = handleSelectTracking;

  // --- NOC TARGET BEACON & RADAR RIPPLE WAVES ---
  const updatePingTargetBeacon = (targetCoords: [number, number], labelText: string) => {
    const map = mapRef.current;
    if (!map) return;

    if (!pingTargetMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'ping-target-beacon pointer-events-none select-none';
      el.innerHTML = `
        <div class="relative flex items-center justify-center w-16 h-16">
          <!-- Concentric 3-stage radar ripple waves radiating outward -->
          <div class="absolute inset-0 rounded-full border-2 border-cyan-400/80 animate-radar-wave-1 pointer-events-none"></div>
          <div class="absolute inset-0 rounded-full border-2 border-sky-400/70 animate-radar-wave-2 pointer-events-none"></div>
          <div class="absolute inset-0 rounded-full border border-teal-300/60 animate-radar-wave-3 pointer-events-none"></div>

          <!-- Crosshair reticle accents -->
          <div class="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none"></div>
          <div class="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent pointer-events-none"></div>

          <!-- Inner radar scanning halo -->
          <div class="absolute inset-3 rounded-full bg-cyan-500/20 border border-cyan-400/50 animate-pulse pointer-events-none"></div>

          <!-- Central luminous targeting core point -->
          <div class="relative flex items-center justify-center w-4 h-4 rounded-full bg-cyan-300 border-2 border-white shadow-[0_0_16px_#00F0FF,0_0_30px_rgba(34,211,238,0.95)] z-10">
            <div class="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#FFF]"></div>
          </div>

          <!-- Tactical HUD Destination Badge -->
          <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-[#0B0F19]/95 border border-cyan-400/80 text-cyan-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl backdrop-blur-md flex items-center gap-1.5 z-20">
            <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span id="beacon-text">${labelText}</span>
          </div>
        </div>
      `;
      pingTargetMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(targetCoords)
        .addTo(map);
    } else {
      pingTargetMarkerRef.current.setLngLat(targetCoords);
      const textEl = pingTargetMarkerRef.current.getElement().querySelector('#beacon-text');
      if (textEl) textEl.textContent = labelText;
    }
  };

  const clearPingTargetBeacon = () => {
    if (pingTargetMarkerRef.current) {
      pingTargetMarkerRef.current.remove();
      pingTargetMarkerRef.current = null;
    }
  };

  const updatePingOriginBeacon = (originCoords: [number, number], labelText: string) => {
    const map = mapRef.current;
    if (!map) return;

    if (!pingOriginMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'ping-origin-beacon pointer-events-none select-none';
      el.innerHTML = `
        <div class="relative flex items-center justify-center w-16 h-16">
          <!-- Concentric 3-stage radar ripple waves in emerald green -->
          <div class="absolute inset-0 rounded-full border-2 border-emerald-400/80 animate-radar-wave-1 pointer-events-none"></div>
          <div class="absolute inset-0 rounded-full border-2 border-green-400/70 animate-radar-wave-2 pointer-events-none"></div>
          <div class="absolute inset-0 rounded-full border border-teal-300/60 animate-radar-wave-3 pointer-events-none"></div>

          <!-- Crosshair reticle accents -->
          <div class="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent pointer-events-none"></div>
          <div class="absolute h-full w-[1px] bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent pointer-events-none"></div>

          <!-- Inner radar scanning halo -->
          <div class="absolute inset-3 rounded-full bg-emerald-500/20 border border-emerald-400/50 animate-pulse pointer-events-none"></div>

          <!-- Central luminous origin core point -->
          <div class="relative flex items-center justify-center w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_16px_#10B981,0_0_30px_rgba(16,185,129,0.95)] z-10">
            <div class="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_#FFF]"></div>
          </div>

          <!-- Tactical HUD Origin Badge -->
          <div class="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-[#0B0F19]/95 border border-emerald-400/80 text-emerald-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl backdrop-blur-md flex items-center gap-1.5 z-20">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span id="origin-beacon-text">${labelText}</span>
          </div>
        </div>
      `;
      pingOriginMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(originCoords)
        .addTo(map);
    } else {
      pingOriginMarkerRef.current.setLngLat(originCoords);
      const textEl = pingOriginMarkerRef.current.getElement().querySelector('#origin-beacon-text');
      if (textEl) textEl.textContent = labelText;
    }
  };

  const clearPingOriginBeacon = () => {
    if (pingOriginMarkerRef.current) {
      pingOriginMarkerRef.current.remove();
      pingOriginMarkerRef.current = null;
    }
  };

  // --- UNIFIED PING BEACONS PERSISTENCE ENGINE ---
  const syncPingBeacons = useCallback(() => {
    const curNodes = nodesRef.current;
    const curLang = langRef.current;
    const curOriginId = selectedPingOriginRef.current;
    const curTargetId = selectedPingTargetRef.current;
    const pings = activePingsRef.current;
    const result = pingResultRef.current;

    // 1. If active pings are executing, anchor wave beacons to its endpoints
    if (pings && pings.length > 0 && pings[0].path && pings[0].path.length >= 2) {
      const origNode = curNodes.find((n) => n.id === pings[0].path[0]);
      if (origNode) {
        const label = curLang === 'en' ? `ORIGIN: ${origNode.city || origNode.name}` : `ORIGEN: ${origNode.city || origNode.name}`;
        updatePingOriginBeacon(origNode.coordinates, label);
      }
      const targetNode = curNodes.find((n) => n.id === pings[0].path[pings[0].path.length - 1]);
      if (targetNode) {
        const label = curLang === 'en' ? `TARGET: ${targetNode.city || targetNode.name}` : `DESTINO: ${targetNode.city || targetNode.name}`;
        updatePingTargetBeacon(targetNode.coordinates, label);
      }
      return;
    }

    if (result && result.path && result.path.length >= 2) {
      const origNode = curNodes.find((n) => n.id === result.path[0]);
      if (origNode) {
        const label = curLang === 'en' ? `ORIGIN: ${origNode.city || origNode.name}` : `ORIGEN: ${origNode.city || origNode.name}`;
        updatePingOriginBeacon(origNode.coordinates, label);
      }
      const targetNode = curNodes.find((n) => n.id === result.path[result.path.length - 1]);
      if (targetNode) {
        const label = curLang === 'en' ? `TARGET: ${targetNode.city || targetNode.name}` : `DESTINO: ${targetNode.city || targetNode.name}`;
        updatePingTargetBeacon(targetNode.coordinates, label);
      }
      return;
    }

    // 2. Default: maintain persistent radar ripple waves on the selected origin and target
    if (curOriginId) {
      const origNode = curNodes.find((n) => n.id === curOriginId);
      if (origNode) {
        const label = curLang === 'en' ? `ORIGIN: ${origNode.city || origNode.name}` : `ORIGEN: ${origNode.city || origNode.name}`;
        updatePingOriginBeacon(origNode.coordinates, label);
      } else {
        clearPingOriginBeacon();
      }
    } else {
      clearPingOriginBeacon();
    }

    if (curTargetId) {
      const targetNode = curNodes.find((n) => n.id === curTargetId);
      if (targetNode) {
        const label = curLang === 'en' ? `TARGET: ${targetNode.city || targetNode.name}` : `DESTINO: ${targetNode.city || targetNode.name}`;
        updatePingTargetBeacon(targetNode.coordinates, label);
      } else {
        clearPingTargetBeacon();
      }
    } else {
      clearPingTargetBeacon();
    }
  }, []);

  const syncPingBeaconsRef = useRef(syncPingBeacons);
  syncPingBeaconsRef.current = syncPingBeacons;

  // --- ZOOM-ADAPTIVE UNIVERSAL ACTION HUD / CONTEXT MENU ---
  const showActionHud = (
    coords: [number, number],
    context?: { directNode?: NetworkNode; directCable?: NetworkCable },
    forceExpand?: boolean,
    hudMode: 'actions' | 'ping' = 'actions',
    isInverted = false,
    initialTargetId = 'aws-us-east-1'
  ) => {
    const map = mapRef.current;
    if (!map) return;

    // Anti-flapping: Debounce rapid consecutive clicks (< 70ms)
    const now = performance.now();
    if (now - lastClickTimeRef.current < 70) return;
    lastClickTimeRef.current = now;

    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }

    const currentNodes = nodesRef.current;
    const currentCables = cablesRef.current;
    const point = turf.point(coords);

    // 1. Determine nearest or direct node
    let nearestNode: NetworkNode = currentNodes[0];
    let minNodeDist = Infinity;
    if (context?.directNode) {
      nearestNode = context.directNode;
      minNodeDist = 0;
    } else {
      // Prioritize primary network nodes (IXPs, landing stations, AWS regions) over maintenance depots
      const networkOnlyNodes = currentNodes.filter((n) => n.type !== 'depot');
      const searchPool = networkOnlyNodes.length > 0 ? networkOnlyNodes : currentNodes;
      for (const n of searchPool) {
        const d = turf.distance(point, turf.point(n.coordinates), { units: 'kilometers' });
        if (d < minNodeDist) {
          minNodeDist = d;
          nearestNode = n;
        }
      }
    }

    // 2. Determine nearest or direct cable
    let nearestCable: NetworkCable = currentCables[0];
    let minCableDist = Infinity;
    if (context?.directCable) {
      nearestCable = context.directCable;
      minCableDist = 0;
    } else {
      for (const c of currentCables) {
        const line = turf.lineString(c.coordinates);
        const d = turf.pointToLineDistance(point, line, { units: 'kilometers' });
        if (d < minCableDist) {
          minCableDist = d;
          nearestCable = c;
        }
      }
    }

    // Strict click threshold: if click is in empty ocean/remote land (> 350 km from any node or cable) and not direct, ignore
    if (!context?.directNode && !context?.directCable && minNodeDist > 350 && minCableDist > 350) {
      return;
    }

    const isNodePrimary = Boolean(context?.directNode || (!context?.directCable && minNodeDist <= minCableDist));

    // Coordinates formatting
    const lat = coords[1];
    const lng = coords[0];
    const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
    const coordsBadge = `${latStr}, ${lngStr}`;

    // Header title
    let headerTitle = coordsBadge;
    if (context?.directNode) {
      headerTitle = nearestNode.name;
    } else if (context?.directCable) {
      headerTitle = nearestCable.name;
    } else if (isNodePrimary) {
      headerTitle = nearestNode.name;
    } else {
      headerTitle = nearestCable.name;
    }

    // Cable telemetry
    const cableStatus = (nearestCable?.status || 'healthy').toUpperCase();
    const cableStatusColor =
      cableStatus === 'SEVERED'
        ? 'text-rose-400 bg-rose-500/20'
        : cableStatus === 'REROUTED'
        ? 'text-amber-400 bg-amber-500/20'
        : 'text-emerald-400 bg-emerald-500/20';

    const cableDistLabel = minCableDist === 0 ? (lang === 'en' ? 'Direct target' : 'Objetivo directo') : `${Math.round(minCableDist)} km`;
    const nodeDistLabel = minNodeDist === 0 ? (lang === 'en' ? 'At node' : 'En el nodo') : `${Math.round(minNodeDist)} km`;

    // Is cut mode currently active?
    const isCutActiveNow = isCutActiveRef.current;

    // Zoom adaptation: In orbit / planetary space (zoom < 4.0), render ultra-compact HUD
    const currentZoom = map.getZoom();
    const isCompact = !forceExpand && currentZoom < 4.0;
    const isSevered = nearestCable?.status === 'severed';

    // Compact Template: ~240px wide, adaptive height with screen clamping
    const compactHtml = `
      <div class="p-2.5 bg-slate-950/95 text-slate-100 rounded-xl border ${
        isSevered ? 'border-rose-500/60 ring-1 ring-rose-500/30' : 'border-cyan-500/40'
      } font-sans shadow-2xl text-xs w-[240px] max-w-[calc(100vw-36px)] max-h-[min(340px,calc(100vh-230px))] overflow-y-auto backdrop-blur-xl custom-scrollbar">
        ${
          activePingsRef.current.length > 0
            ? `
          <div class="mb-1.5 px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-500/40 rounded text-cyan-300 font-mono text-[9px] flex items-center justify-between">
            <span class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>${activePingsRef.current.length} ${lang === 'en' ? 'pings live' : 'pings activos'}</span>
            </span>
            <button data-hud-action="stop-ping" class="text-rose-400 hover:text-rose-300 font-bold cursor-pointer">
              ${lang === 'en' ? 'Stop' : 'Parar'}
            </button>
          </div>
        `
            : ''
        }
        ${
          isCutActiveNow
            ? `
          <div class="mb-1.5 px-1.5 py-0.5 bg-rose-500/20 border border-rose-500/50 rounded text-rose-300 font-mono text-[9px] flex items-center justify-between animate-pulse">
            <span class="font-bold flex items-center gap-1">${lang === 'en' ? 'CUT MODE' : 'MODO CORTE'}</span>
            <span>${lang === 'en' ? 'Confirm below' : 'Confirma abajo'}</span>
          </div>
        `
            : ''
        }
        <div class="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800 text-[11px] pr-10">
          <div class="flex items-center gap-1 min-w-0 pr-1">
            <span class="w-1.5 h-1.5 rounded-full ${isSevered ? 'bg-rose-500 animate-ping' : 'bg-cyan-400 animate-pulse'} shrink-0"></span>
            <span class="font-bold text-slate-100 text-[11px] truncate" title="${headerTitle}">
              ${headerTitle}
            </span>
          </div>
          <button data-hud-action="toggle-expand" class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-cyan-300 shrink-0 border border-slate-700 transition cursor-pointer" title="${lang === 'en' ? 'Expand full telemetry' : 'Expandir telemetría completa'}">
            ${lang === 'en' ? '[+]' : '[+]'}
          </button>
        </div>

        <div class="text-[10px] font-mono bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 mb-2 flex items-center justify-between">
          <span class="font-bold truncate max-w-[130px] ${isSevered ? 'text-rose-400 animate-pulse' : 'text-amber-300'}" title="${nearestCable?.name || 'N/A'}">
            ${nearestCable?.name || 'N/A'}
          </span>
          <span class="text-slate-400 text-[9px] shrink-0">${cableDistLabel}</span>
        </div>

        ${
          isSevered
            ? `
          <div class="grid grid-cols-3 gap-1">
            <button data-hud-action="truck" class="py-1.5 px-1 bg-gradient-to-b from-emerald-950/90 to-teal-900/80 hover:from-emerald-900 hover:to-teal-800 text-emerald-100 border border-emerald-500/50 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition shadow-sm cursor-pointer" title="${lang === 'en' ? 'Dispatch Repair Crew' : 'Despachar Cuadrilla de Reparación'}">
              <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
              <span>${lang === 'en' ? 'Crew' : 'Cuadrilla'}</span>
            </button>
            <button data-hud-action="repair" class="py-1.5 px-1 bg-gradient-to-b from-amber-950/90 to-yellow-900/80 hover:from-amber-900 hover:to-yellow-800 text-amber-100 border border-amber-500/50 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition shadow-sm cursor-pointer" title="${lang === 'en' ? 'Complete Splice and Restore' : 'Completar Fusión y Restaurar'}">
              <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span>${lang === 'en' ? 'Splice' : 'Fusionar'}</span>
            </button>
            <button data-hud-action="ping" class="py-1.5 px-1 bg-gradient-to-b from-cyan-950/90 to-blue-900/80 hover:from-cyan-900 hover:to-blue-800 text-cyan-100 border border-cyan-500/50 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition shadow-sm cursor-pointer" title="${lang === 'en' ? 'View BGP Failover Reroute' : 'Ver Desvío BGP de Contingencia'}">
              <svg class="w-3.5 h-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/></svg>
              <span>BGP</span>
            </button>
          </div>
        `
            : `
          <div class="grid grid-cols-3 gap-1">
            <button data-hud-action="cut" class="py-1.5 px-1 bg-gradient-to-b from-rose-950/90 to-red-900/80 hover:from-rose-900 hover:to-red-800 text-rose-100 border ${
              isCutActiveNow ? 'border-rose-400 ring-1 ring-rose-500/50' : 'border-rose-500/50'
            } rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition shadow-sm cursor-pointer" title="${lang === 'en' ? 'Simulate Physical Cut' : 'Simular Corte Físico'}">
              <svg class="w-3.5 h-3.5 text-rose-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
              <span>${lang === 'en' ? 'Cut' : 'Cortar'}</span>
            </button>

            <button data-hud-action="ping" class="py-1.5 px-1 bg-gradient-to-b from-cyan-950/90 to-blue-900/80 hover:from-cyan-900 hover:to-blue-800 text-cyan-100 border border-cyan-500/50 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition shadow-sm cursor-pointer" title="${lang === 'en' ? 'Trace BGP Route (Dijkstra)' : 'Trazar Ruta BGP (Ping Dijkstra)'}">
              <svg class="w-3.5 h-3.5 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/></svg>
              <span>Ping</span>
            </button>

            <button data-hud-action="iceberg" class="py-1.5 px-1 bg-gradient-to-b from-amber-950/90 to-orange-900/80 hover:from-amber-900 hover:to-orange-800 text-amber-100 border border-amber-500/50 rounded-lg font-bold text-[10px] flex flex-col items-center justify-center gap-0.5 transition shadow-sm cursor-pointer" title="${lang === 'en' ? 'Query S3 Lakehouse Partitions' : 'Consultar Particiones en S3 Lakehouse'}">
              <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
              <span>Iceberg</span>
            </button>
          </div>
        `
        }
      </div>
    `;

    // Detailed Template: ~305px wide with adaptive height and screen clamping
    const detailedHtml = `
      <div class="p-3 bg-slate-950/95 text-slate-100 rounded-2xl border ${
        isSevered ? 'border-rose-500/60 ring-1 ring-rose-500/30' : 'border-cyan-500/40'
      } font-sans shadow-2xl text-xs w-[305px] max-w-[calc(100vw-36px)] max-h-[min(350px,calc(100vh-230px))] overflow-y-auto backdrop-blur-xl custom-scrollbar">
        ${
          activePingsRef.current.length > 0
            ? `
          <div class="mb-2 px-2 py-1 bg-cyan-950/80 border border-cyan-500/40 rounded-xl text-cyan-300 font-mono text-[10px] flex items-center justify-between">
            <span class="flex items-center gap-1.5 font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>${lang === 'en' ? `Active Pings: ${activePingsRef.current.length}` : `Pings Activos: ${activePingsRef.current.length}`}</span>
            </span>
            <button data-hud-action="stop-ping" class="text-rose-400 hover:text-rose-300 font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 hover:bg-rose-900 transition cursor-pointer">
              ${lang === 'en' ? 'Stop All' : 'Detener'}
            </button>
          </div>
        `
            : ''
        }
        ${
          isCutActiveNow
            ? `
          <div class="mb-2 px-2 py-1 bg-rose-500/20 border border-rose-500/50 rounded-lg text-rose-300 font-mono text-[10px] flex items-center justify-between animate-pulse">
            <span class="font-bold flex items-center gap-1">${lang === 'en' ? 'CUT MODE ACTIVE' : 'MODO CORTE ACTIVO'}</span>
            <span>${lang === 'en' ? 'Confirm target' : 'Confirma el objetivo'}</span>
          </div>
        `
            : ''
        }
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 pr-10">
          <div class="flex items-center gap-1.5 min-w-0 pr-1">
            <span class="w-2 h-2 rounded-full ${isSevered ? 'bg-rose-500 animate-ping' : 'bg-cyan-400 animate-pulse'} shrink-0"></span>
            <span class="font-bold text-slate-100 text-xs truncate" title="${headerTitle}">
              ${headerTitle}
            </span>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
              ${coordsBadge}
            </span>
            ${
              currentZoom < 4.0
                ? `
              <button data-hud-action="toggle-expand" class="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer" title="${lang === 'en' ? 'Compact mode' : 'Modo compacto'}">
                [-]
              </button>
            `
                : ''
            }
          </div>
        </div>

        <div class="space-y-1 mb-2.5 bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-[11px] font-mono">
          ${
            isNodePrimary
              ? `
            <div class="flex items-center justify-between text-slate-300">
              <span class="text-slate-500 text-[10px] uppercase">${lang === 'en' ? 'Node' : 'Nodo'}:</span>
              <span class="font-bold truncate max-w-[170px] text-purple-300" title="${nearestNode?.name || 'N/A'}">
                ${nearestNode?.name || 'N/A'}
              </span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>${lang === 'en' ? 'Region/City' : 'Región/Ciudad'}: <b class="text-slate-200">${nearestNode?.city || nearestNode?.name}</b></span>
              <span class="px-1 py-0.2 rounded text-[9px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30">${nearestNode?.type.toUpperCase()}</span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span class="truncate max-w-[170px]">${lang === 'en' ? 'Fiber Trunk:' : 'Troncal Fibra:'} <b class="${isSevered ? 'text-rose-400' : 'text-amber-300'}">${nearestCable?.name || 'N/A'}</b></span>
              <span class="text-slate-300 font-semibold">${cableDistLabel}</span>
            </div>
          `
              : `
            <div class="flex items-center justify-between text-slate-300">
              <span class="text-slate-500 text-[10px] uppercase">${lang === 'en' ? 'Cable:' : 'Cable:'}</span>
              <span class="font-bold truncate max-w-[170px] ${isSevered ? 'text-rose-400 animate-pulse' : 'text-amber-300'}" title="${nearestCable?.name || 'N/A'}">
                ${nearestCable?.name || 'N/A'}
              </span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>${lang === 'en' ? 'Capacity:' : 'Capacidad:'} <b class="text-slate-200">${isSevered ? '0 (OFFLINE)' : `${nearestCable?.capacityTbps || 40} Tbps`}</b></span>
              <span class="px-1 py-0.2 rounded text-[9px] font-bold ${cableStatusColor}">${cableStatus}</span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span class="truncate max-w-[170px]">${lang === 'en' ? 'Terminal Node:' : 'Nodo Terminal:'} <b class="text-purple-300">${nearestNode?.name || 'N/A'}</b></span>
              <span class="text-slate-400">${nodeDistLabel}</span>
            </div>
          `
          }
        </div>

        ${
          isSevered
            ? `
          <div class="flex flex-col gap-1.5">
            <button data-hud-action="truck" class="w-full py-2 px-2.5 bg-gradient-to-r from-emerald-950/90 to-teal-900/80 hover:from-emerald-900 hover:to-teal-800 text-emerald-100 border border-emerald-500/60 rounded-xl font-bold text-[11px] transition shadow-md shadow-emerald-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                <span>${lang === 'en' ? 'Dispatch AWS Repair Crew' : 'Despachar Cuadrilla de Reparación AWS'}</span>
              </div>
              <span class="text-[9px] font-mono text-emerald-300/80 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/20">${lang === 'en' ? 'Road Route' : 'Ruta Vial'}</span>
            </button>

            <button data-hud-action="repair" class="w-full py-2 px-2.5 bg-gradient-to-r from-amber-950/90 to-yellow-900/80 hover:from-amber-900 hover:to-yellow-800 text-amber-100 border border-amber-500/50 rounded-xl font-bold text-[11px] transition shadow-md shadow-amber-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>${lang === 'en' ? 'Immediate Fiber Splicing' : 'Empalme Inmediato de Fibra'}</span>
              </div>
              <span class="text-[9px] font-mono text-amber-300/80 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/20">100% Red</span>
            </button>

            <button data-hud-action="ping" class="w-full py-2 px-2.5 bg-gradient-to-r from-cyan-950/90 to-blue-900/80 hover:from-cyan-900 hover:to-blue-800 text-cyan-100 border border-cyan-500/50 rounded-xl font-bold text-[11px] transition shadow-md shadow-cyan-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/></svg>
                <span>${lang === 'en' ? 'Trace Active BGP Contingency' : 'Trazar Contingencia BGP Activa'}</span>
              </div>
              <span class="text-[9px] font-mono text-cyan-300/80 bg-cyan-950/80 px-1 py-0.5 rounded border border-cyan-500/20">Dijkstra</span>
            </button>
          </div>
        `
            : isNodePrimary
            ? `
          <div class="flex flex-col gap-1.5">
            <button data-hud-action="ping" class="w-full py-2 px-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white rounded-xl font-bold text-[11px] transition shadow-md shadow-cyan-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-cyan-200 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/></svg>
                <span>${lang === 'en' ? 'Trace BGP Route (Ping)' : 'Trazar Ruta BGP (Ping)'}</span>
              </div>
              <span class="text-[9px] font-mono text-cyan-100 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-400/30">Dijkstra</span>
            </button>

            <button data-hud-action="iceberg" class="w-full py-2 px-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-amber-950/80 hover:to-slate-800 text-amber-200 border border-slate-700 hover:border-amber-500/40 rounded-xl font-semibold text-[11px] transition flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                <span>${lang === 'en' ? 'Inspect Region in Iceberg' : 'Inspeccionar Región en Iceberg'}</span>
              </div>
              <span class="text-[9px] font-mono text-amber-300/80 bg-amber-950/60 px-1 py-0.5 rounded border border-amber-500/20">Data Lake</span>
            </button>

            <button data-hud-action="cut" class="w-full py-2 px-2.5 bg-slate-900/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-200 border border-slate-800 hover:border-rose-500/40 rounded-xl font-medium text-[11px] transition flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                <span>${lang === 'en' ? 'Sever Connected Fiber' : 'Cortar Fibra Conectada'}</span>
              </div>
              <span class="text-[9px] font-mono text-rose-300/80 bg-rose-950/60 px-1 py-0.5 rounded border border-rose-500/20">${lang === 'en' ? 'Red Zone' : 'Zona Roja'}</span>
            </button>
          </div>
        `
            : `
          <div class="flex flex-col gap-1.5">
            <button data-hud-action="cut" class="w-full py-2 px-2.5 bg-gradient-to-r from-rose-950/90 to-red-900/80 hover:from-rose-900 hover:to-red-800 text-rose-100 border ${
              isCutActiveNow ? 'border-rose-400 ring-2 ring-rose-500/50' : 'border-rose-500/50'
            } rounded-xl font-bold text-[11px] transition shadow-md shadow-rose-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
                <span>${lang === 'en' ? 'Simulate Physical Cut' : 'Simular Corte Físico'}</span>
              </div>
              <span class="text-[9px] font-mono text-rose-300/80 bg-rose-950/80 px-1 py-0.5 rounded border border-rose-500/20">${lang === 'en' ? 'Red Zone' : 'Zona Roja'}</span>
            </button>

            <button data-hud-action="ping" class="w-full py-2 px-2.5 bg-gradient-to-r from-cyan-950/90 to-blue-900/80 hover:from-cyan-900 hover:to-blue-800 text-cyan-100 border border-cyan-500/50 rounded-xl font-bold text-[11px] transition shadow-md shadow-cyan-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/></svg>
                <span>${lang === 'en' ? 'Trace BGP Route (Ping)' : 'Trazar Ruta BGP (Ping)'}</span>
              </div>
              <span class="text-[9px] font-mono text-cyan-300/80 bg-cyan-950/80 px-1 py-0.5 rounded border border-cyan-500/20">Dijkstra</span>
            </button>

            <button data-hud-action="iceberg" class="w-full py-2 px-2.5 bg-gradient-to-r from-amber-950/90 to-orange-900/80 hover:from-amber-900 hover:to-orange-800 text-amber-100 border border-amber-500/50 rounded-xl font-bold text-[11px] transition shadow-md shadow-amber-950/60 flex items-center justify-between group cursor-pointer">
              <div class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
                <span>${lang === 'en' ? 'Inspect in S3 Iceberg' : 'Inspeccionar en Iceberg S3'}</span>
              </div>
              <span class="text-[9px] font-mono text-amber-300/80 bg-amber-950/80 px-1 py-0.5 rounded border border-amber-500/20">Data Lake</span>
            </button>
          </div>
        `
        }
      </div>
    `;

    // Ping Planner Container Template: Dynamic two-step wizard with adaptive scrolling
    const pingPlannerHtml = `
      <div id="hud-ping-container" class="p-3 bg-slate-950/95 text-slate-100 rounded-2xl border border-cyan-500/50 font-sans shadow-2xl text-xs w-[310px] max-w-[calc(100vw-36px)] max-h-[min(360px,calc(100vh-230px))] overflow-y-auto backdrop-blur-xl custom-scrollbar"></div>
    `;

    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 420;
    const popupMaxWidth = hudMode === 'ping'
      ? (isSmallScreen ? 'min(290px, 92vw)' : 'min(330px, 92vw)')
      : (isSmallScreen ? (isCompact ? 'min(220px, 85vw)' : 'min(280px, 90vw)') : (isCompact ? 'min(250px, 85vw)' : 'min(320px, 92vw)'));

    const initialPopupCoords = hudMode === 'ping'
      ? (nearestNode ? nearestNode.coordinates : coords)
      : coords;

    const popup = new maplibregl.Popup({
      className: 'kiro-noc-popup',
      closeButton: true,
      maxWidth: popupMaxWidth,
      offset: 16,
      anchor: 'bottom',
    })
      .setLngLat(initialPopupCoords)
      .setHTML(hudMode === 'ping' ? pingPlannerHtml : (isCompact ? compactHtml : detailedHtml))
      .addTo(map);

    popup.on('close', () => {
      activePopupRef.current = null;
      syncPingBeaconsRef.current?.();
    });

    activePopupRef.current = popup;

    // Scoped event binding to this exact popup DOM element (immune to race conditions)
    const popupEl = popup.getElement();
    if (popupEl) {
      if (hudMode === 'ping') {
        let currentOriginId = nearestNode.id;
        let currentDestId = initialTargetId;
        if (currentDestId === currentOriginId) {
          currentDestId = currentOriginId === 'aws-us-east-1' ? 'aws-sa-east-1' : 'aws-us-east-1';
        }
        let isDestCentered = false;

        const container = popupEl.querySelector<HTMLDivElement>('#hud-ping-container');

        const topNodePresets = [
          { id: 'aws-us-east-1', name: 'Virginia' },
          { id: 'aws-sa-east-1', name: 'São Paulo' },
          { id: 'aws-ap-northeast-1', name: 'Tokyo' },
          { id: 'aws-eu-west-1', name: 'Irlanda' },
          { id: 'aws-us-west-2', name: 'Oregón' },
          { id: 'cls-fortaleza', name: 'Fortaleza' },
        ];

        const centerOnNode = (targetCoords: [number, number], zoom = 3.8) => {
          if (!map) return;
          popup.setLngLat(targetCoords);
          map.flyTo({
            center: targetCoords,
            zoom,
            pitch: 30,
            duration: 1100,
          });
        };

        const renderPingStep = (step: 'origin' | 'dest', shouldCenter = true) => {
          if (!container) return;
          const originNode = currentNodes.find((n) => n.id === currentOriginId) || nearestNode;
          const destNode = currentNodes.find((n) => n.id === currentDestId) || (currentNodes.find((n) => n.id !== currentOriginId) || currentNodes[0]);

          if (step === 'origin') {
            isDestCentered = false;
            // STEP 1: ORIGIN ONLY VIEW
            updatePingOriginBeacon(
              originNode.coordinates,
              lang === 'en' ? `ORIGIN: ${originNode.city || originNode.name}` : `ORIGEN: ${originNode.city || originNode.name}`
            );
            clearPingTargetBeacon();

            if (shouldCenter) {
              centerOnNode(originNode.coordinates);
            }

            const allOriginNodesHtml = `
              <optgroup label="${t.controlDeck.groupAwsRegions}" class="bg-slate-950 text-amber-400 font-bold">
                ${currentNodes.filter((n) => n.type === 'aws_region').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentOriginId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
              <optgroup label="${t.controlDeck.groupLandingStations}" class="bg-slate-950 text-cyan-400 font-bold">
                ${currentNodes.filter((n) => n.type === 'landing_station').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentOriginId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
              <optgroup label="${t.controlDeck.groupIxps}" class="bg-slate-950 text-purple-400 font-bold">
                ${currentNodes.filter((n) => n.type === 'ixp').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentOriginId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
              <optgroup label="${t.controlDeck.groupDepots}" class="bg-slate-950 text-emerald-400 font-bold">
                ${currentNodes.filter((n) => n.type === 'depot').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentOriginId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
            `;

            container.innerHTML = `
              <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 pr-10">
                <div class="flex items-center gap-2 min-w-0">
                  <button data-hud-action="back" class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700 flex items-center gap-1 shrink-0" title="${lang === 'en' ? 'Back to actions' : 'Volver a acciones'}">
                    <svg class="w-2.5 h-2.5 stroke-slate-300 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    <span>${lang === 'en' ? 'Back' : 'Volver'}</span>
                  </button>
                  <div class="flex items-center gap-1.5 min-w-0 truncate">
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                    <span class="font-bold text-emerald-300 text-xs truncate">${lang === 'en' ? 'Step 1: Origin' : 'Paso 1: Origen'}</span>
                  </div>
                </div>
              </div>

              <!-- Step 1 Guide Banner -->
              <div class="mb-2.5 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-between bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                <span class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>${lang === 'en' ? 'STEP 1: CHOOSE ORIGIN' : 'PASO 1: ELIGE EL ORIGEN'}</span>
                </span>
                <span class="text-[9px] text-emerald-200/80 font-normal">${lang === 'en' ? 'Node focused' : 'Nodo centrado'}</span>
              </div>

              <!-- Active Origin Highlight Card -->
              <div class="bg-slate-900/95 p-2.5 rounded-xl border border-emerald-500/80 ring-1 ring-emerald-500/30 transition mb-2.5 font-mono text-[11px] shadow-lg shadow-emerald-950/40">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0"></span>
                    <span>${lang === 'en' ? 'ORIGIN NODE (FROM):' : 'NODO ORIGEN (DESDE):'}</span>
                  </span>
                  <span class="text-[9px] text-emerald-300 font-bold bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                    ${originNode.type.toUpperCase()}
                  </span>
                </div>
                <div class="font-bold text-slate-100 text-xs truncate">${originNode.name}</div>
                <div class="text-[10px] text-slate-400 truncate">${originNode.city || originNode.country} (${originNode.country})</div>
              </div>

              <!-- Quick Origin Suggestions (Top Nodes) -->
              <div class="mb-2.5">
                <label class="text-[10px] text-slate-400 font-mono block mb-1 font-semibold">
                  ${lang === 'en' ? 'Quick Suggestions (Top Nodes):' : 'Sugerencias rápidas (Top Nodos):'}
                </label>
                <div class="grid grid-cols-3 gap-1">
                  ${topNodePresets.map((item) => {
                    const isSelected = item.id === currentOriginId;
                    return `
                      <button data-quick-origin="${item.id}" class="px-1.5 py-1 rounded ${
                        isSelected
                          ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 font-bold ring-1 ring-emerald-400/50'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                      } border text-[10px] font-mono transition truncate cursor-pointer text-center">
                        ${item.name}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Dropdown for All Global Nodes -->
              <div class="mb-3">
                <label class="text-[10px] text-slate-400 font-mono block mb-1 font-semibold">
                  ${lang === 'en' ? 'Or pick any global node:' : 'O busca cualquier nodo global:'}
                </label>
                <select id="hud-ping-origin-select" class="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-1.5 font-mono text-[11px] focus:outline-none focus:border-emerald-400 transition cursor-pointer">
                  ${allOriginNodesHtml}
                </select>
              </div>

              <!-- Primary Action: Next to Step 2 (Destination) -->
              <button data-hud-action="next-step" class="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 transition cursor-pointer">
                <span>${lang === 'en' ? 'Next: Choose Destination' : 'Siguiente: Elegir Destino'}</span>
                <svg class="w-3.5 h-3.5 stroke-white fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            `;

            // Wire Step 1 Listeners
            const originSelect = container.querySelector<HTMLSelectElement>('#hud-ping-origin-select');
            if (originSelect) {
              originSelect.onchange = () => {
                currentOriginId = originSelect.value;
                if (currentDestId === currentOriginId) {
                  currentDestId = currentOriginId === 'aws-us-east-1' ? 'aws-sa-east-1' : 'aws-us-east-1';
                }
                renderPingStep('origin', true);
              };
            }

            container.querySelectorAll<HTMLButtonElement>('[data-quick-origin]').forEach((btn) => {
              btn.onclick = (e) => {
                e.stopPropagation();
                const nodeVal = btn.getAttribute('data-quick-origin');
                if (nodeVal) {
                  currentOriginId = nodeVal;
                  if (currentDestId === currentOriginId) {
                    currentDestId = currentOriginId === 'aws-us-east-1' ? 'aws-sa-east-1' : 'aws-us-east-1';
                  }
                  renderPingStep('origin', true);
                }
              };
            });

            const btnNext = container.querySelector<HTMLButtonElement>('[data-hud-action="next-step"]');
            if (btnNext) {
              btnNext.onclick = (e) => {
                e.stopPropagation();
                // Stay on origin when entering Step 2 so user doesn't feel disoriented!
                renderPingStep('dest', false);
              };
            }

            const btnBack = container.querySelector<HTMLButtonElement>('[data-hud-action="back"]');
            if (btnBack) {
              btnBack.onclick = (e) => {
                e.stopPropagation();
                syncPingBeaconsRef.current?.();
                if (map) {
                  map.flyTo({ center: coords, zoom: 4.2, pitch: 30, duration: 1100 });
                }
                showActionHud(coords, context, forceExpand, 'actions');
              };
            }
          } else {
            // STEP 2: DESTINATION ONLY VIEW
            const distKm = Math.round(turf.distance(turf.point(originNode.coordinates), turf.point(destNode.coordinates), { units: 'kilometers' }));

            updatePingOriginBeacon(
              originNode.coordinates,
              lang === 'en' ? `ORIGIN: ${originNode.city || originNode.name}` : `ORIGEN: ${originNode.city || originNode.name}`
            );
            updatePingTargetBeacon(
              destNode.coordinates,
              lang === 'en' ? `TARGET: ${destNode.city || destNode.name}` : `DESTINO: ${destNode.city || destNode.name}`
            );

            if (shouldCenter) {
              isDestCentered = true;
              centerOnNode(destNode.coordinates);
            } else {
              isDestCentered = false;
              // Keep popup anchored to origin where camera is currently located
              popup.setLngLat(originNode.coordinates);
            }

            const destOtherNodes = currentNodes.filter((n) => n.id !== currentOriginId);
            const allDestNodesHtml = `
              <optgroup label="${t.controlDeck.groupAwsRegions}" class="bg-slate-950 text-amber-400 font-bold">
                ${destOtherNodes.filter((n) => n.type === 'aws_region').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentDestId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
              <optgroup label="${t.controlDeck.groupLandingStations}" class="bg-slate-950 text-cyan-400 font-bold">
                ${destOtherNodes.filter((n) => n.type === 'landing_station').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentDestId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
              <optgroup label="${t.controlDeck.groupIxps}" class="bg-slate-950 text-purple-400 font-bold">
                ${destOtherNodes.filter((n) => n.type === 'ixp').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentDestId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
              <optgroup label="${t.controlDeck.groupDepots}" class="bg-slate-950 text-emerald-400 font-bold">
                ${destOtherNodes.filter((n) => n.type === 'depot').map((n) => `<option value="${n.id}" class="bg-slate-900 text-slate-100" ${n.id === currentDestId ? 'selected' : ''}>${n.name} (${n.country})</option>`).join('')}
              </optgroup>
            `;

            container.innerHTML = `
              <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 pr-10">
                <div class="flex items-center gap-2 min-w-0">
                  <button data-hud-action="prev-step" class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700 flex items-center gap-1 shrink-0" title="${lang === 'en' ? 'Back to Step 1: Origin' : 'Volver al Paso 1: Origen'}">
                    <svg class="w-2.5 h-2.5 stroke-slate-300 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    <span>${lang === 'en' ? 'Origin' : 'Origen'}</span>
                  </button>
                  <div class="flex items-center gap-1.5 min-w-0 truncate">
                    <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
                    <span class="font-bold text-cyan-300 text-xs truncate">${lang === 'en' ? 'Step 2: Dest' : 'Paso 2: Destino'}</span>
                  </div>
                </div>
              </div>

              <!-- Step 2 Guide Banner -->
              <div class="mb-2 py-1 px-2 rounded-lg text-[10px] font-mono font-bold flex items-center justify-between bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                <span class="flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  <span>${
                    isDestCentered
                      ? (lang === 'en' ? 'STEP 2: DESTINATION FOCUSED' : 'PASO 2: DESTINO CENTRADO')
                      : (lang === 'en' ? 'STEP 2: CHOOSE DESTINATION' : 'PASO 2: ELIGE EL DESTINO')
                  }</span>
                </span>
                <span class="text-[9px] text-cyan-200/80 font-normal">
                  ${isDestCentered ? `${distKm.toLocaleString()} km` : (lang === 'en' ? 'Select destination' : 'Selecciona destino')}
                </span>
              </div>

              <!-- Selected Origin Summary Pill -->
              <div class="bg-slate-900/60 p-2 rounded-xl border border-slate-800 flex items-center justify-between mb-2 text-[10px] font-mono">
                <div class="flex items-center gap-1.5 truncate">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0"></span>
                  <span class="text-slate-400 uppercase text-[9px]">${lang === 'en' ? 'From:' : 'Desde:'}</span>
                  <span class="font-bold text-slate-200 truncate">${originNode.name.split(' (')[0]}</span>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 ml-1">
                  ${
                    isDestCentered
                      ? `
                    <button data-hud-action="fly-to-origin" class="text-[9px] text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1" title="${lang === 'en' ? 'Center camera back on Origin' : 'Volver a centrar la cámara en el Origen'}">
                      <svg class="w-2.5 h-2.5 stroke-emerald-400 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>${lang === 'en' ? 'Focus Origin' : 'Ver Origen'}</span>
                    </button>
                    <span class="text-slate-600">|</span>
                  `
                      : ''
                  }
                  <button data-hud-action="prev-step" class="text-[9px] text-slate-400 hover:text-white cursor-pointer" title="${lang === 'en' ? 'Back to Step 1' : 'Volver al Paso 1'}">
                    ${lang === 'en' ? 'Change' : 'Cambiar'}
                  </button>
                </div>
              </div>

              <!-- Active Destination Highlight Card -->
              <div class="bg-slate-900/95 p-2.5 rounded-xl border border-cyan-500/80 ring-1 ring-cyan-500/30 transition mb-2.5 font-mono text-[11px] shadow-lg shadow-cyan-950/40">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-slate-400 text-[10px] uppercase font-bold flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block shrink-0"></span>
                    <span>${lang === 'en' ? 'DESTINATION NODE (TO):' : 'NODO DESTINO (HACIA):'}</span>
                  </span>
                  <div class="flex items-center gap-1">
                    ${
                      !isDestCentered
                        ? `
                      <button data-hud-action="fly-to-dest" class="text-[9px] text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 px-1.5 py-0.5 rounded border border-cyan-500/40 transition cursor-pointer flex items-center gap-1 animate-pulse" title="${lang === 'en' ? 'Fly camera to Destination' : 'Volar la cámara al Destino'}">
                        <svg class="w-2.5 h-2.5 stroke-cyan-300 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                        <span>${lang === 'en' ? 'Fly to Dest' : 'Volar a Destino'}</span>
                      </button>
                    `
                        : `
                      <span class="text-[9px] text-cyan-300 font-mono font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1">
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block shrink-0"></span>
                        <span>${lang === 'en' ? 'FOCUSED' : 'CENTRADO'}</span>
                      </span>
                    `
                    }
                    <span class="text-[9px] text-cyan-300 font-bold bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-500/40">
                      ${destNode.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div class="font-bold text-slate-100 text-xs truncate">${destNode.name}</div>
                <div class="text-[10px] text-slate-400 truncate">${destNode.city || destNode.country} (${destNode.country})</div>
              </div>

              <!-- Quick Destination Suggestions (Filtered) -->
              <div class="mb-2.5">
                <label class="text-[10px] text-slate-400 font-mono block mb-1 font-semibold">
                  ${lang === 'en' ? 'Quick Suggestions (Destination):' : 'Sugerencias rápidas de destino:'}
                </label>
                <div class="grid grid-cols-3 gap-1">
                  ${topNodePresets.filter((item) => item.id !== currentOriginId).map((item) => {
                    const isSelected = item.id === currentDestId;
                    return `
                      <button data-quick-dest="${item.id}" class="px-1.5 py-1 rounded ${
                        isSelected
                          ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200 font-bold ring-1 ring-cyan-400/50'
                          : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                      } border text-[10px] font-mono transition truncate cursor-pointer text-center">
                        ${item.name}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Dropdown for All Destinations -->
              <div class="mb-3">
                <label class="text-[10px] text-slate-400 font-mono block mb-1 font-semibold">
                  ${lang === 'en' ? 'Or pick any other destination:' : 'O busca cualquier otro destino:'}
                </label>
                <select id="hud-ping-dest-select" class="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-1.5 font-mono text-[11px] focus:outline-none focus:border-cyan-400 transition cursor-pointer">
                  ${allDestNodesHtml}
                </select>
              </div>

              <!-- Primary Action: Execute BGP Ping -->
              <button data-hud-action="execute-ping" class="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/50 transition cursor-pointer">
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/></svg>
                <span>${lang === 'en' ? `Trace BGP Ping (${destNode.name.split(' (')[0]})` : `Trazar Ping BGP (${destNode.name.split(' (')[0]})`}</span>
              </button>

              ${(activePingsRef.current.length > 0 || !!pingResultRef.current) ? `
                <button data-hud-action="stop-ping" class="mt-2 w-full py-2 px-3 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer">
                  <svg class="w-3.5 h-3.5 fill-rose-400 text-rose-400 shrink-0" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
                  <span>${lang === 'en' ? (activePingsRef.current.length > 1 ? `Stop All Pings (${activePingsRef.current.length})` : 'Stop Ping') : (activePingsRef.current.length > 1 ? `Detener Todos los Pings (${activePingsRef.current.length})` : 'Detener Ping')}</span>
                </button>
              ` : ''}
            `;

            // Wire Step 2 Listeners
            const destSelect = container.querySelector<HTMLSelectElement>('#hud-ping-dest-select');
            if (destSelect) {
              destSelect.onchange = () => {
                currentDestId = destSelect.value;
                renderPingStep('dest', true);
              };
            }

            container.querySelectorAll<HTMLButtonElement>('[data-quick-dest]').forEach((btn) => {
              btn.onclick = (e) => {
                e.stopPropagation();
                const nodeVal = btn.getAttribute('data-quick-dest');
                if (nodeVal) {
                  currentDestId = nodeVal;
                  renderPingStep('dest', true);
                }
              };
            });

            const flyToDestBtn = container.querySelector<HTMLButtonElement>('[data-hud-action="fly-to-dest"]');
            if (flyToDestBtn) {
              flyToDestBtn.onclick = (e) => {
                e.stopPropagation();
                renderPingStep('dest', true);
              };
            }

            const flyToOriginBtn = container.querySelector<HTMLButtonElement>('[data-hud-action="fly-to-origin"]');
            if (flyToOriginBtn) {
              flyToOriginBtn.onclick = (e) => {
                e.stopPropagation();
                renderPingStep('dest', false);
                centerOnNode(originNode.coordinates);
              };
            }

            const prevButtons = container.querySelectorAll<HTMLElement>('[data-hud-action="prev-step"]');
            prevButtons.forEach((btn) => {
              btn.onclick = (e) => {
                e.stopPropagation();
                renderPingStep('origin', true);
              };
            });

            const btnStopPing = container.querySelector<HTMLButtonElement>('[data-hud-action="stop-ping"]');
            if (btnStopPing) {
              btnStopPing.onclick = (e) => {
                e.stopPropagation();
                if (onStopPingRef.current) {
                  onStopPingRef.current();
                }
                popup.remove();
              };
            }

            const btnExecute = container.querySelector<HTMLButtonElement>('[data-hud-action="execute-ping"]');
            if (btnExecute) {
              btnExecute.onclick = (e) => {
                e.stopPropagation();
                if (onTracePingRef.current) {
                  onTracePingRef.current(currentOriginId, currentDestId);
                } else if (onSelectPingOriginRef.current) {
                  onSelectPingOriginRef.current(currentOriginId);
                }
                popup.remove();
              };
            }
          }
        };

        // Initialize at Step 1: Origin with smooth camera centering
        renderPingStep('origin', true);
      } else {
        const btnStopPing = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="stop-ping"]');
        if (btnStopPing) {
          btnStopPing.onclick = (e) => {
            e.stopPropagation();
            if (onStopPingRef.current) {
              onStopPingRef.current();
            }
            popup.remove();
          };
        }

        const btnCut = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="cut"]');
        if (btnCut) {
          btnCut.onclick = (e) => {
            e.stopPropagation();
            if (nearestCable && onCutCableRef.current) {
              const exactCutCoords = snapPointToCable(nearestCable, coords);
              onCutCableRef.current(nearestCable.id, exactCutCoords);
            } else if (handleCutClickRef.current) {
              handleCutClickRef.current(coords);
            }
            popup.remove();
          };
        }

        const btnPing = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="ping"]');
        if (btnPing) {
          btnPing.onclick = (e) => {
            e.stopPropagation();
            showActionHud(coords, context, true, 'ping', false);
          };
        }

        const btnTruck = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="truck"]');
        if (btnTruck) {
          btnTruck.onclick = (e) => {
            e.stopPropagation();
            if (activeEventRef.current) {
              handleSelectTrackingRef.current(activeEventRef.current.isSubmarineCut ? 'ship' : 'truck');
            }
            if (onDispatchTruckRef.current) {
              const targetNodeId = nearestNode ? nearestNode.id : '';
              onDispatchTruckRef.current(targetNodeId, coords);
            }
            popup.remove();
          };
        }

        const btnRepair = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="repair"]');
        if (btnRepair) {
          btnRepair.onclick = (e) => {
            e.stopPropagation();
            if (nearestCable && onQuickRepairCableRef.current) {
              onQuickRepairCableRef.current(nearestCable.id);
            }
            popup.remove();
          };
        }

        const btnIceberg = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="iceberg"]');
        if (btnIceberg) {
          btnIceberg.onclick = (e) => {
            e.stopPropagation();
            if (onOpenIcebergRef.current) {
              onOpenIcebergRef.current();
            }
            popup.remove();
          };
        }

        const btnToggle = popupEl.querySelector<HTMLButtonElement>('[data-hud-action="toggle-expand"]');
        if (btnToggle) {
          btnToggle.onclick = (e) => {
            e.stopPropagation();
            showActionHud(coords, context, !forceExpand, 'actions');
          };
        }
      }
    }
  };

  showActionHudRef.current = showActionHud;

  // 1. Initialize MapLibre GL JS v4.7+ with 3D Globe & 3D Terrain
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const darkStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: darkStyle,
      center: [-68.0, -15.0], // Centered on South America (Bolivia / Andes / Pacific)
      zoom: 2.2,
      maxPitch: 85,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      renderWorldCopies: false,
      projection: {
        type: 'globe',
      },
    } as any);

    mapRef.current = map;
    if (mapRefOut) {
      mapRefOut.current = map;
    }

    // Adaptive Mobile / Low-Spec GPU profile detection to prevent WebGL context loss
    const isLowPowerDevice = typeof window !== 'undefined' && (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4)
    );

    map.on('error', (e) => {
      console.warn('MapLibre GL internal warning/error:', e);
    });

    // Graceful WebGL context loss recovery (prevents blank screen crash on mobile)
    try {
      const canvas = map.getCanvas();
      if (canvas) {
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          console.warn('[GlobeMapCanvas] WebGL context loss caught gracefully.');
        });
        canvas.addEventListener('webglcontextrestored', () => {
          console.info('[GlobeMapCanvas] WebGL context restored.');
        });
      }
    } catch {
      // safe fallback
    }

    map.on('style.load', () => {
      // 3D Globe Projection
      try {
        if (typeof map.setProjection === 'function') {
          map.setProjection({
            type: 'globe',
          });
        }
      } catch (e) {
        console.warn('Globe projection error:', e);
      }

      // Add 3D Terrain Relief (Terrarium DEM) ONLY on desktop/capable hardware to maintain rock-solid 60 FPS
      if (!isLowPowerDevice) {
        try {
          if (!map.getSource('terrarium-dem')) {
            map.addSource('terrarium-dem', {
              type: 'raster-dem',
              tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
              encoding: 'terrarium',
              tileSize: 256,
            });
            map.setTerrain({ source: 'terrarium-dem', exaggeration: 1.5 });
          }
        } catch (e) {
          console.warn('3D Terrain load error:', e);
        }
      }

      // Listen for rotation and pitch to drive the custom 3D Tactical NOC Gimbal Compass
      const syncOrientation = () => {
        setMapBearing(map.getBearing());
        setMapPitch(map.getPitch());
      };
      map.on('rotate', syncOrientation);
      map.on('pitch', syncOrientation);
      map.on('move', syncOrientation);
      syncOrientation();

      // Free Camera Interruption: disengage vehicle follow if user manually moves or zooms the map
      const onUserInterruption = (e?: { originalEvent?: Event }) => {
        if (e && !e.originalEvent) return; // Ignorar easeTo / flyTo programáticos
        if (trackingModeRef.current !== 'free') {
          trackingModeRef.current = 'free';
          setTrackingMode('free');
        }
      };
      map.on('dragstart', onUserInterruption);
      map.on('wheel', onUserInterruption);
      map.on('rotatestart', onUserInterruption);
      map.on('pitchstart', onUserInterruption);
      map.on('touchstart', onUserInterruption);

      setStyleLoaded(true);
    });

    // Unified Map Click Handler with 12px Magnetic Bounding Box
    map.on('click', (e: MapMouseEvent) => {
      const clickCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // 12px magnetic bounding box around the cursor
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - 12, e.point.y - 12],
        [e.point.x + 12, e.point.y + 12],
      ];

      // Cut Mode (Fiber Cut / Meteor Strike Simulation)
      if (isCutActiveRef.current) {
        const activeNodeLayers = ['nodes-core', 'nodes-halo'].filter((l) => map.getLayer(l));
        const nodeFeatures = activeNodeLayers.length > 0 ? map.queryRenderedFeatures(bbox, { layers: activeNodeLayers }) : [];
        if (nodeFeatures.length > 0 && onTriggerStrikeAtNodeRef.current) {
          const nodeId = nodeFeatures[0].properties?.id || '';
          onTriggerStrikeAtNodeRef.current(nodeId, clickCoords);
          return;
        }

        const activeCableLayers = ['cables-sub-main', 'cables-ter-main', 'cables-sub-glow', 'cables-ter-glow'].filter((l) => map.getLayer(l));
        const cableFeatures = activeCableLayers.length > 0 ? map.queryRenderedFeatures(bbox, { layers: activeCableLayers }) : [];
        if (cableFeatures.length > 0 && onCutCableRef.current) {
          const cableId = cableFeatures[0].properties?.id || '';
          const targetCable = cablesRef.current.find((c) => c.id === cableId);
          const snapped = targetCable ? snapPointToCable(targetCable, clickCoords) : clickCoords;
          onCutCableRef.current(cableId, snapped);
          return;
        }

        if (handleCutClickRef.current) {
          handleCutClickRef.current(clickCoords);
          return;
        }
      }

      // Priority 1: Direct Node Detection within 12px magnetic box
      const activeNodeLayers = ['nodes-core', 'nodes-halo'].filter((l) => map.getLayer(l));
      const nodeFeatures = activeNodeLayers.length > 0 ? map.queryRenderedFeatures(bbox, { layers: activeNodeLayers }) : [];
      if (nodeFeatures.length > 0) {
        const nodeId = nodeFeatures[0].properties?.id;
        const targetNode = nodesRef.current.find((n) => n.id === nodeId);
        if (targetNode) {
          showActionHudRef.current(targetNode.coordinates, { directNode: targetNode });
          return;
        }
      }

      // Priority 2: Direct Cable Detection within 12px magnetic box (snapped to line)
      const activeCableLayers = ['cables-sub-main', 'cables-ter-main', 'cables-sub-glow', 'cables-ter-glow'].filter((l) => map.getLayer(l));
      const cableFeatures = activeCableLayers.length > 0 ? map.queryRenderedFeatures(bbox, { layers: activeCableLayers }) : [];
      if (cableFeatures.length > 0) {
        const cableId = cableFeatures[0].properties?.id;
        const targetCable = cablesRef.current.find((c) => c.id === cableId);
        if (targetCable) {
          const snapped = snapPointToCable(targetCable, clickCoords);
          showActionHudRef.current(snapped, { directCable: targetCable });
          return;
        }
      }

      // Priority 3: Vacant Ground / Sea Click (Outside 12px magnetic box) -> Dismiss HUD cleanly
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
        syncPingBeaconsRef.current?.();
      }
    });

    // Tactical Free Inspection HUD on Right-Click (contextmenu) within 350km of infrastructure
    map.on('contextmenu', (e: MapMouseEvent) => {
      e.preventDefault();
      const clickCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const pt = turf.point(clickCoords);

      let minCableDist = Infinity;
      for (const c of cablesRef.current) {
        const d = turf.pointToLineDistance(pt, turf.lineString(c.coordinates), { units: 'kilometers' });
        if (d < minCableDist) minCableDist = d;
      }
      let minNodeDist = Infinity;
      for (const n of nodesRef.current) {
        const d = turf.distance(pt, turf.point(n.coordinates), { units: 'kilometers' });
        if (d < minNodeDist) minNodeDist = d;
      }

      if (minCableDist <= 350 || minNodeDist <= 350) {
        showActionHudRef.current(clickCoords);
      }
    });

    // Magnetic Cursor Hover via 10px BBox
    map.on('mousemove', (e: MapMouseEvent) => {
      if (isCutActiveRef.current) {
        map.getCanvas().style.cursor = 'crosshair';
        return;
      }
      const hoverBbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - 10, e.point.y - 10],
        [e.point.x + 10, e.point.y + 10],
      ];
      const interactiveLayers = ['nodes-core', 'nodes-halo', 'cables-sub-main', 'cables-ter-main', 'cables-sub-glow', 'cables-ter-glow'].filter((l) => map.getLayer(l));
      const hits = interactiveLayers.length > 0 ? map.queryRenderedFeatures(hoverBbox, { layers: interactiveLayers }) : [];
      map.getCanvas().style.cursor = hits.length > 0 ? 'pointer' : '';
    });

    map.on('dblclick', (e: MapMouseEvent) => {
      e.preventDefault();
    });

    return () => {
      if (truckAnimationRef.current) cancelAnimationFrame(truckAnimationRef.current);
      if (truckMarkerRef.current) truckMarkerRef.current.remove();
      if (shipMarkerRef.current) shipMarkerRef.current.remove();
      if (depotMarkerRef.current) depotMarkerRef.current.remove();
      if (spliceMarkerRef.current) spliceMarkerRef.current.remove();
      if (subseaSpliceMarkerRef.current) subseaSpliceMarkerRef.current.remove();
      returningFleetRef.current.forEach((u) => u.marker.remove());
      returningFleetRef.current = [];
      if (pingAnimationRef.current) cancelAnimationFrame(pingAnimationRef.current);
      if (pingPacketMarkerRef.current) pingPacketMarkerRef.current.remove();
      pingPacketMarkersMapRef.current.forEach((m) => m.remove());
      pingPacketMarkersMapRef.current.clear();
      if (pingTargetMarkerRef.current) pingTargetMarkerRef.current.remove();
      if (pingOriginMarkerRef.current) pingOriginMarkerRef.current.remove();
      if (activePopupRef.current) activePopupRef.current.remove();
      map.remove();
      mapRef.current = null;
      if (mapRefOut) mapRefOut.current = null;
    };
  }, []);

  // 2. Data Sources & Interactive Layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;

    // A. FAULT LINES
    const faultGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: faultLines.map((fl) => ({
        type: 'Feature',
        id: fl.id,
        geometry: { type: 'LineString', coordinates: fl.coordinates },
        properties: { id: fl.id, name: fl.name },
      })),
    };

    if (!map.getSource('fault-lines-src')) {
      map.addSource('fault-lines-src', { type: 'geojson', data: faultGeoJson });
      map.addLayer({
        id: 'fault-lines-layer',
        type: 'line',
        source: 'fault-lines-src',
        layout: { visibility: showFaults ? 'visible' : 'none' },
        paint: {
          'line-color': '#EF4444',
          'line-width': 2.0,
          'line-dasharray': [4, 3],
          'line-opacity': 0.75,
        },
      });
    } else {
      (map.getSource('fault-lines-src') as GeoJSONSource).setData(faultGeoJson);
      map.setLayoutProperty('fault-lines-layer', 'visibility', showFaults ? 'visible' : 'none');
    }

    // B. FIBER CABLES (Submarine & Terrestrial separated for toggle filters)
    const submarineCables = cables.filter((c) => c.type === 'submarine');
    const terrestrialCables = cables.filter((c) => c.type === 'terrestrial');

    const formatCableFeatures = (cableList: NetworkCable[]): GeoJSON.FeatureCollection => ({
      type: 'FeatureCollection',
      features: cableList.map((c) => {
        let status = c.status;
        if (c.status !== 'severed') {
          if (reroutedCableIds.includes(c.id)) {
            status = 'rerouted';
          } else if (pingCableIds.includes(c.id)) {
            status = 'ping';
          }
        }
        return {
          type: 'Feature',
          id: c.id,
          geometry: { type: 'LineString', coordinates: c.coordinates },
          properties: {
            id: c.id,
            name: c.name,
            type: c.type,
            status,
            capacity: c.capacityTbps,
            latency: c.latencyBaseMs,
            corridor: c.corridor,
          },
        };
      }),
    });

    // Submarine Cables
    const subGeo = formatCableFeatures(submarineCables);
    if (!map.getSource('sub-cables-src')) {
      map.addSource('sub-cables-src', { type: 'geojson', data: subGeo });

      map.addLayer({
        id: 'cables-sub-glow',
        type: 'line',
        source: 'sub-cables-src',
        layout: { visibility: showSubmarine ? 'visible' : 'none' },
        paint: {
          'line-width': ['match', ['get', 'status'], 'ping', 8.0, 'rerouted', 7.0, 6.0],
          'line-blur': 4.0,
          'line-opacity': 0.85,
          'line-color': ['match', ['get', 'status'], 'severed', '#EF4444', 'rerouted', '#10B981', 'ping', '#00F0FF', '#00F0FF'],
        },
      });

      map.addLayer({
        id: 'cables-sub-main',
        type: 'line',
        source: 'sub-cables-src',
        layout: { visibility: showSubmarine ? 'visible' : 'none' },
        paint: {
          'line-width': ['match', ['get', 'status'], 'severed', 3.0, 'rerouted', 3.5, 'ping', 3.8, 2.4],
          'line-color': ['match', ['get', 'status'], 'severed', '#EF4444', 'rerouted', '#10B981', 'ping', '#22D3EE', '#38BDF8'],
          'line-dasharray': ['match', ['get', 'status'], 'severed', ['literal', [2, 3]], ['literal', [1, 0]]],
        },
      });
    } else {
      (map.getSource('sub-cables-src') as GeoJSONSource).setData(subGeo);
      map.setLayoutProperty('cables-sub-glow', 'visibility', showSubmarine ? 'visible' : 'none');
      map.setLayoutProperty('cables-sub-main', 'visibility', showSubmarine ? 'visible' : 'none');
    }

    // Terrestrial Cables
    const terGeo = formatCableFeatures(terrestrialCables);
    if (!map.getSource('ter-cables-src')) {
      map.addSource('ter-cables-src', { type: 'geojson', data: terGeo });

      map.addLayer({
        id: 'cables-ter-glow',
        type: 'line',
        source: 'ter-cables-src',
        layout: { visibility: showTerrestrial ? 'visible' : 'none' },
        paint: {
          'line-width': ['match', ['get', 'status'], 'ping', 8.0, 'rerouted', 7.0, 6.0],
          'line-blur': 4.0,
          'line-opacity': 0.85,
          'line-color': ['match', ['get', 'status'], 'severed', '#EF4444', 'rerouted', '#10B981', 'ping', '#00F0FF', '#FF9900'],
        },
      });

      map.addLayer({
        id: 'cables-ter-main',
        type: 'line',
        source: 'ter-cables-src',
        layout: { visibility: showTerrestrial ? 'visible' : 'none' },
        paint: {
          'line-width': ['match', ['get', 'status'], 'severed', 3.0, 'rerouted', 3.5, 'ping', 3.8, 2.4],
          'line-color': ['match', ['get', 'status'], 'severed', '#EF4444', 'rerouted', '#10B981', 'ping', '#22D3EE', '#FF9900'],
          'line-dasharray': ['match', ['get', 'status'], 'severed', ['literal', [2, 3]], ['literal', [1, 0]]],
        },
      });
    } else {
      (map.getSource('ter-cables-src') as GeoJSONSource).setData(terGeo);
      map.setLayoutProperty('cables-ter-glow', 'visibility', showTerrestrial ? 'visible' : 'none');
      map.setLayoutProperty('cables-ter-main', 'visibility', showTerrestrial ? 'visible' : 'none');
    }

    // C. NODES & AWS REGIONS
    const nodeGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: nodes.map((n) => ({
        type: 'Feature',
        id: n.id,
        geometry: { type: 'Point', coordinates: n.coordinates },
        properties: {
          id: n.id,
          name: n.name,
          type: n.type,
          city: n.city,
          country: n.country,
          description: n.description,
        },
      })),
    };

    if (!map.getSource('network-nodes-src')) {
      map.addSource('network-nodes-src', { type: 'geojson', data: nodeGeoJson });

      map.addLayer({
        id: 'nodes-halo',
        type: 'circle',
        source: 'network-nodes-src',
        layout: { visibility: showNodes ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['match', ['get', 'type'], 'aws_region', 13, 'ixp', 10, 'landing_station', 9, 8],
          'circle-color': ['match', ['get', 'type'], 'aws_region', '#FF9900', 'ixp', '#A855F7', 'landing_station', '#00F0FF', '#10B981'],
          'circle-opacity': 0.35,
          'circle-stroke-width': 2.0,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'nodes-core',
        type: 'circle',
        source: 'network-nodes-src',
        layout: { visibility: showNodes ? 'visible' : 'none' },
        paint: {
          'circle-radius': ['match', ['get', 'type'], 'aws_region', 6.5, 'ixp', 5.0, 'landing_station', 4.5, 4.0],
          'circle-color': '#FFFFFF',
          'circle-opacity': 1.0,
        },
      });
    } else {
      (map.getSource('network-nodes-src') as GeoJSONSource).setData(nodeGeoJson);
      map.setLayoutProperty('nodes-halo', 'visibility', showNodes ? 'visible' : 'none');
      map.setLayoutProperty('nodes-core', 'visibility', showNodes ? 'visible' : 'none');
    }

    // D. 3D FIBER CUT HAZARD ZONE (Realistic AvoidanceArea fill-extrusion in red/amber alert)
    const emptyGeo: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
    const hazardData =
      activeEvent?.crater && incidentPhase !== 'restored' && incidentPhase !== 'idle'
        ? { type: 'FeatureCollection' as const, features: [activeEvent.crater.polygonGeoJson] }
        : emptyGeo;

    if (!map.getSource('hazard-area-src')) {
      map.addSource('hazard-area-src', { type: 'geojson', data: hazardData });

      map.addLayer({
        id: 'hazard-area-extrusion',
        type: 'fill-extrusion',
        source: 'hazard-area-src',
        paint: {
          'fill-extrusion-color': '#EF4444',
          'fill-extrusion-height': 1600, // 1.6km extruded hazard cylinder
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.65,
        },
      });

      map.addLayer({
        id: 'hazard-area-glow-outline',
        type: 'line',
        source: 'hazard-area-src',
        paint: {
          'line-color': '#F59E0B',
          'line-width': 4.5,
          'line-opacity': 0.95,
        },
      });
    } else {
      (map.getSource('hazard-area-src') as GeoJSONSource).setData(hazardData);
    }

    // E. EMERGENCY REPAIR ROUTE & TRUCK / SUBSEA CABLE SHIP
    const routeCoords = activeEvent?.routeResult?.coordinates || [];
    const maritimeCoords = activeEvent?.maritimeRouteCoords || [];
    const shouldShowTruck = Boolean(
      routeCoords.length > 1 &&
      showRepairRoutes &&
      activeEvent &&
      incidentPhase !== 'idle'
    );

    const routeGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features:
        shouldShowTruck && routeCoords.length > 1
          ? [
              {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: routeCoords },
                properties: {
                  distance: activeEvent?.routeResult?.distanceKm,
                  duration: activeEvent?.routeResult?.durationMinutes,
                },
              },
            ]
          : [],
    };

    if (!map.getSource('repair-route-src')) {
      map.addSource('repair-route-src', { type: 'geojson', data: routeGeoJson });

      map.addLayer({
        id: 'repair-route-glow',
        type: 'line',
        source: 'repair-route-src',
        layout: { visibility: showRepairRoutes ? 'visible' : 'none' },
        paint: {
          'line-color': '#10B981',
          'line-width': 9.0,
          'line-opacity': 0.65,
          'line-blur': 5.0,
        },
      });

      map.addLayer({
        id: 'repair-route-main',
        type: 'line',
        source: 'repair-route-src',
        layout: { visibility: showRepairRoutes ? 'visible' : 'none' },
        paint: {
          'line-color': '#34D399',
          'line-width': 4.5,
          'line-opacity': 1.0,
        },
      });
    } else {
      (map.getSource('repair-route-src') as GeoJSONSource).setData(routeGeoJson);
      map.setLayoutProperty('repair-route-glow', 'visibility', showRepairRoutes ? 'visible' : 'none');
      map.setLayoutProperty('repair-route-main', 'visibility', showRepairRoutes ? 'visible' : 'none');
    }

    // Maritime Cable Ship Route (Bright Cyan dotted path from coastal landing station to subsea cut)
    const maritimeGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features:
        shouldShowTruck && maritimeCoords.length > 1
          ? [
              {
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: maritimeCoords },
                properties: { name: 'Subsea Cable Ship Route' },
              },
            ]
          : [],
    };

    if (!map.getSource('maritime-route-src')) {
      map.addSource('maritime-route-src', { type: 'geojson', data: maritimeGeoJson });

      map.addLayer({
        id: 'maritime-route-glow',
        type: 'line',
        source: 'maritime-route-src',
        layout: { visibility: showRepairRoutes ? 'visible' : 'none' },
        paint: {
          'line-color': '#00F0FF',
          'line-width': 8.0,
          'line-opacity': 0.6,
          'line-blur': 4.0,
        },
      });

      map.addLayer({
        id: 'maritime-route-main',
        type: 'line',
        source: 'maritime-route-src',
        layout: { visibility: showRepairRoutes ? 'visible' : 'none' },
        paint: {
          'line-color': '#00F0FF',
          'line-width': 3.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.95,
        },
      });
    } else {
      (map.getSource('maritime-route-src') as GeoJSONSource).setData(maritimeGeoJson);
      map.setLayoutProperty('maritime-route-glow', 'visibility', showRepairRoutes ? 'visible' : 'none');
      map.setLayoutProperty('maritime-route-main', 'visibility', showRepairRoutes ? 'visible' : 'none');
    }

    // Direct Blocked Path (Faint red dotted line from depot to hazard epicenter)
    // Only drawn when distance < 180 km and NOT an offshore submarine cable cut
    const blockedCoords =
      activeEvent?.repairDepot?.coordinates && activeEvent?.crater?.center
        ? [activeEvent.repairDepot.coordinates, activeEvent.crater.center]
        : [];
    const distToCrater =
      blockedCoords.length === 2
        ? turf.distance(turf.point(blockedCoords[0]), turf.point(blockedCoords[1]), { units: 'kilometers' })
        : 9999;
    const shouldShowBlocked =
      shouldShowTruck &&
      blockedCoords.length === 2 &&
      !activeEvent?.isSubmarineCut &&
      distToCrater < 180;

    const blockedGeoJson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: shouldShowBlocked
        ? [
            {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: blockedCoords },
              properties: { name: 'Direct Blocked Path' },
            },
          ]
        : [],
    };

    if (!map.getSource('repair-blocked-src')) {
      map.addSource('repair-blocked-src', { type: 'geojson', data: blockedGeoJson });
      map.addLayer({
        id: 'repair-blocked-direct-line',
        type: 'line',
        source: 'repair-blocked-src',
        layout: { visibility: showRepairRoutes ? 'visible' : 'none' },
        paint: {
          'line-color': '#EF4444',
          'line-width': 2.2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.55,
        },
      });
    } else {
      (map.getSource('repair-blocked-src') as GeoJSONSource).setData(blockedGeoJson);
      map.setLayoutProperty('repair-blocked-direct-line', 'visibility', showRepairRoutes ? 'visible' : 'none');
    }

    // 2. Animated Repair Vehicles (Truck + Subsea Cable Ship) with Strict DOM Purge & Fleet Handoff
    // If event changed, hand off in-flight vehicles to autonomous Returning Fleet (RTB) so they don't vanish!
    const isNewIncidentEvent = activeEvent?.id !== lastEventIdRef.current;
    if (isNewIncidentEvent || !shouldShowTruck) {
      if (isNewIncidentEvent) {
        fleetSeqRef.current++;
        dispatchStartTimeRef.current = Date.now();
        lastTrackingEaseTimeRef.current = 0;
        if (shouldShowTruck && activeEvent) {
          const initialMode: 'truck' | 'ship' = activeEvent.maritimeRouteCoords?.length ? 'ship' : 'truck';
          setTrackingMode(initialMode);
          trackingModeRef.current = initialMode;
        }

        // Autonomous Truck RTB Handoff: let previous truck drive smoothly back to its base!
        if (truckMarkerRef.current && lastTruckLineRef.current && currentPctRef.current > 0.05) {
          const oldTruckMarker = truckMarkerRef.current;
          const oldLine = lastTruckLineRef.current;
          const oldTotalKm = Math.max(0.01, turf.length(oldLine, { units: 'kilometers' }));
          const oldCurrentKm = Math.min(oldTotalKm, currentPctRef.current * oldTotalKm);

          const el = oldTruckMarker.getElement();
          el.className = 'returning-fleet-marker cursor-pointer pointer-events-none';
          const textEl = el.querySelector<HTMLSpanElement>('#truck-status-text');
          if (textEl) textEl.textContent = langRef.current === 'en' ? 'RTB (Returning to Base)' : 'Retorno a Base (RTB)';
          const labelEl = el.querySelector<HTMLDivElement>('#truck-floating-label');
          if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-teal-400 text-teal-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
          const rotatorEl = el.querySelector<HTMLDivElement>('#truck-rotator');
          if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-teal-600 to-emerald-500 border-2 border-white rounded-full shadow-xl shadow-teal-500/80 text-white z-10 shrink-0';
          const ring1El = el.querySelector<HTMLDivElement>('#truck-radar-ring1');
          if (ring1El) ring1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-teal-400/20 animate-ping pointer-events-none shrink-0';
          const ring2El = el.querySelector<HTMLDivElement>('#truck-radar-ring2');
          if (ring2El) ring2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-teal-500/30 animate-pulse pointer-events-none shrink-0';

          if (returningFleetRef.current.length >= 2) {
            const oldest = returningFleetRef.current.shift();
            if (oldest) oldest.marker.remove();
          }

          returningFleetRef.current.push({
            marker: oldTruckMarker,
            line: oldLine,
            currentKm: oldCurrentKm,
            speedKmPerFrame: Math.max(0.15, oldTotalKm / 150),
            isShip: false,
          });
          truckMarkerRef.current = null;
        } else if (truckMarkerRef.current) {
          truckMarkerRef.current.remove();
          truckMarkerRef.current = null;
        }

        // Autonomous Cable Ship RTB Handoff: let previous ship sail smoothly back to its port!
        if (shipMarkerRef.current && lastShipLineRef.current && currentPctRef.current > 0.05) {
          const oldShipMarker = shipMarkerRef.current;
          const oldShipLine = lastShipLineRef.current;
          const oldShipTotalKm = Math.max(0.01, turf.length(oldShipLine, { units: 'kilometers' }));
          const oldShipCurrentKm = Math.min(oldShipTotalKm, currentPctRef.current * oldShipTotalKm);

          const shipEl = oldShipMarker.getElement();
          shipEl.className = 'returning-fleet-marker cursor-pointer pointer-events-none';
          const shipTextEl = shipEl.querySelector<HTMLSpanElement>('#ship-status-text');
          if (shipTextEl) shipTextEl.textContent = langRef.current === 'en' ? 'Returning to Port' : 'Regresando a Puerto';
          const shipLabelEl = shipEl.querySelector<HTMLDivElement>('#ship-floating-label');
          if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-sky-400 text-sky-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
          const shipRotatorEl = shipEl.querySelector<HTMLDivElement>('#ship-rotator');
          if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-sky-600 to-cyan-500 border-2 border-white rounded-full shadow-xl shadow-sky-500/80 text-white z-10 shrink-0';
          const shipRing1El = shipEl.querySelector<HTMLDivElement>('#ship-radar-ring1');
          if (shipRing1El) shipRing1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-sky-400/20 animate-ping pointer-events-none shrink-0';
          const shipRing2El = shipEl.querySelector<HTMLDivElement>('#ship-radar-ring2');
          if (shipRing2El) shipRing2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-sky-500/30 animate-pulse pointer-events-none shrink-0';

          if (returningFleetRef.current.length >= 2) {
            const oldest = returningFleetRef.current.shift();
            if (oldest) oldest.marker.remove();
          }

          returningFleetRef.current.push({
            marker: oldShipMarker,
            line: oldShipLine,
            currentKm: oldShipCurrentKm,
            speedKmPerFrame: Math.max(0.15, oldShipTotalKm / 150),
            isShip: true,
          });
          shipMarkerRef.current = null;
        } else if (shipMarkerRef.current) {
          shipMarkerRef.current.remove();
          shipMarkerRef.current = null;
        }
      } else {
        if (!shouldShowTruck || !activeEvent || incidentPhase === 'idle') {
          setTrackingMode('free');
          trackingModeRef.current = 'free';
        }
        if (truckMarkerRef.current) {
          truckMarkerRef.current.remove();
          truckMarkerRef.current = null;
        }
        if (shipMarkerRef.current) {
          shipMarkerRef.current.remove();
          shipMarkerRef.current = null;
        }
      }

      if (depotMarkerRef.current) {
        depotMarkerRef.current.remove();
        depotMarkerRef.current = null;
      }
      if (spliceMarkerRef.current) {
        spliceMarkerRef.current.remove();
        spliceMarkerRef.current = null;
      }
      if (subseaSpliceMarkerRef.current) {
        subseaSpliceMarkerRef.current.remove();
        subseaSpliceMarkerRef.current = null;
      }
      if (truckAnimationRef.current) {
        cancelAnimationFrame(truckAnimationRef.current);
        truckAnimationRef.current = null;
      }
      mapContainerRef.current?.querySelectorAll('.repair-truck-marker, .repair-ship-marker, .repair-depot-marker, .repair-splice-marker, .repair-subsea-splice-marker').forEach((el) => el.remove());
      lastEventIdRef.current = activeEvent?.id || null;
      currentPctRef.current = 0;
    }

    if (shouldShowTruck && activeEvent) {
      const isSub = Boolean(activeEvent.isSubmarineCut);

      // Technical DEPOT Origin Marker
      if (!depotMarkerRef.current && activeEvent.repairDepot?.coordinates) {
        const depotEl = document.createElement('div');
        depotEl.className = 'repair-depot-marker pointer-events-none select-none';
        depotEl.innerHTML = `
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0B0F19]/90 border border-emerald-500/80 text-emerald-300 font-mono text-[9px] font-bold shadow-lg backdrop-blur-md">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>DEPOT</span>
          </div>
        `;
        depotMarkerRef.current = new maplibregl.Marker({ element: depotEl, offset: [0, 18] })
          .setLngLat(activeEvent.repairDepot.coordinates)
          .addTo(map);
      }

      // Technical SPLICE POINT / CLS GATEWAY Target Marker
      if (!spliceMarkerRef.current && routeCoords.length > 0) {
        const spliceEl = document.createElement('div');
        spliceEl.className = 'repair-splice-marker pointer-events-none select-none';
        spliceEl.innerHTML = `
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0B0F19]/90 border ${isSub ? 'border-cyan-500/80 text-cyan-300' : 'border-amber-500/80 text-amber-300'} font-mono text-[9px] font-bold shadow-lg backdrop-blur-md">
            <span class="w-1.5 h-1.5 rounded-full ${isSub ? 'bg-cyan-400' : 'bg-amber-400'} animate-ping"></span>
            <span>${isSub ? 'CLS GATEWAY' : 'SPLICE POINT'}</span>
          </div>
        `;
        spliceMarkerRef.current = new maplibregl.Marker({ element: spliceEl, offset: [0, 18] })
          .setLngLat(routeCoords[routeCoords.length - 1])
          .addTo(map);
      }

      // Technical SUBSEA SPLICE Target Marker (Oceanic rupture point for Cable Ship)
      if (isSub && !subseaSpliceMarkerRef.current && maritimeCoords.length > 0) {
        const subseaEl = document.createElement('div');
        subseaEl.className = 'repair-subsea-splice-marker pointer-events-none select-none';
        subseaEl.innerHTML = `
          <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#0B0F19]/90 border border-amber-500/80 text-amber-300 font-mono text-[9px] font-bold shadow-lg backdrop-blur-md">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
            <span>SUBSEA SPLICE</span>
          </div>
        `;
        subseaSpliceMarkerRef.current = new maplibregl.Marker({ element: subseaEl, offset: [0, 18] })
          .setLngLat(maritimeCoords[maritimeCoords.length - 1])
          .addTo(map);
      }

      // 1. Repair Truck Marker (Upright Badge + Perimeter Heading Arrow + Flip West)
      if (!truckMarkerRef.current) {
        const truckUnitCode = `TRK-${400 + (fleetSeqRef.current % 90)}`;
        const el = document.createElement('div');
        el.className = 'repair-truck-marker cursor-pointer';
        el.innerHTML = `
          <div class="group relative flex items-center justify-center w-8 h-8">
            <!-- Pulsing High-Altitude Radar Rings -->
            <div id="truck-radar-ring1" class="absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-emerald-400/25 animate-ping pointer-events-none shrink-0"></div>
            <div id="truck-radar-ring2" class="absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-emerald-500/35 animate-pulse pointer-events-none shrink-0"></div>

            <!-- Perimeter Heading Arrow (Rotates 360° to point along road) -->
            <div id="truck-heading-arrow" class="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75">
              <div class="absolute -top-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-emerald-300 drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]"></div>
            </div>

            <!-- Core Truck Badge: Always UPRIGHT, wheels never upside-down -->
            <div id="truck-rotator" class="relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-white rounded-full shadow-xl shadow-emerald-500/80 text-white z-10 shrink-0">
              <svg id="truck-svg" class="w-4 h-4 fill-none stroke-white stroke-2 transition-transform duration-150" viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
            </div>

            <!-- Orbit Floating Label with phase telemetry -->
            <div id="truck-floating-label" class="absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-emerald-500/60 text-emerald-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5">
              <span id="truck-status-dot" class="w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-emerald-400 animate-pulse shrink-0 inline-block"></span>
              <span id="truck-status-text">${lang === 'en' ? `AWS Crew ${truckUnitCode}` : `Cuadrilla ${truckUnitCode}`}</span>
            </div>
          </div>
        `;
        el.onclick = (e) => {
          e.stopPropagation();
          handleSelectTrackingRef.current('truck');
          lastTrackingEaseTimeRef.current = performance.now() + 1850;
          if (!truckMarkerRef.current) return;
          const currLngLat = truckMarkerRef.current.getLngLat();
          map.flyTo({
            center: currLngLat,
            zoom: 9.8,
            pitch: 58,
            bearing: -15,
            duration: 1800,
          });

          const currentLang = langRef.current;
          const currentEvent = activeEventRef.current;
          const prog = repairProgressRef.current || 0;
          const phase = incidentPhaseRef.current;
          const dist = currentEvent?.routeResult?.distanceKm || 45;
          const mins = currentEvent?.routeResult?.durationMinutes || 20;

          const popupHtml = `
            <div class="p-3 bg-[#0B0F19]/95 text-slate-100 rounded-2xl border border-emerald-500/60 font-sans shadow-2xl text-xs min-w-[250px] max-w-[290px] backdrop-blur-xl">
              <div class="flex items-center justify-between border-b border-emerald-500/30 pb-2 mb-2 pr-7">
                <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
                  <svg class="w-3.5 h-3.5 stroke-emerald-400 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
                  <span>${currentLang === 'en' ? `AWS Crew ${truckUnitCode}` : `Cuadrilla ${truckUnitCode}`}</span>
                </div>
                <span id="popup-truck-badge" class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950 border border-emerald-500/50 text-emerald-300">
                  ${phase === 'restored' ? '100% OK' : `${prog}%`}
                </span>
              </div>
              <div class="space-y-1.5 text-[11px] font-mono text-slate-300">
                <div><span class="text-slate-500">${currentLang === 'en' ? 'Route' : 'Ruta'}:</span> ${currentEvent?.repairDepot?.name || 'Depot'} <svg class="w-3 h-3 inline mx-0.5 stroke-slate-400 fill-none stroke-2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> ${currentEvent?.targetNode?.name || 'Splice'}</div>
                <div><span class="text-slate-500">${currentLang === 'en' ? 'Distance' : 'Distancia'}:</span> ${dist} km (ETA ${mins} min)</div>
                <div><span class="text-slate-500">${currentLang === 'en' ? 'Status' : 'Estado'}:</span> <span id="popup-truck-status" class="text-emerald-400 font-bold">${phase === 'restored' ? (currentLang === 'en' ? 'Restored' : 'Restaurado') : (currentLang === 'en' ? 'In Progress' : 'En Curso')}</span></div>
              </div>
              ${phase !== 'restored' ? `
                <button id="btn-truck-complete-splice" class="w-full mt-3 py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all cursor-pointer">
                  <svg class="w-3.5 h-3.5 stroke-white fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>${currentLang === 'en' ? 'Complete Splice Now (100%)' : 'Completar Fusión Ahora (100%)'}</span>
                </button>
              ` : ''}
            </div>
          `;

          if (activePopupRef.current) activePopupRef.current.remove();
          const popup = new maplibregl.Popup({
            className: 'kiro-noc-popup',
            closeButton: true,
            closeOnClick: false,
            maxWidth: '300px',
            offset: 16,
          })
            .setLngLat(currLngLat)
            .setHTML(popupHtml)
            .addTo(map);

          activePopupRef.current = popup;
          activeVehiclePopupTargetRef.current = 'truck';

          popup.on('close', () => {
            if (activeVehiclePopupTargetRef.current === 'truck') {
              activeVehiclePopupTargetRef.current = null;
            }
            if (activePopupRef.current === popup) {
              activePopupRef.current = null;
            }
          });

          setTimeout(() => {
            const btn = popup.getElement()?.querySelector<HTMLButtonElement>('#btn-truck-complete-splice');
            if (btn) {
              btn.onclick = () => {
                onQuickRepairCable?.(activeEventRef.current?.severedCableIds[0] || 'all');
                popup.remove();
              };
            }
          }, 50);
        };
        truckMarkerRef.current = new maplibregl.Marker({ element: el })
          .setLngLat(routeCoords[0])
          .addTo(map);
      }

      // 2. Subsea Cable Ship Marker (Upright Badge + Perimeter Heading Arrow + Flip West)
      if (maritimeCoords.length > 1 && !shipMarkerRef.current) {
        const shipUnitCode = `CS-Kiro ${fleetSeqRef.current > 1 && fleetSeqRef.current % 2 === 0 ? 'II' : 'I'}`;
        const shipEl = document.createElement('div');
        shipEl.className = 'repair-ship-marker cursor-pointer';
        shipEl.innerHTML = `
          <div class="group relative flex items-center justify-center w-8 h-8">
            <!-- Pulsing Maritime Radar Rings -->
            <div id="ship-radar-ring1" class="absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-cyan-400/30 animate-ping pointer-events-none shrink-0"></div>
            <div id="ship-radar-ring2" class="absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-cyan-500/40 animate-pulse pointer-events-none shrink-0"></div>

            <!-- Perimeter Heading Arrow (Rotates 360° to point along subsea heading) -->
            <div id="ship-heading-arrow" class="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75">
              <div class="absolute -top-2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"></div>
            </div>

            <!-- Core Cable Ship Badge: Always UPRIGHT, keel never upside-down -->
            <div id="ship-rotator" class="relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-cyan-600 to-sky-400 border-2 border-white rounded-full shadow-xl shadow-cyan-500/80 text-white z-10 shrink-0">
              <svg id="ship-svg" class="w-4 h-4 fill-none stroke-white stroke-2 transition-transform duration-150" viewBox="0 0 24 24"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><line x1="12" y1="2" x2="12" y2="10"/></svg>
            </div>

            <!-- Floating Telemetry Badge -->
            <div id="ship-floating-label" class="absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-cyan-400/70 text-cyan-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5">
              <span id="ship-status-dot" class="w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-cyan-400 animate-pulse shrink-0 inline-block"></span>
              <span id="ship-status-text" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 stroke-cyan-400 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>
                <span>${lang === 'en' ? `${shipUnitCode}` : `Buque ${shipUnitCode}`}</span>
              </span>
            </div>
          </div>
        `;
        shipEl.onclick = (e) => {
          e.stopPropagation();
          handleSelectTrackingRef.current('ship');
          lastTrackingEaseTimeRef.current = performance.now() + 1850;
          if (!shipMarkerRef.current) return;
          const currLngLat = shipMarkerRef.current.getLngLat();
          map.flyTo({
            center: currLngLat,
            zoom: 8.5,
            pitch: 50,
            bearing: -15,
            duration: 1800,
          });

          const currentLang = langRef.current;
          const currentEvent = activeEventRef.current;
          const prog = repairProgressRef.current || 0;
          const phase = incidentPhaseRef.current;

          const popupHtml = `
            <div class="p-3 bg-[#0B0F19]/95 text-slate-100 rounded-2xl border border-cyan-500/60 font-sans shadow-2xl text-xs min-w-[250px] max-w-[290px] backdrop-blur-xl">
              <div class="flex items-center justify-between border-b border-cyan-500/30 pb-2 mb-2 pr-7">
                <div class="flex items-center gap-1.5 font-mono text-xs font-bold text-cyan-400">
                  <svg class="w-3.5 h-3.5 stroke-cyan-400 fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>
                  <span>${currentLang === 'en' ? `${shipUnitCode} Subsea Ship` : `Buque ${shipUnitCode}`}</span>
                </div>
                <span id="popup-ship-badge" class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 border border-cyan-500/50 text-cyan-300">
                  ${phase === 'restored' ? '100% OK' : `${prog}%`}
                </span>
              </div>
              <div class="space-y-1.5 text-[11px] font-mono text-slate-300">
                <div><span class="text-slate-500">${currentLang === 'en' ? 'Route' : 'Ruta'}:</span> ${currentEvent?.targetNode?.name || 'Port'} <svg class="w-3 h-3 inline mx-0.5 stroke-slate-400 fill-none stroke-2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg> ${currentLang === 'en' ? 'Oceanic Splice' : 'Empalme Oceánico'}</div>
                <div><span class="text-slate-500">${currentLang === 'en' ? 'Operation' : 'Operación'}:</span> ${currentLang === 'en' ? 'ROV Optical Grapple & Splicing' : 'Empalme y Grapple Óptico ROV'}</div>
                <div><span class="text-slate-500">${currentLang === 'en' ? 'Status' : 'Estado'}:</span> <span id="popup-ship-status" class="text-cyan-400 font-bold">${phase === 'restored' ? (currentLang === 'en' ? 'Restored' : 'Restaurado') : (currentLang === 'en' ? 'In Progress' : 'En Curso')}</span></div>
              </div>
              ${phase !== 'restored' ? `
                <button id="btn-ship-complete-splice" class="w-full mt-3 py-1.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/30 transition-all cursor-pointer">
                  <svg class="w-3.5 h-3.5 stroke-white fill-none stroke-2 shrink-0" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  <span>${currentLang === 'en' ? 'Complete Splice Now (100%)' : 'Completar Fusión Ahora (100%)'}</span>
                </button>
              ` : ''}
            </div>
          `;

          if (activePopupRef.current) activePopupRef.current.remove();
          const popup = new maplibregl.Popup({
            className: 'kiro-noc-popup',
            closeButton: true,
            closeOnClick: false,
            maxWidth: '300px',
            offset: 16,
          })
            .setLngLat(currLngLat)
            .setHTML(popupHtml)
            .addTo(map);

          activePopupRef.current = popup;
          activeVehiclePopupTargetRef.current = 'ship';

          popup.on('close', () => {
            if (activeVehiclePopupTargetRef.current === 'ship') {
              activeVehiclePopupTargetRef.current = null;
            }
            if (activePopupRef.current === popup) {
              activePopupRef.current = null;
            }
          });

          setTimeout(() => {
            const btn = popup.getElement()?.querySelector<HTMLButtonElement>('#btn-ship-complete-splice');
            if (btn) {
              btn.onclick = () => {
                onQuickRepairCable?.(activeEventRef.current?.severedCableIds[0] || 'all');
                popup.remove();
              };
            }
          }, 50);
        };
        shipMarkerRef.current = new maplibregl.Marker({ element: shipEl })
          .setLngLat(maritimeCoords[0])
          .addTo(map);
      }

      if (truckAnimationRef.current) cancelAnimationFrame(truckAnimationRef.current);

      const line = turf.lineString(routeCoords);
      lastTruckLineRef.current = line;
      const totalKm = Math.max(0.01, turf.length(line, { units: 'kilometers' }));

      const hasMaritime = maritimeCoords.length > 1;
      const maritimeLine = hasMaritime ? turf.lineString(maritimeCoords) : null;
      lastShipLineRef.current = maritimeLine;
      const maritimeTotalKm = maritimeLine ? Math.max(0.01, turf.length(maritimeLine, { units: 'kilometers' })) : 0;

      const animateVehicles = () => {
        const curLang = langRef.current;
        const curEvent = activeEventRef.current;
        const phase = incidentPhaseRef.current;
        const prog = repairProgressRef.current || 0;

        let targetPct = 0;
        let isRtb = false;
        let rtbProgress = 0;

        if (phase === 'restored') {
          if (!restoredStartTimeRef.current) {
            restoredStartTimeRef.current = Date.now();
          }
          const restoredElapsed = Date.now() - restoredStartTimeRef.current;
          if (restoredElapsed < 2500) {
            // 0 - 2.5s: Hold at splice site celebrating 100% restoration
            targetPct = 1.0;
          } else if (restoredElapsed < 6500) {
            // 2.5s - 6.5s: Return to Base (RTB) smoothly along route backwards
            isRtb = true;
            rtbProgress = Math.min(1.0, (restoredElapsed - 2500) / 4000);
            targetPct = Math.max(0, 1.0 - rtbProgress);
          } else {
            // 6.5s+: Parked at base (0.0)
            isRtb = true;
            rtbProgress = 1.0;
            targetPct = 0;
          }
        } else {
          restoredStartTimeRef.current = null;
          if (phase === 'repairing') {
            targetPct = Math.min(1.0, prog / 75);
          } else if (phase === 'severed') {
            targetPct = 0;
          } else {
            targetPct = 1.0;
          }
        }

        const diff = targetPct - currentPctRef.current;
        if (Math.abs(diff) < 0.001) {
          currentPctRef.current = targetPct;
        } else {
          currentPctRef.current += diff * (isRtb ? 0.12 : 0.08);
        }
        const currentPct = currentPctRef.current;

        // Camera position for 3D Globe Horizon Occlusion clipping (>9,200 km = behind planet)
        const camCenter = map.getCenter();
        const camPoint = turf.point([camCenter.lng, camCenter.lat]);

        // --- ANIMATE AUTONOMOUS RETURNING FLEET UNITS (RTB) ---
        for (let i = returningFleetRef.current.length - 1; i >= 0; i--) {
          const unit = returningFleetRef.current[i];
          unit.currentKm -= unit.speedKmPerFrame;
          if (unit.currentKm > 0.05) {
            const rtbPt = turf.along(unit.line, unit.currentKm, { units: 'kilometers' });
            unit.marker.setLngLat(rtbPt.geometry.coordinates as [number, number]);

            // Globe Horizon Occlusion: Hide markers physically on the back hemisphere of 3D Globe
            const distUnitToCam = turf.distance(camPoint, rtbPt, { units: 'kilometers' });
            unit.marker.getElement().style.opacity = distUnitToCam < 9200 ? '1' : '0';
          } else {
            // Reached base! Gracefully fade out & remove
            const el = unit.marker.getElement();
            el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
            el.style.opacity = '0';
            el.style.transform = 'scale(0.5)';
            const markerToRemove = unit.marker;
            setTimeout(() => markerToRemove.remove(), 800);
            returningFleetRef.current.splice(i, 1);
          }
        }

        // --- TRUCK ANIMATION & HEADING ---
        const currentKm = Math.min(totalKm, Math.max(0, currentPct * totalKm));
        const pt = turf.along(line, currentKm, { units: 'kilometers' });
        const coords = pt.geometry.coordinates as [number, number];

        if (truckMarkerRef.current) {
          truckMarkerRef.current.setLngLat(coords);

          // Globe Horizon Occlusion: Hide truck if camera is looking at the opposite hemisphere
          const distTruckToCam = turf.distance(camPoint, turf.point(coords), { units: 'kilometers' });
          const isTruckVisible = distTruckToCam < 9200;
          truckMarkerRef.current.getElement().style.opacity = isTruckVisible ? '1' : '0';
          truckMarkerRef.current.getElement().style.pointerEvents = isTruckVisible ? 'auto' : 'none';
        }

        let bearing = 0;
        if (isRtb) {
          // Direct reverse heading towards base depot (no modulo 180 snap)
          if (currentKm > 0.05) {
            const prevKm = Math.max(0, currentKm - Math.max(0.05, totalKm * 0.015));
            const targetPt = turf.along(line, prevKm, { units: 'kilometers' });
            bearing = turf.bearing(pt, targetPt);
          } else {
            const p0 = turf.along(line, 0, { units: 'kilometers' });
            const p1 = turf.along(line, Math.min(totalKm, 0.1), { units: 'kilometers' });
            bearing = turf.bearing(p1, p0);
          }
        } else {
          // Outbound heading towards splice site
          if (currentKm < totalKm - 0.05) {
            const nextKm = Math.min(totalKm, currentKm + Math.max(0.05, totalKm * 0.015));
            const nextPt = turf.along(line, nextKm, { units: 'kilometers' });
            bearing = turf.bearing(pt, nextPt);
          } else {
            const prevKm = Math.max(0, totalKm - Math.max(0.05, totalKm * 0.015));
            const prevPt = turf.along(line, prevKm, { units: 'kilometers' });
            bearing = turf.bearing(prevPt, pt);
          }
        }

        if (truckMarkerRef.current) {
          const markerEl = truckMarkerRef.current.getElement();
          const rotatorEl = markerEl.querySelector<HTMLDivElement>('#truck-rotator');
          const headingArrowEl = markerEl.querySelector<HTMLDivElement>('#truck-heading-arrow');
          const svgEl = markerEl.querySelector<SVGElement>('#truck-svg');
          const labelEl = markerEl.querySelector<HTMLDivElement>('#truck-floating-label');
          const dotEl = markerEl.querySelector<HTMLSpanElement>('#truck-status-dot');
          const textEl = markerEl.querySelector<HTMLSpanElement>('#truck-status-text');
          const ring1El = markerEl.querySelector<HTMLDivElement>('#truck-radar-ring1');
          const ring2El = markerEl.querySelector<HTMLDivElement>('#truck-radar-ring2');

          if (headingArrowEl) {
            headingArrowEl.style.transform = `rotate(${Math.round(bearing)}deg)`;
          }
          if (svgEl) {
            const isWest = Math.sin((bearing * Math.PI) / 180) < 0;
            svgEl.style.transform = isWest ? 'scaleX(-1)' : 'scaleX(1)';
          }

          const etaMins = curEvent?.routeResult?.durationMinutes || 20;

          let truckVisualPhase: 'parked' | 'rtb' | 'restored' | 'splicing' | 'severed' | 'enroute' = 'enroute';
          let truckTargetText = '';

          if (phase === 'restored') {
            if (isRtb && rtbProgress >= 0.95) {
              truckVisualPhase = 'parked';
              truckTargetText = curLang === 'en' ? 'Base Depot (Standby)' : 'En Base Logística (Standby)';
            } else if (isRtb) {
              truckVisualPhase = 'rtb';
              truckTargetText = curLang === 'en' ? 'Returning to Base (RTB)' : 'Retorno a Base (RTB)';
            } else {
              truckVisualPhase = 'restored';
              truckTargetText = curLang === 'en' ? 'Link 100% Restored' : 'Enlace 100% Restaurado';
            }
          } else if (currentPct >= 0.98 || prog >= 75) {
            truckVisualPhase = 'splicing';
            const isSub = Boolean(curEvent?.isSubmarineCut);
            truckTargetText = isSub
              ? (curLang === 'en' ? `Landing Station Support (${prog}%)` : `Soporte Estación Terrestre (${prog}%)`)
              : (curLang === 'en' ? `On-Site Optical Splicing (${prog}%)` : `Fusión Óptica en Sitio (${prog}%)`);
          } else if (phase === 'severed') {
            truckVisualPhase = 'severed';
            truckTargetText = curLang === 'en' ? 'AWS Crew Dispatched' : 'Despacho Cuadrilla AWS';
          } else {
            truckVisualPhase = 'enroute';
            const remMins = Math.max(1, Math.round((1 - currentPct) * etaMins));
            truckTargetText = curLang === 'en' ? `En Route (${Math.round(currentPct * 100)}% | ETA ${remMins}m)` : `En Ruta (${Math.round(currentPct * 100)}% | ETA ${remMins}m)`;
          }

          if (textEl && textEl.textContent !== truckTargetText) {
            textEl.textContent = truckTargetText;
          }

          if (markerEl.dataset.visualPhase !== truckVisualPhase) {
            markerEl.dataset.visualPhase = truckVisualPhase;
            if (truckVisualPhase === 'parked') {
              if (dotEl) dotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-emerald-400 shrink-0 inline-block';
              if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-emerald-400 text-emerald-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-emerald-600 to-teal-500 border-2 border-white rounded-full shadow-xl shadow-emerald-500/60 text-white z-10 shrink-0';
              if (ring1El) ring1El.className = 'hidden';
              if (ring2El) ring2El.className = 'hidden';
            } else if (truckVisualPhase === 'rtb') {
              if (dotEl) dotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-teal-400 animate-pulse shrink-0 inline-block';
              if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-teal-400 text-teal-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-teal-600 to-emerald-500 border-2 border-white rounded-full shadow-xl shadow-teal-500/80 text-white z-10 shrink-0';
              if (ring1El) ring1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-teal-400/20 animate-ping pointer-events-none shrink-0';
              if (ring2El) ring2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-teal-500/30 animate-pulse pointer-events-none shrink-0';
            } else if (truckVisualPhase === 'restored') {
              if (dotEl) dotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-emerald-400 shrink-0 inline-block';
              if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-emerald-400 text-emerald-100 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-emerald-500 to-green-400 border-2 border-white rounded-full shadow-xl shadow-emerald-500/90 text-white z-10 shrink-0';
              if (ring1El) ring1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-emerald-400/20 animate-ping pointer-events-none shrink-0';
              if (ring2El) ring2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-emerald-500/30 animate-pulse pointer-events-none shrink-0';
            } else if (truckVisualPhase === 'splicing') {
              if (dotEl) dotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-amber-400 animate-pulse shrink-0 inline-block';
              if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-amber-400/80 text-amber-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-amber-600 to-yellow-400 border-2 border-white rounded-full shadow-xl shadow-amber-500/90 text-white z-10 animate-pulse shrink-0';
              if (ring1El) ring1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-amber-400/30 animate-ping pointer-events-none shrink-0';
              if (ring2El) ring2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-yellow-500/40 animate-pulse pointer-events-none shrink-0';
            } else if (truckVisualPhase === 'severed') {
              if (dotEl) dotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-rose-400 animate-pulse shrink-0 inline-block';
              if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-rose-500/80 text-rose-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-rose-600 to-red-400 border-2 border-white rounded-full shadow-xl shadow-rose-500/80 text-white z-10 shrink-0';
              if (ring1El) ring1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-rose-400/30 animate-ping pointer-events-none shrink-0';
              if (ring2El) ring2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-rose-500/40 animate-pulse pointer-events-none shrink-0';
            } else {
              if (dotEl) dotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-emerald-400 animate-pulse shrink-0 inline-block';
              if (labelEl) labelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-emerald-500/60 text-emerald-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (rotatorEl) rotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-white rounded-full shadow-xl shadow-emerald-500/80 text-white z-10 shrink-0';
              if (ring1El) ring1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-emerald-400/25 animate-ping pointer-events-none shrink-0';
              if (ring2El) ring2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-emerald-500/35 animate-pulse pointer-events-none shrink-0';
            }
          }
        }

        // --- SUBSEA CABLE SHIP ANIMATION & HEADING ---
        let shipBearing = 0;
        if (hasMaritime && maritimeLine && shipMarkerRef.current) {
          const shipCurrentKm = Math.min(maritimeTotalKm, Math.max(0, currentPct * maritimeTotalKm));
          const shipPt = turf.along(maritimeLine, shipCurrentKm, { units: 'kilometers' });
          const shipCoords = shipPt.geometry.coordinates as [number, number];

          shipMarkerRef.current.setLngLat(shipCoords);

          // Globe Horizon Occlusion: Hide subsea ship if camera is looking at the opposite hemisphere
          const distShipToCam = turf.distance(camPoint, turf.point(shipCoords), { units: 'kilometers' });
          const isShipVisible = distShipToCam < 9200;
          shipMarkerRef.current.getElement().style.opacity = isShipVisible ? '1' : '0';
          shipMarkerRef.current.getElement().style.pointerEvents = isShipVisible ? 'auto' : 'none';

          if (isRtb) {
            // Direct reverse heading towards coastal port (no modulo 180 snap)
            if (shipCurrentKm > 0.05) {
              const prevKm = Math.max(0, shipCurrentKm - Math.max(0.05, maritimeTotalKm * 0.015));
              const targetPt = turf.along(maritimeLine, prevKm, { units: 'kilometers' });
              shipBearing = turf.bearing(shipPt, targetPt);
            } else {
              const p0 = turf.along(maritimeLine, 0, { units: 'kilometers' });
              const p1 = turf.along(maritimeLine, Math.min(maritimeTotalKm, 0.1), { units: 'kilometers' });
              shipBearing = turf.bearing(p1, p0);
            }
          } else {
            // Outbound heading towards subsea rupture
            if (shipCurrentKm < maritimeTotalKm - 0.05) {
              const nextKm = Math.min(maritimeTotalKm, shipCurrentKm + Math.max(0.05, maritimeTotalKm * 0.015));
              const nextPt = turf.along(maritimeLine, nextKm, { units: 'kilometers' });
              shipBearing = turf.bearing(shipPt, nextPt);
            } else {
              const prevKm = Math.max(0, maritimeTotalKm - Math.max(0.05, maritimeTotalKm * 0.015));
              const prevPt = turf.along(maritimeLine, prevKm, { units: 'kilometers' });
              shipBearing = turf.bearing(prevPt, shipPt);
            }
          }

          const shipMarkerEl = shipMarkerRef.current.getElement();
          const shipRotatorEl = shipMarkerEl.querySelector<HTMLDivElement>('#ship-rotator');
          const shipHeadingArrowEl = shipMarkerEl.querySelector<HTMLDivElement>('#ship-heading-arrow');
          const shipSvgEl = shipMarkerEl.querySelector<SVGElement>('#ship-svg');
          const shipLabelEl = shipMarkerEl.querySelector<HTMLDivElement>('#ship-floating-label');
          const shipDotEl = shipMarkerEl.querySelector<HTMLSpanElement>('#ship-status-dot');
          const shipTextEl = shipMarkerEl.querySelector<HTMLSpanElement>('#ship-status-text');
          const shipRing1El = shipMarkerEl.querySelector<HTMLDivElement>('#ship-radar-ring1');
          const shipRing2El = shipMarkerEl.querySelector<HTMLDivElement>('#ship-radar-ring2');

          if (shipHeadingArrowEl) {
            shipHeadingArrowEl.style.transform = `rotate(${Math.round(shipBearing)}deg)`;
          }
          if (shipSvgEl) {
            const isShipWest = Math.sin((shipBearing * Math.PI) / 180) < 0;
            shipSvgEl.style.transform = isShipWest ? 'scaleX(-1)' : 'scaleX(1)';
          }

          let shipVisualPhase: 'docked' | 'rtb' | 'restored' | 'splicing' | 'severed' | 'transit' = 'transit';
          let shipTargetText = '';

          if (phase === 'restored') {
            if (isRtb && rtbProgress >= 0.95) {
              shipVisualPhase = 'docked';
              shipTargetText = curLang === 'en' ? 'Docked at Port (Standby)' : 'Atracado en Puerto (Standby)';
            } else if (isRtb) {
              shipVisualPhase = 'rtb';
              shipTargetText = curLang === 'en' ? 'Returning to Port' : 'Regresando a Puerto';
            } else {
              shipVisualPhase = 'restored';
              shipTargetText = curLang === 'en' ? 'Subsea Cable Restored' : 'Cable Submarino Restaurado';
            }
          } else if (currentPct >= 0.98 || prog >= 75) {
            shipVisualPhase = 'splicing';
            shipTargetText = curLang === 'en' ? `Subsea ROV Splicing (${prog}%)` : `Empalme Submarino ROV (${prog}%)`;
          } else if (phase === 'severed') {
            shipVisualPhase = 'severed';
            shipTargetText = curLang === 'en' ? 'Subsea Cable Ship Dispatched' : 'Buque Cablero Despachado';
          } else {
            shipVisualPhase = 'transit';
            shipTargetText = curLang === 'en' ? `CS-Kiro Navigating (${Math.round(currentPct * 100)}%)` : `Buque CS-Kiro Navegando (${Math.round(currentPct * 100)}%)`;
          }

          if (shipTextEl && shipTextEl.textContent !== shipTargetText) {
            shipTextEl.textContent = shipTargetText;
          }

          if (shipMarkerEl.dataset.visualPhase !== shipVisualPhase) {
            shipMarkerEl.dataset.visualPhase = shipVisualPhase;
            if (shipVisualPhase === 'docked') {
              if (shipDotEl) shipDotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-cyan-400 shrink-0 inline-block';
              if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-cyan-400 text-cyan-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-cyan-600 to-sky-500 border-2 border-white rounded-full shadow-xl shadow-cyan-500/60 text-white z-10 shrink-0';
              if (shipRing1El) shipRing1El.className = 'hidden';
              if (shipRing2El) shipRing2El.className = 'hidden';
            } else if (shipVisualPhase === 'rtb') {
              if (shipDotEl) shipDotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-sky-400 animate-pulse shrink-0 inline-block';
              if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-sky-400 text-sky-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-sky-600 to-cyan-500 border-2 border-white rounded-full shadow-xl shadow-sky-500/80 text-white z-10 shrink-0';
              if (shipRing1El) shipRing1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-sky-400/20 animate-ping pointer-events-none shrink-0';
              if (shipRing2El) shipRing2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-sky-500/30 animate-pulse pointer-events-none shrink-0';
            } else if (shipVisualPhase === 'restored') {
              if (shipDotEl) shipDotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-cyan-400 shrink-0 inline-block';
              if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-cyan-400 text-cyan-100 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-cyan-500 to-teal-400 border-2 border-white rounded-full shadow-xl shadow-cyan-500/90 text-white z-10 shrink-0';
              if (shipRing1El) shipRing1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-cyan-400/20 animate-ping pointer-events-none shrink-0';
              if (shipRing2El) shipRing2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-cyan-500/30 animate-pulse pointer-events-none shrink-0';
            } else if (shipVisualPhase === 'splicing') {
              if (shipDotEl) shipDotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-amber-400 animate-pulse shrink-0 inline-block';
              if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-amber-400/80 text-amber-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-amber-600 to-yellow-400 border-2 border-white rounded-full shadow-xl shadow-amber-500/90 text-white z-10 animate-pulse shrink-0';
              if (shipRing1El) shipRing1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-amber-400/30 animate-ping pointer-events-none shrink-0';
              if (shipRing2El) shipRing2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-yellow-500/40 animate-pulse pointer-events-none shrink-0';
            } else if (shipVisualPhase === 'severed') {
              if (shipDotEl) shipDotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-cyan-400 animate-pulse shrink-0 inline-block';
              if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-cyan-500/80 text-cyan-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-cyan-600 to-sky-400 border-2 border-white rounded-full shadow-xl shadow-cyan-500/80 text-white z-10 shrink-0';
              if (shipRing1El) shipRing1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-cyan-400/30 animate-ping pointer-events-none shrink-0';
              if (shipRing2El) shipRing2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-cyan-500/40 animate-pulse pointer-events-none shrink-0';
            } else {
              if (shipDotEl) shipDotEl.className = 'w-2 h-2 min-w-[8px] min-h-[8px] aspect-square rounded-full bg-cyan-400 animate-pulse shrink-0 inline-block';
              if (shipLabelEl) shipLabelEl.className = 'absolute bottom-9 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-[#0B0F19]/95 border border-cyan-500/60 text-cyan-200 text-[10px] font-mono font-bold whitespace-nowrap shadow-2xl pointer-events-none flex items-center gap-1.5';
              if (shipRotatorEl) shipRotatorEl.className = 'relative flex items-center justify-center w-8 h-8 bg-gradient-to-tr from-cyan-600 to-sky-400 border-2 border-white rounded-full shadow-xl shadow-cyan-500/80 text-white z-10 shrink-0';
              if (shipRing1El) shipRing1El.className = 'absolute w-14 h-14 min-w-[56px] min-h-[56px] aspect-square rounded-full bg-cyan-400/25 animate-ping pointer-events-none shrink-0';
              if (shipRing2El) shipRing2El.className = 'absolute w-11 h-11 min-w-[44px] min-h-[44px] aspect-square rounded-full bg-cyan-500/35 animate-pulse pointer-events-none shrink-0';
            }
          }
        }

        // --- REAL-TIME VEHICLE DETAILS POPUP TRACKING ---
        if (activePopupRef.current && activeVehiclePopupTargetRef.current) {
          if (activeVehiclePopupTargetRef.current === 'truck' && truckMarkerRef.current) {
            activePopupRef.current.setLngLat(coords);
            const badgeEl = activePopupRef.current.getElement().querySelector('#popup-truck-badge');
            if (badgeEl) badgeEl.textContent = phase === 'restored' ? '100% OK' : `${prog}%`;
            const statusEl = activePopupRef.current.getElement().querySelector('#popup-truck-status');
            if (statusEl) statusEl.textContent = phase === 'restored' ? (curLang === 'en' ? 'Restored' : 'Restaurado') : (curLang === 'en' ? 'In Progress' : 'En Curso');
          } else if (activeVehiclePopupTargetRef.current === 'ship' && hasMaritime && maritimeLine && shipMarkerRef.current) {
            const shipCurrentKm = Math.min(maritimeTotalKm, Math.max(0, currentPct * maritimeTotalKm));
            const shipPt = turf.along(maritimeLine, shipCurrentKm, { units: 'kilometers' });
            const sCoords = shipPt.geometry.coordinates as [number, number];
            activePopupRef.current.setLngLat(sCoords);
            const badgeEl = activePopupRef.current.getElement().querySelector('#popup-ship-badge');
            if (badgeEl) badgeEl.textContent = phase === 'restored' ? '100% OK' : `${prog}%`;
            const statusEl = activePopupRef.current.getElement().querySelector('#popup-ship-status');
            if (statusEl) statusEl.textContent = phase === 'restored' ? (curLang === 'en' ? 'Restored' : 'Restaurado') : (curLang === 'en' ? 'In Progress' : 'En Curso');
          }
        }

        // --- COMFORTABLE DRONE CAMERA FOLLOW (CAR / SHIP) ---
        const now = performance.now();
        const activeTrackMode = trackingModeRef.current;
        const elapsedSinceDispatch = Date.now() - (dispatchStartTimeRef.current || 0);
        const minDelay = curEvent?.attackType === 'EARTHSHAKER' ? 4800 : 2600;

        if (
          (activeTrackMode === 'truck' || activeTrackMode === 'ship') &&
          elapsedSinceDispatch > minDelay &&
          now - lastTrackingEaseTimeRef.current > 140
        ) {
          lastTrackingEaseTimeRef.current = now;
          let targetCenter: [number, number] | null = null;
          let targetBearing = -15;

          if (activeTrackMode === 'truck' && truckMarkerRef.current) {
            targetCenter = coords;
            targetBearing = Math.round(bearing * 0.25 - 15);
          } else if (activeTrackMode === 'ship' && hasMaritime && maritimeLine && shipMarkerRef.current) {
            const shipCurrentKm = Math.min(maritimeTotalKm, Math.max(0, currentPct * maritimeTotalKm));
            const shipPt = turf.along(maritimeLine, shipCurrentKm, { units: 'kilometers' });
            targetCenter = shipPt.geometry.coordinates as [number, number];
            targetBearing = Math.round(shipBearing * 0.25 - 15);
          }

          if (targetCenter && map) {
            map.easeTo({
              center: targetCenter,
              zoom: activeTrackMode === 'truck' ? 9.8 : 9.6,
              pitch: 52,
              bearing: targetBearing,
              duration: 200,
              easing: (t) => t,
            });
          }
        }

        if (shouldShowTruck || returningFleetRef.current.length > 0) {
          truckAnimationRef.current = requestAnimationFrame(animateVehicles);
        } else {
          truckAnimationRef.current = null;
        }
      };

      animateVehicles();
    }

    return () => {
      if (truckAnimationRef.current) {
        cancelAnimationFrame(truckAnimationRef.current);
        truckAnimationRef.current = null;
      }
    };
  }, [nodes, cables, faultLines, activeEvent, reroutedCableIds, pingCableIds, showSubmarine, showTerrestrial, showNodes, showFaults, showRepairRoutes, styleLoaded, incidentPhase, lang]);

  // --- BGP PING OPTICAL PACKET PULSE ANIMATION (MULTI-PING SUPPORT) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleLoaded) return;

    const effectivePings: ActivePing[] =
      activePings && activePings.length > 0
        ? activePings
        : pingResult && pingResult.path && pingResult.path.length >= 2
        ? [
            {
              id: 'default-ping',
              originId: pingResult.path[0],
              targetId: pingResult.path[pingResult.path.length - 1],
              originName: pingResult.originName,
              targetName: pingResult.targetName,
              path: pingResult.path,
              cableIds: pingCableIds,
              rttMs: pingResult.rttMs,
              hops: pingResult.hops,
              timestamp: Date.now(),
            },
          ]
        : [];

    if (effectivePings.length === 0) {
      pingPacketMarkersMapRef.current.forEach((marker) => marker.remove());
      pingPacketMarkersMapRef.current.clear();
      mapContainerRef.current?.querySelectorAll('.ping-packet-marker').forEach((el) => el.remove());
      if (pingAnimationRef.current) {
        cancelAnimationFrame(pingAnimationRef.current);
        pingAnimationRef.current = null;
      }
      if (!activePopupRef.current) {
        syncPingBeacons();
      }
      return;
    }

    // Highlight primary/first ping origin & destination with beacons
    const primaryPing = effectivePings[0];
    const originNode = nodes.find((n) => n.id === primaryPing.path[0]);
    if (originNode) {
      const originLabel =
        lang === 'en'
          ? `ORIGIN: ${originNode.city || originNode.name}`
          : `ORIGEN: ${originNode.city || originNode.name}`;
      updatePingOriginBeacon(originNode.coordinates, originLabel);
    }
    const targetNode = nodes.find((n) => n.id === primaryPing.path[primaryPing.path.length - 1]);
    if (targetNode) {
      const targetLabel =
        lang === 'en'
          ? `TARGET: ${targetNode.city || targetNode.name}`
          : `DESTINO: ${targetNode.city || targetNode.name}`;
      updatePingTargetBeacon(targetNode.coordinates, targetLabel);
    }

    interface PacketTrack {
      id: string;
      marker: maplibregl.Marker;
      sampledCoords: [number, number][];
      isPathSevered: boolean;
      cycleDurationMs: number;
    }

    const currentPingIds = new Set(effectivePings.map((p) => p.id));
    pingPacketMarkersMapRef.current.forEach((marker, id) => {
      if (!currentPingIds.has(id)) {
        marker.remove();
        pingPacketMarkersMapRef.current.delete(id);
      }
    });

    const SAMPLE_COUNT = 80;
    const packetTracks: PacketTrack[] = [];

    for (const ping of effectivePings) {
      const pathNodes = ping.path;
      if (!pathNodes || pathNodes.length < 2) continue;

      const fullPingCoords: [number, number][] = [];
      let isPathSevered = false;

      for (let i = 0; i < pathNodes.length - 1; i++) {
        const u = pathNodes[i];
        const v = pathNodes[i + 1];

        const matchCable = cables.find(
          (c) => (c.source === u && c.target === v) || (c.source === v && c.target === u)
        );

        if (matchCable && matchCable.status === 'severed') {
          isPathSevered = true;
          if (matchCable.coordinates.length > 0) {
            const firstPt =
              matchCable.source === u
                ? matchCable.coordinates[0]
                : matchCable.coordinates[matchCable.coordinates.length - 1];
            fullPingCoords.push(firstPt);
          }
          break;
        }

        if (matchCable && matchCable.coordinates.length > 0) {
          const segCoords =
            matchCable.source === u
              ? matchCable.coordinates
              : [...matchCable.coordinates].reverse();
          for (let k = 0; k < segCoords.length; k++) {
            if (
              fullPingCoords.length === 0 ||
              fullPingCoords[fullPingCoords.length - 1][0] !== segCoords[k][0] ||
              fullPingCoords[fullPingCoords.length - 1][1] !== segCoords[k][1]
            ) {
              fullPingCoords.push(segCoords[k]);
            }
          }
        } else {
          const nodeU = nodes.find((n) => n.id === u);
          const nodeV = nodes.find((n) => n.id === v);
          if (nodeU && nodeV) {
            if (fullPingCoords.length === 0) fullPingCoords.push(nodeU.coordinates);
            fullPingCoords.push(nodeV.coordinates);
          }
        }
      }

      if (fullPingCoords.length < 2 && isPathSevered && pathNodes.length > 0) {
        const oNode = nodes.find((n) => n.id === pathNodes[0]);
        if (oNode) {
          fullPingCoords.push(oNode.coordinates);
          fullPingCoords.push([oNode.coordinates[0] + 0.0001, oNode.coordinates[1] + 0.0001]);
        }
      }

      for (let i = 1; i < fullPingCoords.length; i++) {
        const prevLon = fullPingCoords[i - 1][0];
        let curLon = fullPingCoords[i][0];
        while (curLon - prevLon > 180) curLon -= 360;
        while (curLon - prevLon < -180) curLon += 360;
        fullPingCoords[i] = [curLon, fullPingCoords[i][1]];
      }

      if (fullPingCoords.length < 2) continue;

      const line = turf.lineString(fullPingCoords);
      const totalKm = Math.max(0.1, turf.length(line, { units: 'kilometers' }));
      const sampledCoords: [number, number][] = [];
      for (let s = 0; s <= SAMPLE_COUNT; s++) {
        const stepKm = (s / SAMPLE_COUNT) * totalKm;
        const sampledPoint = turf.along(line, stepKm, { units: 'kilometers' });
        sampledCoords.push(sampledPoint.geometry.coordinates as [number, number]);
      }

      const shortOriginCity = (ping.originName || '').split(' (')[0];
      const shortTargetCity = (ping.targetName || '').split(' (')[0];
      const labelText = isPathSevered
        ? (lang === 'en' ? 'DROP: Fiber Severed' : 'DROP: Fibra Cortada')
        : `${shortOriginCity} » ${shortTargetCity} (${ping.rttMs}ms)`;

      let marker = pingPacketMarkersMapRef.current.get(ping.id);
      if (!marker) {
        const el = document.createElement('div');
        el.className = 'ping-packet-marker pointer-events-none';
        el.innerHTML = `
          <div class="relative flex items-center justify-center">
            <div id="ping-ring-1" class="absolute -inset-3 rounded-full ${isPathSevered ? 'bg-rose-500/50' : 'bg-cyan-400/40'} animate-ping pointer-events-none"></div>
            <div id="ping-ring-2" class="absolute -inset-1.5 rounded-full ${isPathSevered ? 'bg-rose-400/60' : 'bg-cyan-300/60'} animate-pulse pointer-events-none"></div>
            <div id="ping-core" class="relative flex items-center justify-center w-7 h-7 ${isPathSevered ? 'bg-gradient-to-tr from-rose-600 to-red-400 shadow-[0_0_20px_rgba(244,63,94,1)]' : 'bg-gradient-to-tr from-cyan-600 to-teal-400 shadow-[0_0_20px_rgba(34,211,238,1)]'} border-2 border-white rounded-full text-[12px] text-white font-black z-10 transition-colors duration-300">
              ${isPathSevered ? '<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' : '<span class="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#FFF] animate-ping"></span>'}
            </div>
            <div id="ping-label" class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md ${isPathSevered ? 'bg-rose-950/95 border-rose-500/80 text-rose-200' : 'bg-slate-950/95 border-cyan-400/80 text-cyan-200'} border text-[9px] font-mono font-bold whitespace-nowrap shadow-2xl backdrop-blur-md transition-colors duration-300">
              ${labelText}
            </div>
          </div>
        `;
        marker = new maplibregl.Marker({ element: el })
          .setLngLat(fullPingCoords[0])
          .addTo(map);
        pingPacketMarkersMapRef.current.set(ping.id, marker);
      } else {
        const el = marker.getElement();
        const ring1 = el.querySelector<HTMLDivElement>('#ping-ring-1');
        const ring2 = el.querySelector<HTMLDivElement>('#ping-ring-2');
        const core = el.querySelector<HTMLDivElement>('#ping-core');
        const label = el.querySelector<HTMLDivElement>('#ping-label');
        if (ring1) ring1.className = `absolute -inset-3 rounded-full ${isPathSevered ? 'bg-rose-500/50' : 'bg-cyan-400/40'} animate-ping pointer-events-none`;
        if (ring2) ring2.className = `absolute -inset-1.5 rounded-full ${isPathSevered ? 'bg-rose-400/60' : 'bg-cyan-300/60'} animate-pulse pointer-events-none`;
        if (core) {
          core.className = `relative flex items-center justify-center w-7 h-7 ${isPathSevered ? 'bg-gradient-to-tr from-rose-600 to-red-400 shadow-[0_0_20px_rgba(244,63,94,1)]' : 'bg-gradient-to-tr from-cyan-600 to-teal-400 shadow-[0_0_20px_rgba(34,211,238,1)]'} border-2 border-white rounded-full text-[12px] text-white font-black z-10 transition-colors duration-300`;
          core.innerHTML = isPathSevered ? '<svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' : '<span class="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#FFF] animate-ping"></span>';
        }
        if (label) {
          label.className = `absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md ${isPathSevered ? 'bg-rose-950/95 border-rose-500/80 text-rose-200' : 'bg-slate-950/95 border-cyan-400/80 text-cyan-200'} border text-[9px] font-mono font-bold whitespace-nowrap shadow-2xl backdrop-blur-md transition-colors duration-300`;
          label.textContent = labelText;
        }
      }

      packetTracks.push({
        id: ping.id,
        marker,
        sampledCoords,
        isPathSevered,
        cycleDurationMs: isPathSevered ? 1800 : 2200,
      });
    }

    if (pingAnimationRef.current) cancelAnimationFrame(pingAnimationRef.current);
    const startTime = performance.now();

    const animatePackets = () => {
      const elapsed = performance.now() - startTime;
      for (const track of packetTracks) {
        const progress = track.isPathSevered
          ? Math.min(1.0, (elapsed % track.cycleDurationMs) / (track.cycleDurationMs * 0.75))
          : (elapsed % track.cycleDurationMs) / track.cycleDurationMs;
        const sampleIdx = Math.min(SAMPLE_COUNT, Math.floor(progress * SAMPLE_COUNT));
        const coords = track.sampledCoords[sampleIdx] || track.sampledCoords[track.sampledCoords.length - 1];
        if (coords) {
          track.marker.setLngLat(coords);
        }
      }
      pingAnimationRef.current = requestAnimationFrame(animatePackets);
    };

    animatePackets();

    return () => {
      if (pingAnimationRef.current) {
        cancelAnimationFrame(pingAnimationRef.current);
        pingAnimationRef.current = null;
      }
      pingPacketMarkersMapRef.current.forEach((marker) => marker.remove());
      pingPacketMarkersMapRef.current.clear();
      mapContainerRef.current?.querySelectorAll('.ping-packet-marker').forEach((el) => el.remove());
    };
  }, [activePings, pingResult, cables, nodes, styleLoaded, lang]);

  // --- SYNC BEACONS WITH CHAOS CONTROL DECK SELECTIONS ---
  useEffect(() => {
    if (!styleLoaded) return;
    if (activePopupRef.current) return; // Active popup manages its own preview beacons
    syncPingBeacons();
  }, [selectedPingOrigin, selectedPingTarget, nodes, styleLoaded, lang, pingResult, activePings, syncPingBeacons]);

  // Clear any active popups or HUD menus when entering Cover Mode
  useEffect(() => {
    if (coverMode) {
      if (activePopupRef.current) {
        activePopupRef.current.remove();
        activePopupRef.current = null;
      }
      activeVehiclePopupTargetRef.current = null;
    }
  }, [coverMode]);

  return (
    <div className="relative w-full h-full">
      {/* 1. MapLibre GL JS Container (100% interactive) */}
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{ cursor: isCutActive ? 'crosshair' : 'grab' }}
      />

      {/* 2. Floating Layer Filter Bar — Docked at Bottom-Left next to Compass (Zero overlap with Right Telemetry Drawer) */}
      {!coverMode && (
        <div
          className="absolute bottom-[60px] left-3 right-3 sm:bottom-4 sm:left-[90px] sm:right-auto z-20 flex items-center gap-1 sm:gap-1.5 bg-[#0B0F19]/92 backdrop-blur-xl border border-slate-700/80 px-2.5 sm:px-3 py-1.5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] text-[10px] font-mono pointer-events-auto transition-all duration-300 flex-nowrap overflow-x-auto no-scrollbar whitespace-nowrap max-w-[calc(100vw-24px)] sm:max-w-[calc(100vw-535px)] xl:max-w-[calc(100vw-590px)] 2xl:max-w-none"
        >
          <button
            onClick={() => setShowSubmarine(!showSubmarine)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border transition flex items-center gap-1 text-[9px] sm:text-[10px] shrink-0 ${
              showSubmarine
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-900/40'
                : 'bg-slate-900/50 text-slate-500 border-slate-800'
            }`}
            title="Toggle Submarine Cables"
          >
            <Globe className="w-3 h-3 shrink-0" />
            <span>{t.mapHud.layerSubmarine}</span>
          </button>

          <button
            onClick={() => setShowTerrestrial(!showTerrestrial)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border transition flex items-center gap-1 text-[9px] sm:text-[10px] shrink-0 ${
              showTerrestrial
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-900/40'
                : 'bg-slate-900/50 text-slate-500 border-slate-800'
            }`}
            title="Toggle Andean Terrestrial Fiber"
          >
            <Mountain className="w-3 h-3 shrink-0" />
            <span>{t.mapHud.layerTerrestrial}</span>
          </button>

          <button
            onClick={() => setShowNodes(!showNodes)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border transition flex items-center gap-1 text-[9px] sm:text-[10px] shrink-0 ${
              showNodes
                ? 'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-900/40'
                : 'bg-slate-900/50 text-slate-500 border-slate-800'
            }`}
            title="Toggle AWS Regions & IXPs"
          >
            <Cloud className="w-3 h-3 shrink-0" />
            <span>{t.mapHud.layerNodes}</span>
          </button>

          <button
            onClick={() => setShowFaults(!showFaults)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border transition flex items-center gap-1 text-[9px] sm:text-[10px] shrink-0 ${
              showFaults
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-900/40'
                : 'bg-slate-900/50 text-slate-500 border-slate-800'
            }`}
            title="Toggle Seismic Fault Lines"
          >
            <Flame className="w-3 h-3 shrink-0" />
            <span>{t.mapHud.layerFaults}</span>
          </button>

          <button
            onClick={() => setShowRepairRoutes(!showRepairRoutes)}
            className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border transition flex items-center gap-1 text-[9px] sm:text-[10px] shrink-0 ${
              showRepairRoutes
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-900/40'
                : 'bg-slate-900/50 text-slate-500 border-slate-800'
            }`}
            title="Toggle Repair Vehicle Routes"
          >
            <Truck className="w-3 h-3 shrink-0" />
            <span>{t.mapHud.layerRoutes}</span>
          </button>

          <div className="w-px h-3.5 bg-slate-700 mx-0.5 shrink-0" />

          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: [-68.0, -15.0],
                  zoom: 2.2,
                  pitch: 0,
                  bearing: 0,
                  duration: 2500,
                });
              }
              if (onResetCameraToOrbit) {
                onResetCameraToOrbit();
              }
            }}
            className="px-2 sm:px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 transition flex items-center gap-1.5 font-bold text-[9px] sm:text-[10px] shrink-0 cursor-pointer"
            title="Reset Camera to 3D Orbit Space View"
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>{t.mapHud.orbitView}</span>
          </button>
        </div>
      )}

      {/* 3. 3D Tactical NOC Gimbal / Compass & Camera Controls (Positioned at Bottom-Left, 100% free from 3D Kiro) */}
      {!coverMode && (
        <div className="absolute bottom-28 left-3 sm:bottom-4 sm:left-4 z-20 flex flex-col items-center gap-1 bg-[#0B0F19]/92 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-1.5 sm:p-2 shadow-2xl select-none font-mono text-[10px] pointer-events-auto scale-90 sm:scale-100 origin-bottom-left">
          {/* Interactive Nautical Dial Compass (48x48px) */}
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.easeTo({ bearing: 0, pitch: 0, duration: 800 });
              }
            }}
            className="relative w-12 h-12 rounded-full bg-slate-950 border border-slate-700 hover:border-amber-500/80 transition shadow-inner flex items-center justify-center group cursor-pointer"
            title={lang === 'en' ? 'Click to Reset North (Bearing: 0°, Pitch: 0°)' : 'Clic para Alinear al Norte (Rumbo: 0°, Inclinación: 0°)'}
          >
            {/* Outer Graduated Ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/30"></div>
            {/* Cardinal Marks */}
            <span className="absolute top-0.5 text-[8px] font-bold text-amber-400">N</span>
            <span className="absolute bottom-0.5 text-[7px] text-slate-500">S</span>
            <span className="absolute left-1 text-[7px] text-slate-500">W</span>
            <span className="absolute right-1 text-[7px] text-slate-500">E</span>
            
            {/* Rotating Two-Tone Needle SVG */}
            <svg
              className="w-8 h-8 transition-transform duration-100 ease-out drop-shadow-md"
              style={{
                transform: `rotate(${-mapBearing}deg) rotateX(${Math.min(60, mapPitch)}deg)`,
              }}
              viewBox="0 0 24 24"
            >
              {/* North pointer: Bright Amber/Red */}
              <polygon points="12,2 15,12 12,10" fill="#FF9900" />
              <polygon points="12,2 9,12 12,10" fill="#EF4444" />
              {/* South pointer: Cyan/Blue */}
              <polygon points="12,22 15,12 12,14" fill="#38BDF8" />
              <polygon points="12,22 9,12 12,14" fill="#0284C7" />
              {/* Center Pivot */}
              <circle cx="12" cy="12" r="1.5" fill="#FFFFFF" />
            </svg>
          </button>

          {/* Digital Readout */}
          <div className="text-[9px] text-slate-400 font-bold tracking-tight">
            {String(Math.round((mapBearing + 360) % 360)).padStart(3, '0')}° | {String(Math.round(mapPitch)).padStart(2, '0')}°
          </div>

          <div className="w-8 h-px bg-slate-800 my-0.5" />

          {/* 2D / 3D Tilt Toggle */}
          <button
            onClick={() => {
              if (mapRef.current) {
                const currentPitch = mapRef.current.getPitch();
                mapRef.current.easeTo({
                  pitch: currentPitch > 25 ? 0 : 60,
                  duration: 600,
                });
              }
            }}
            className={`px-2 py-0.5 rounded-lg border text-[9px] font-bold transition cursor-pointer ${
              mapPitch > 25
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={mapPitch > 25 ? 'Switch to 2D Top-Down View' : 'Switch to 3D Tilted View'}
          >
            {mapPitch > 25 ? '3D' : '2D'}
          </button>

          {/* Zoom In (+) */}
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.zoomIn({ duration: 300 });
              }
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            title="Zoom In"
          >
            +
          </button>

          {/* Zoom Out (-) */}
          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.zoomOut({ duration: 300 });
              }
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
            title="Zoom Out"
          >
            -
          </button>

          {/* Reset Orbit Button */}
          <button
            onClick={() => {
              setTrackingMode('free');
              trackingModeRef.current = 'free';
              if (mapRef.current) {
                mapRef.current.flyTo({
                  center: [-68.0, -15.0],
                  zoom: 2.2,
                  pitch: 0,
                  bearing: 0,
                  duration: 2500,
                });
              }
              if (onResetCameraToOrbit) {
                onResetCameraToOrbit();
              }
            }}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 transition cursor-pointer"
            title="Reset to Planetary Orbit View"
          >
            <Globe className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3D Drone Follow Cam Tracking Pill HUD (Positioned cleanly below the Incident Progress Banner) */}
      {!coverMode && shouldShowVehicles && (
        <div className="absolute top-[160px] sm:top-[134px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="px-2.5 py-1.5 rounded-full bg-[#0B0F19]/95 border border-cyan-500/50 shadow-2xl backdrop-blur-xl flex items-center gap-1.5 text-xs font-mono max-w-[95vw] overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1 pl-1 pr-1.5 text-cyan-400 font-bold border-r border-slate-700/60 shrink-0">
              <Camera className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              <span className="hidden sm:inline text-[11px] tracking-wider uppercase">
                {lang === 'en' ? 'Follow Cam:' : 'Cámara Drone:'}
              </span>
            </div>

            {/* Truck Button */}
            <button
              onClick={() => handleSelectTracking('truck')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                trackingMode === 'truck'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
              title={lang === 'en' ? 'Lock follow camera onto AWS Repair Crew' : 'Fijar cámara en la Cuadrilla AWS'}
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'en' ? (hasMaritimeVehicle ? 'AWS Crew' : 'Follow Crew') : (hasMaritimeVehicle ? 'Camión AWS' : 'Seguir Camión')}</span>
            </button>

            {/* Cable Ship Button (if maritime cut) */}
            {hasMaritimeVehicle && (
              <button
                onClick={() => handleSelectTracking('ship')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                  trackingMode === 'ship'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
                }`}
                title={lang === 'en' ? 'Lock follow camera onto Subsea Cable Ship' : 'Fijar cámara en el Buque Cablero Submarino'}
              >
                <Anchor className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{lang === 'en' ? 'Cable Ship' : 'Buque CS-Kiro'}</span>
              </button>
            )}

            {/* Overview Button */}
            <button
              onClick={() => handleSelectTracking('overview')}
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                trackingMode === 'overview'
                  ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-400/80 shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
              title={lang === 'en' ? 'Show whole route and incident area' : 'Ver ruta completa y área del incidente'}
            >
              <Globe className="w-3 h-3" />
              <span>{lang === 'en' ? 'Overview' : 'Panorámica'}</span>
            </button>

            {/* Free Cam Button */}
            <button
              onClick={() => handleSelectTracking('free')}
              className={`px-2 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0 ${
                trackingMode === 'free'
                  ? 'bg-slate-700/60 text-slate-200 border border-slate-500 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/60'
              }`}
              title={lang === 'en' ? 'Free camera movement (or drag map anytime)' : 'Cámara libre (o arrastra el mapa cuando quieras)'}
            >
              <Unlock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              <span>{lang === 'en' ? 'Free' : 'Libre'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Fiber Cut Mode Warning Pill */}
      {!coverMode && isCutActive && (
        <div
          className={`absolute ${
            shouldShowVehicles
              ? 'top-[202px] sm:top-[176px]'
              : activeEvent
              ? 'top-[160px] sm:top-[134px]'
              : 'top-20'
          } left-1/2 -translate-x-1/2 bg-rose-950/90 text-rose-200 border border-rose-500/80 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none text-xs font-mono animate-pulse z-30 transition-all duration-300`}
        >
          <Scissors className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-bold text-rose-400">{lang === 'en' ? 'SIMULATE FIBER CUT MODE:' : 'MODO SIMULACIÓN CORTE DE FIBRA:'}</span>
          <span>{t.mapHud.cutPrompt}</span>
        </div>
      )}
    </div>
  );
};
