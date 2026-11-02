import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Camera, CheckCircle2, AlertTriangle, Zap, Truck, Crosshair } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Map as MapLibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { NODES, CABLES, FAULT_LINES } from './data/topologyData';
import { NetworkNode, NetworkCable, KiroAttackEvent, AwsRouteResult, KiroCrater, ActivePing } from './types/spatial';
import { NetworkGraphEngine, snapPointToCable, DijkstraResult } from './services/networkGraphEngine';
import { awsLocation } from './services/awsLocationClient';
import { soundFx } from './services/soundEffects';
import { GiantKiroStage, KiroAnimationState } from './components/GiantKiroStage';
import { GlobeMapCanvas } from './components/GlobeMapCanvas';
import { TopHudBar } from './components/TopHudBar';
import { ChaosControlDeck } from './components/ChaosControlDeck';
import { AwsTelemetryDrawer } from './components/AwsTelemetryDrawer';
import { ArchitectureModal } from './components/ArchitectureModal';
import { AwsChaosOverlay } from './components/AwsChaosOverlay';
import { AwsBootSplash } from './components/AwsBootSplash';
import { CoverShowcaseBadge } from './components/CoverShowcaseBadge';
import { Language, TRANSLATIONS } from './i18n/translations';

// Helper to determine if a geographic coordinate is located offshore in open ocean/sea waters
function isOffshoreLocation(coords: [number, number]): boolean {
  const [lng, lat] = coords;

  // 1. South America - Pacific Ocean (West of Chile / Peru coast)
  if (lat >= -45 && lat <= -3) {
    if (lat <= -18.4 && lng < -70.4) return true; // Offshore Chile
    if (lat > -18.4 && lat <= -14.0 && lng < -71.5) return true; // Offshore Southern Peru
    if (lat > -14.0 && lat <= -8.0 && lng < -76.5) return true; // Offshore Central Peru
    if (lat > -8.0 && lat <= -3.0 && lng < -80.0) return true; // Offshore Northern Peru / Ecuador
  }

  // 2. South America - Atlantic Ocean (East of Argentina / Brazil coast)
  if (lat >= -45 && lat <= 5) {
    if (lat <= -34.0 && lng > -56.5) return true; // Offshore Argentina / Rio de la Plata
    if (lat > -34.0 && lat <= -20.0 && lng > -43.0) return true; // Offshore SE Brazil
    if (lat > -20.0 && lat <= 2.0 && (lng > -38.4 || (lat > -3.5 && lng > -40.0))) return true; // Offshore Fortaleza / Equatorial Atlantic
  }

  // 3. Caribbean & Gulf of Mexico & Puerto Rico Trench
  if (lat >= 10 && lat <= 28 && lng >= -85 && lng <= -60) {
    return true;
  }

  // 4. North America - Pacific Ocean (West of Oregon / California coast)
  if (lat >= 30 && lat <= 55) {
    if (lat >= 42 && lng < -124.3) return true; // Offshore Oregon / Washington
    if (lat >= 34 && lat < 42 && lng < -122.5) return true; // Offshore Northern / Central California
    if (lat < 34 && lng < -119.8) return true; // Offshore Southern California
    if (lng < -130.0) return true; // Deep Pacific
  }

  // 5. North America - Atlantic Ocean (East of US East Coast)
  if (lat >= 25 && lat <= 50) {
    if (lat <= 30 && lng > -80.0) return true; // Offshore Florida
    if (lat > 30 && lat <= 37 && lng > -75.8) return true; // Offshore Carolinas / Virginia Beach
    if (lat > 37 && lng > -74.0) return true; // Offshore Mid-Atlantic / NY Bight
  }

  // 6. Europe - Atlantic, Celtic Sea, Irish Sea, North Sea
  if (lat >= 35 && lat <= 65) {
    if (lng < -9.5) return true; // Open Atlantic West of Europe
    if (lat >= 50 && lat <= 56 && lng >= -6.0 && lng <= -4.8) return true; // Irish Sea & St George Channel
    if (lat >= 48 && lat <= 52 && lng >= -10.0 && lng <= -6.0) return true; // Celtic Sea
  }

  // 7. Deep Oceanic Basins (Mid-Atlantic ridge, Abyssal plains)
  if (lng >= -55 && lng <= -15 && lat >= -30 && lat <= 65) {
    return true;
  }

  return false;
}

// Helper to generate a realistic curved oceanic route for subsea cable ships
function generateMaritimeRoute(
  start: [number, number],
  end: [number, number],
  cableCoords?: [number, number][],
  steps = 15
): [number, number][] {
  if (cableCoords && cableCoords.length > 1) {
    try {
      const line = turf.lineString(cableCoords);
      const startPt = turf.point(start);
      const endPt = turf.point(end);
      const sliced = turf.lineSlice(startPt, endPt, line);
      const coords = sliced.geometry.coordinates as [number, number][];
      if (coords.length >= 2) {
        // Ensure direction is start -> end
        const distStart = turf.distance(turf.point(coords[0]), startPt, { units: 'kilometers' });
        const distEnd = turf.distance(turf.point(coords[coords.length - 1]), startPt, { units: 'kilometers' });
        const ordered = distStart <= distEnd ? coords : [...coords].reverse();
        const slicedLine = turf.lineString(ordered);
        const lenKm = turf.length(slicedLine, { units: 'kilometers' });
        if (lenKm > 1) {
          const points: [number, number][] = [start];
          for (let i = 1; i < steps; i++) {
            const pt = turf.along(slicedLine, (i / steps) * lenKm, { units: 'kilometers' });
            points.push(pt.geometry.coordinates as [number, number]);
          }
          points.push(end);
          return points;
        }
      }
    } catch {
      // fallback to subtle offshore curve
    }
  }

  const midPoint = turf.midpoint(turf.point(start), turf.point(end));
  const bearing = turf.bearing(turf.point(start), turf.point(end));
  const distKm = turf.distance(turf.point(start), turf.point(end), { units: 'kilometers' });
  const lateralOffsetKm = Math.min(Math.max(distKm * 0.08, 2), 12);
  const controlPoint = turf.destination(midPoint, lateralOffsetKm, bearing - 90, { units: 'kilometers' }).geometry.coordinates;

  const points: [number, number][] = [start];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const lon = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlPoint[0] + t * t * end[0];
    const lat = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlPoint[1] + t * t * end[1];
    points.push([lon, lat]);
  }
  points.push(end);
  return points;
}

const logIncidentToAws = (event: KiroAttackEvent) => {
  const apiUrl = import.meta.env.VITE_AWS_API_GATEWAY_URL;
  if (!apiUrl) return;
  fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidentId: event.id,
      attackType: event.attackType,
      latitude: event.epicenter[1],
      longitude: event.epicenter[0],
      placeName: event.placeName,
      severedCables: event.severedCableIds,
      latencyBefore: event.latencyBeforeMs,
      latencyAfter: event.latencyAfterMs,
      depotName: event.repairDepot?.name,
      etaMinutes: event.routeResult?.durationMinutes,
      distanceKm: event.routeResult?.distanceKm,
    }),
  }).catch(() => {});
};

export const App: React.FC = () => {
  // Master state coordinator
  const [lang, setLang] = useState<Language>('en');
  const langRef = useRef<Language>(lang);
  langRef.current = lang;

  const handleToggleLang = useCallback(() => {
    setLang((prev) => {
      const nextLang = prev === 'es' ? 'en' : 'es';
      langRef.current = nextLang;
      return nextLang;
    });
    setActiveEvent((prev) => {
      if (!prev) return null;
      const nextLang = langRef.current;
      return {
        ...prev,
        aiPostMortem:
          nextLang === 'en'
            ? (prev.aiPostMortemEn || prev.aiPostMortem)
            : (prev.aiPostMortemEs || prev.aiPostMortem),
      };
    });
  }, []);

  const [nodes] = useState<NetworkNode[]>(NODES);
  const [cables, setCables] = useState<NetworkCable[]>(CABLES);
  const [activeEvent, setActiveEvent] = useState<KiroAttackEvent | null>(null);
  const [reroutedCableIds, setReroutedCableIds] = useState<string[]>([]);
  const [pingCableIds, setPingCableIds] = useState<string[]>([]);
  const [animationState, setAnimationState] = useState<KiroAnimationState>('IDLE_ORBIT');
  const [fiberCutMode, setFiberCutMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState<boolean>(false);
  const [coverMode, setCoverMode] = useState<boolean>(false);
  const [isCoverBannerVisible, setIsCoverBannerVisible] = useState<boolean>(true);
  const coverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // In Cover Photo Mode, fade out banner after inactivity; fade in on mousemove/touch
  useEffect(() => {
    if (!coverMode) {
      setIsCoverBannerVisible(true);
      if (coverTimerRef.current) clearTimeout(coverTimerRef.current);
      return;
    }

    const resetTimer = () => {
      setIsCoverBannerVisible(true);
      if (coverTimerRef.current) clearTimeout(coverTimerRef.current);
      coverTimerRef.current = setTimeout(() => {
        setIsCoverBannerVisible(false);
      }, 2600);
    };

    resetTimer();
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    return () => {
      if (coverTimerRef.current) clearTimeout(coverTimerRef.current);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [coverMode]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>(false);

  // Ping Tracer State & Interactive Selectors
  const [selectedPingOrigin, setSelectedPingOrigin] = useState<string>('node-cbba');
  const [selectedPingTarget, setSelectedPingTarget] = useState<string>('aws-us-east-1');
  const [activePings, setActivePings] = useState<ActivePing[]>([]);
  const [pingResult, setPingResult] = useState<ActivePing | null>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  // Incident Lifecycle & Auto-Repair State
  const [incidentPhase, setIncidentPhase] = useState<'idle' | 'severed' | 'repairing' | 'restored'>('idle');
  const [repairProgress, setRepairProgress] = useState<number>(0);
  const [telemetryTabOverride, setTelemetryTabOverride] = useState<{
    tab: 'location' | 'bgp' | 'bedrock' | 'iceberg';
    seq: number;
  } | null>(null);
  const [drawerForceExpanded, setDrawerForceExpanded] = useState<boolean>(false);

  const repairIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const repairTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  // Graph Engine Instance
  const graphEngine = useMemo(() => new NetworkGraphEngine(nodes, cables), [nodes]);

  // Sync cables with graph engine
  useEffect(() => {
    graphEngine.updateCables(cables);
  }, [cables, graphEngine]);

  useEffect(() => {
    return () => {
      if (repairIntervalRef.current) clearInterval(repairIntervalRef.current);
      if (repairTimeoutRef.current) clearTimeout(repairTimeoutRef.current);
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  const handleCompleteRepair = useCallback(() => {
    if (repairIntervalRef.current) {
      clearInterval(repairIntervalRef.current);
      repairIntervalRef.current = null;
    }
    if (repairTimeoutRef.current) {
      clearTimeout(repairTimeoutRef.current);
      repairTimeoutRef.current = null;
    }

    soundFx.playTruckDispatch();
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#38bdf8', '#a855f7', '#f59e0b'],
    });

    setIncidentPhase('restored');
    setRepairProgress(100);

    // Restore active incident cables to healthy (preserving other severed cables if present)
    const eventSeveredIds = activeEvent?.severedCableIds || [];
    setCables((prev) =>
      prev.map((c) =>
        eventSeveredIds.length === 0 || eventSeveredIds.includes(c.id)
          ? { ...c, status: 'healthy' as const }
          : c
      )
    );

    const remainingSevered = cables.filter(
      (c) => c.status === 'severed' && !eventSeveredIds.includes(c.id)
    );
    if (remainingSevered.length === 0) {
      setReroutedCableIds([]);
    }

    // Restore active ping routes to optimal baseline
    setActivePings((prev) => {
      if (prev.length === 0) return prev;
      const restoredPings = prev.map((p) => {
        const restored = graphEngine.calculateShortestPath(p.originId, p.targetId, CABLES);
        const restoredCables = graphEngine.findCablesForPath(restored.path, CABLES);
        return {
          ...p,
          path: restored.reachable ? restored.path : [],
          cableIds: restoredCables,
          rttMs: restored.totalLatencyMs,
          hops: restored.hops,
        };
      });
      const allCableIds = Array.from(new Set(restoredPings.flatMap((p) => p.cableIds)));
      setPingCableIds(allCableIds);
      if (restoredPings.length > 0) {
        setPingResult(restoredPings[0]);
      }
      return restoredPings;
    });

    // Transition lifecycle to idle after 7.5s (celebration + RTB return to base),
    // but DO NOT erase activeEvent so judges can continue inspecting telemetry in the drawer
    repairTimeoutRef.current = setTimeout(() => {
      setIncidentPhase('idle');
    }, 7500);
  }, [graphEngine, nodes]);

  const handleCompleteRepairRef = useRef(handleCompleteRepair);
  handleCompleteRepairRef.current = handleCompleteRepair;

  // Real-time BGP Failover & Restoration for all active Ping Tracers
  useEffect(() => {
    setActivePings((prevPings) => {
      if (prevPings.length === 0) return prevPings;
      let hasChanges = false;
      const updatedPings = prevPings.map((p) => {
        const route = graphEngine.calculateShortestPath(p.originId, p.targetId, cables);
        const routeCables = graphEngine.findCablesForPath(route.path, cables);

        const pathChanged =
          p.path.length !== route.path.length ||
          p.path.some((nodeId, idx) => nodeId !== route.path[idx]) ||
          p.rttMs !== route.totalLatencyMs;

        if (pathChanged) {
          hasChanges = true;
          return {
            ...p,
            path: route.reachable ? route.path : [],
            cableIds: routeCables,
            rttMs: route.totalLatencyMs,
            hops: route.hops,
          };
        }
        return p;
      });

      if (hasChanges) {
        const allCableIds = Array.from(new Set(updatedPings.flatMap((p) => p.cableIds)));
        setPingCableIds(allCableIds);
        if (updatedPings.length > 0) {
          setPingResult(updatedPings[0]);
        }
        return updatedPings;
      }
      return prevPings;
    });

    setPingResult((prevResult) => {
      if (!prevResult || !prevResult.path || prevResult.path.length < 2) return prevResult;
      const originId = prevResult.path[0];
      const targetId = prevResult.path[prevResult.path.length - 1];
      const route = graphEngine.calculateShortestPath(originId, targetId, cables);
      const routeCables = graphEngine.findCablesForPath(route.path, cables);

      const pathChanged =
        prevResult.path.length !== route.path.length ||
        prevResult.path.some((nodeId, idx) => nodeId !== route.path[idx]) ||
        prevResult.rttMs !== route.totalLatencyMs;

      if (pathChanged) {
        setPingCableIds(routeCables);
        return {
          ...prevResult,
          path: route.reachable ? route.path : [],
          cableIds: routeCables,
          rttMs: route.totalLatencyMs,
          hops: route.hops,
        };
      }
      return prevResult;
    });
  }, [cables, graphEngine]);

  const startRepairLifecycle = useCallback(() => {
    if (repairIntervalRef.current) {
      clearInterval(repairIntervalRef.current);
      repairIntervalRef.current = null;
    }
    if (repairTimeoutRef.current) {
      clearTimeout(repairTimeoutRef.current);
      repairTimeoutRef.current = null;
    }

    setIncidentPhase('severed');
    setRepairProgress(5);

    // After 1.2s BGP failover convergence, transition to active truck dispatch / repair
    repairTimeoutRef.current = setTimeout(() => {
      setIncidentPhase('repairing');
      const startTime = Date.now();
      const transitDurationMs = 6500; // 6.5s road/maritime transit to splice site
      const suspenseDurationMs = 3800; // 3.8s dramatic on-site optical fusion / ROV splicing suspense

      repairIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;

        if (elapsed < transitDurationMs) {
          // Transit phase: advances smoothly from 5% up to 88%
          const pct = Math.min(88, Math.round(5 + (elapsed / transitDurationMs) * 83));
          setRepairProgress(pct);
        } else if (elapsed < transitDurationMs + suspenseDurationMs) {
          // Dramatic suspense on-site: 88% -> 99% with optical fusion telemetry
          const suspenseElapsed = elapsed - transitDurationMs;
          const pct = Math.min(99, Math.round(88 + (suspenseElapsed / suspenseDurationMs) * 11));
          setRepairProgress(pct);
        } else {
          // Autonomous 100% completion & restoration
          setRepairProgress(100);
          if (repairIntervalRef.current) {
            clearInterval(repairIntervalRef.current);
            repairIntervalRef.current = null;
          }
          handleCompleteRepairRef.current();
        }
      }, 150);
    }, 1200);
  }, []);

  const handleOpenIceberg = useCallback(() => {
    setTelemetryTabOverride({ tab: 'iceberg', seq: Date.now() });
    setDrawerForceExpanded(true);
  }, []);

  const handleFocusTruckRoute = useCallback(() => {
    const truckCoords = activeEvent?.routeResult?.coordinates || [];
    const shipCoords = activeEvent?.maritimeRouteCoords || [];
    const allRouteCoords = [...truckCoords, ...shipCoords];
    if (allRouteCoords.length === 0 || !mapRef.current) return;

    if (allRouteCoords.length === 1) {
      mapRef.current.flyTo({
        center: allRouteCoords[0],
        zoom: 9.5,
        pitch: 55,
        bearing: -15,
        duration: 1800,
      });
      return;
    }

    const lngs = allRouteCoords.map((c) => c[0]);
    const lats = allRouteCoords.map((c) => c[1]);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];

    const bottomPad = typeof window !== 'undefined' && window.innerHeight < 768 ? 160 : 220;
    const rightPad = typeof window !== 'undefined' && window.innerWidth < 1024 ? 100 : 220;

    mapRef.current.fitBounds(bounds, {
      padding: { top: 120, bottom: bottomPad, left: 320, right: rightPad },
      pitch: 52,
      bearing: -15,
      duration: 2000,
      maxZoom: 10,
    });
  }, [activeEvent]);

  // Overall Health Metrics
  const healthPercentage = useMemo(() => {
    return graphEngine.getNetworkHealthPercentage(cables);
  }, [cables, graphEngine]);

  const activeCablesCount = useMemo(() => {
    return cables.filter((c) => c.status !== 'severed').length;
  }, [cables]);

  const severedCablesCount = useMemo(() => {
    return cables.filter((c) => c.status === 'severed').length;
  }, [cables]);

  const avgLatencyMs = useMemo(() => {
    if (activeEvent && severedCablesCount > 0) {
      return activeEvent.latencyAfterMs;
    }
    return 68; // Nominal global average RTT when all cables are healthy
  }, [activeEvent, severedCablesCount]);

  // Keyboard shortcut handler (H key for cover photo mode)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.key === 'h' || e.key === 'H') {
        setCoverMode((prev) => !prev);
      } else if (e.key === 'Escape' && coverMode) {
        setCoverMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [coverMode]);

  // Seismic camera shake handler
  const handleEarthquakeShake = useCallback((_intensity: number) => {
    // Shaking physics are integrated directly into Three.js 3D sphere + Kiro
  }, []);

  // Chaos attack lifecycle and spatial reroute orchestration
  const triggerAttack = useCallback(
    async (
      scenarioName: string,
      epicenter: [number, number],
      radiusKm: number,
      targetNodeId: string,
      resetPrevious = false
    ) => {
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (repairIntervalRef.current) clearInterval(repairIntervalRef.current);
      if (repairTimeoutRef.current) clearTimeout(repairTimeoutRef.current);
      setActiveEvent(null);
      setIncidentPhase('idle');
      if (resetPrevious) {
        setPingResult(null);
        setPingCableIds([]);
        setReroutedCableIds([]);
      }
      const reqId = ++activeRequestIdRef.current;

      setIsAnimating(true);
      setIsZoomedIn(false);
      setAnimationState('EARTHSHAKER_ATTACK');

      // If resetting previous runs, begin from pristine healthy CABLES
      const currentCables = resetPrevious
        ? CABLES.map((c) => ({ ...c, status: 'healthy' as const }))
        : cables;
      if (resetPrevious) {
        graphEngine.updateCables(currentCables);
      }

      // 0. Reset camera to circular 3D Globe orbit view so the entire planet is visible
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [-68.0, -15.0],
          zoom: 2.2,
          pitch: 0,
          bearing: 0,
          duration: 600,
        });
      }

      // 1. Detect severed cables using Turf.js (guaranteed at least 1 cable)
      const { severedCableIds, crater } = graphEngine.detectSeveredCables(epicenter, radiusKm);
      let actualEpicenter = crater.center;
      let activeCrater = crater;

      // 2. Mark cables as severed
      const severedCables = currentCables.filter((c) => severedCableIds.includes(c.id));
      const primaryCable = severedCables[0];
      let updatedCables = currentCables.map((c) => {
        if (severedCableIds.includes(c.id)) {
          return { ...c, status: 'severed' as const };
        }
        return c;
      });

      // 3. Reverse Geocode via AWS Location Service (with fallback)
      const geocode = await awsLocation.reverseGeocode(actualEpicenter);

      // 4. Land vs Submarine Dispatch Logic
      const isOceanic = isOffshoreLocation(actualEpicenter);
      const isSubmarine = Boolean(
        isOceanic && (primaryCable ? primaryCable.type === 'submarine' : severedCables.some((c) => c.type === 'submarine'))
      );
      let truckDestCoords: [number, number];
      let nearestDepot: NetworkNode;
      let targetNode: NetworkNode;
      let maritimeRouteCoords: [number, number][] | undefined = undefined;
      let routeCrater: KiroCrater | undefined = undefined;

      if (!isSubmarine) {
        // Terrestrial cut:
        // 1. Truck destination is directly actualEpicenter (exact rupture point on fiber)
        // 2. Nearest depot is closest geodetically to actualEpicenter
        nearestDepot = graphEngine.findNearestDepot(actualEpicenter);
        truckDestCoords = actualEpicenter;
        targetNode = {
          id: `splice-${Date.now().toString().slice(-4)}`,
          name: `SPLICE POINT: ${geocode.municipality || geocode.placeName.split(',')[0]}`,
          city: geocode.municipality || geocode.placeName.split(',')[0],
          country: geocode.country,
          coordinates: actualEpicenter,
          type: 'landing_station',
          description: 'Emergency Field Optical Splice Point',
        };
        routeCrater = activeCrater;
      } else {
        // Submarine cut:
        // 1. Select optimal coastal gateway (landing station closest to actualEpicenter among severed cable endpoints and landing stations)
        const candidateNodeIds = new Set<string>();
        for (const c of severedCables) {
          if (c.source) candidateNodeIds.add(c.source);
          if (c.target) candidateNodeIds.add(c.target);
        }
        for (const n of nodes) {
          if (n.type === 'landing_station') candidateNodeIds.add(n.id);
        }
        const candidateNodes = Array.from(candidateNodeIds)
          .map((id) => nodes.find((n) => n.id === id))
          .filter((n): n is NetworkNode => Boolean(n));

        let coastalGateway = candidateNodes[0] || graphEngine.findNearestNetworkNode(actualEpicenter, ['landing_station']);
        let minCoastDist = Infinity;
        const cutPt = turf.point(actualEpicenter);

        for (const cand of candidateNodes) {
          const d = turf.distance(cutPt, turf.point(cand.coordinates), { units: 'kilometers' });
          if (d < minCoastDist) {
            minCoastDist = d;
            coastalGateway = cand;
          }
        }

        // 2. Nearest depot closest to the coastalGateway
        nearestDepot = graphEngine.findNearestDepot(coastalGateway.coordinates);
        targetNode = coastalGateway;
        truckDestCoords = coastalGateway.coordinates;
        routeCrater = undefined; // Oceanic crater must not block land highway

        // 3. Maritime route from coastalGateway to actualEpicenter (SUBSEA SPLICE)
        maritimeRouteCoords = generateMaritimeRoute(coastalGateway.coordinates, actualEpicenter, primaryCable?.coordinates, 15);
      }

      // 5. Calculate Emergency Road Detour via Amazon Location Service (AvoidanceAreas)
      const routeResult: AwsRouteResult = await awsLocation.calculateEmergencyRoute(
        nearestDepot.coordinates,
        truckDestCoords,
        nearestDepot.name,
        targetNode.name,
        routeCrater
      );

      // Stale race condition guard: If a newer attack was initiated while calculating route, discard
      if (reqId !== activeRequestIdRef.current) return;

      // 6. Intelligent BGP Failover Origin & Destination Selection
      let originNodeId = primaryCable ? primaryCable.source : targetNode.id;
      let destinationNodeId = primaryCable ? primaryCable.target : 'aws-us-east-1';
      let failover: DijkstraResult;
      let baseline: DijkstraResult;

      if (primaryCable) {
        const testPath = graphEngine.calculateShortestPath(primaryCable.source, primaryCable.target, updatedCables);
        if (testPath.reachable) {
          originNodeId = primaryCable.source;
          destinationNodeId = primaryCable.target;
          failover = testPath;
          baseline = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, CABLES);
        } else {
          // If direct endpoints cannot reach each other, find the shortest path from a surviving endpoint to the nearest AWS core region
          const awsRegions = nodes.filter((n) => n.type === 'aws_region');
          let bestRegionalPath: DijkstraResult | null = null;
          let bestOrigin = primaryCable.source;
          let bestDest = 'aws-us-east-1';

          for (const cand of [primaryCable.source, primaryCable.target]) {
            for (const region of awsRegions) {
              if (region.id === cand) continue;
              const r = graphEngine.calculateShortestPath(cand, region.id, updatedCables);
              if (r.reachable && (!bestRegionalPath || r.totalLatencyMs < bestRegionalPath.totalLatencyMs)) {
                bestRegionalPath = r;
                bestOrigin = cand;
                bestDest = region.id;
              }
            }
          }

          if (bestRegionalPath) {
            originNodeId = bestOrigin;
            destinationNodeId = bestDest;
            failover = bestRegionalPath;
            baseline = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, CABLES);
          } else {
            originNodeId = primaryCable.source;
            destinationNodeId = primaryCable.target;
            failover = testPath;
            baseline = { path: [originNodeId, destinationNodeId], totalLatencyMs: primaryCable.latencyBaseMs, hops: 1, reachable: true };
          }
        }
      } else {
        failover = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, updatedCables);
        baseline = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, CABLES);
      }

      // Dynamically identify cables connecting each hop in the failover path
      const dynamicReroutedCableIds = graphEngine.findCablesForPath(failover.path, updatedCables);

      // Mark failover cables with status 'rerouted' so the map renders them in failover green
      updatedCables = updatedCables.map((c) => {
        if (dynamicReroutedCableIds.includes(c.id)) {
          return { ...c, status: 'rerouted' as const };
        }
        return c;
      });

      // 7. Synthesize Dynamic Bedrock Nova Micro SRE Incident Summary
      const severedNames = severedCables.map((c) => c.name).join(', ') || 'Primary Optical Trunk';
      const failoverHopNamesEn =
        failover.reachable && failover.path.length > 0
          ? failover.path.map((nodeId) => nodes.find((n) => n.id === nodeId)?.name || nodeId).join(' → ')
          : 'No alternate BGP route available (Network Partition)';
      const failoverHopNamesEs =
        failover.reachable && failover.path.length > 0
          ? failover.path.map((nodeId) => nodes.find((n) => n.id === nodeId)?.name || nodeId).join(' → ')
          : 'Sin ruta BGP alternativa disponible (Partición de Red)';
      const latencyDelta =
        failover.reachable && baseline.reachable
          ? Math.max(0, Math.round((failover.totalLatencyMs - baseline.totalLatencyMs) * 10) / 10)
          : 0;

      const postMortemEn = isSubmarine
        ? `[SEVERITY-1 CRITICAL] Subsea cable rupture at ${geocode.placeName}.
Severed optical fiber(s): ${severedNames}.
BGP Dijkstra reroute: ${failoverHopNamesEn} (RTT latency: ${failover.totalLatencyMs}ms, +${latencyDelta}ms failover delta).
Amazon Location Service dispatched repair truck to ${targetNode.name} while Subsea Cable Ship CS-Kiro sailed to oceanic rupture coordinates for ROV fiber splicing.`
        : `[SEVERITY-1 CRITICAL] Terrestrial rupture at ${geocode.placeName}.
Severed optical fiber(s): ${severedNames}.
BGP Dijkstra reroute: ${failoverHopNamesEn} (RTT latency: ${failover.totalLatencyMs}ms, +${latencyDelta}ms failover delta).
Amazon Location Service dispatched emergency repair truck from ${nearestDepot.name} with route detour ETA of ${routeResult.durationMinutes} mins avoiding hazard zone.`;

      const postMortemEs = isSubmarine
        ? `[SEVERITY-1 CRÍTICO] Ruptura de cable submarino en ${geocode.placeName}.
Fibra(s) óptica(s) cortada(s): ${severedNames}.
Desvío BGP Dijkstra: ${failoverHopNamesEs} (Latencia RTT: ${failover.totalLatencyMs}ms, +${latencyDelta}ms incremento failover).
Amazon Location Service despachó cuadrilla terrestre a ${targetNode.name} mientras el buque cablero CS-Kiro zarpó a coordenadas oceánicas para empalme submarino ROV.`
        : `[SEVERITY-1 CRÍTICO] Ruptura sísmica terrestre en ${geocode.placeName}.
Fibra(s) óptica(s) cortada(s): ${severedNames}.
Desvío BGP Dijkstra: ${failoverHopNamesEs} (Latencia RTT: ${failover.totalLatencyMs}ms, +${latencyDelta}ms incremento failover).
Amazon Location Service despachó cuadrilla de reparación de emergencia desde ${nearestDepot.name} con ETA de desvío vial de ${routeResult.durationMinutes} min esquivando zona de peligro.`;

      const event: KiroAttackEvent = {
        id: `KIRO-${Date.now().toString().slice(-4)}`,
        scenarioName,
        attackType: 'EARTHSHAKER',
        epicenter: actualEpicenter,
        placeName: geocode.placeName,
        crater: activeCrater,
        hazardArea: activeCrater,
        severedCableIds,
        latencyBeforeMs: baseline.totalLatencyMs || 68,
        latencyAfterMs: failover.totalLatencyMs || 194,
        failoverPath: failover.path.length > 0 ? failover.path : [originNodeId, destinationNodeId],
        repairDepot: nearestDepot,
        targetNode,
        routeResult,
        maritimeRouteCoords,
        isSubmarineCut: isSubmarine,
        aiPostMortem: langRef.current === 'en' ? postMortemEn : postMortemEs,
        aiPostMortemEs: postMortemEs,
        aiPostMortemEn: postMortemEn,
        timestamp: new Date().toISOString(),
      };

      // Cinematic Camera Zoom: after Kiro finishes shaking the Earth 3D sphere (2200ms),
      // sever the cables, illuminate failover, launch the repair truck and frame the highway route & hazard area
      cameraTimeoutRef.current = setTimeout(() => {
        setIsZoomedIn(true);
        setAnimationState('IDLE_ORBIT');
        setReroutedCableIds(dynamicReroutedCableIds);
        setCables(updatedCables);

        // Dynamic BGP Convergence for all active Ping Tracers
        setActivePings((prev) => {
          if (prev.length === 0) return prev;
          const updatedPings = prev.map((p) => {
            const failover = graphEngine.calculateShortestPath(p.originId, p.targetId, updatedCables);
            const failoverCables = graphEngine.findCablesForPath(failover.path, updatedCables);
            return {
              ...p,
              path: failover.reachable ? failover.path : [],
              cableIds: failoverCables,
              rttMs: failover.totalLatencyMs,
              hops: failover.hops,
            };
          });
          const allCableIds = Array.from(new Set(updatedPings.flatMap((p) => p.cableIds)));
          setPingCableIds(allCableIds);
          if (updatedPings.length > 0) {
            setPingResult(updatedPings[0]);
          }
          return updatedPings;
        });

        setActiveEvent({
          ...event,
          aiPostMortem: langRef.current === 'en' ? postMortemEn : postMortemEs,
        });
        logIncidentToAws(event);
        setTelemetryTabOverride({ tab: 'location', seq: Date.now() });
        setDrawerForceExpanded(true);
        soundFx.playTruckDispatch();
        startRepairLifecycle();

        if (mapRef.current) {
          const truckCoords = routeResult.coordinates || [];
          const shipCoords = maritimeRouteCoords || [];
          const allRouteCoords = [...truckCoords, ...shipCoords];
          if (allRouteCoords.length > 1) {
            const lngs = allRouteCoords.map((c) => c[0]);
            const lats = allRouteCoords.map((c) => c[1]);
            const bottomPad = typeof window !== 'undefined' && window.innerHeight < 768 ? 160 : 220;
            const rightPad = typeof window !== 'undefined' && window.innerWidth < 1024 ? 100 : 220;
            mapRef.current.fitBounds(
              [
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)],
              ],
              {
                padding: { top: 110, bottom: bottomPad, left: 300, right: rightPad },
                pitch: 54,
                bearing: -15,
                duration: 2800,
                maxZoom: 10.5,
              }
            );
          } else {
            mapRef.current.flyTo({
              center: [actualEpicenter[0], actualEpicenter[1]],
              zoom: 9.5,
              pitch: 58,
              bearing: -15,
              duration: 2800,
            });
          }
        }
      }, 2200);

      animTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false);
      }, 2800);
    },
    [cables, graphEngine, nodes, selectedPingOrigin, selectedPingTarget, startRepairLifecycle, lang, pingResult]
  );

  // Direct physical fiber severance handler
  const triggerFiberCut = useCallback(
    async (
      scenarioName: string,
      epicenter: [number, number],
      radiusKm: number,
      targetNodeId?: string,
      resetPrevious = false,
      forcedCableId?: string
    ) => {
      if (isAnimating) return; // Prevent concurrent cuts while Kiro is shaking the earth
      if (cameraTimeoutRef.current) clearTimeout(cameraTimeoutRef.current);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (repairIntervalRef.current) clearInterval(repairIntervalRef.current);
      if (repairTimeoutRef.current) clearTimeout(repairTimeoutRef.current);
      setActiveEvent(null);
      setIncidentPhase('idle');
      if (resetPrevious) {
        setPingResult(null);
        setPingCableIds([]);
        setReroutedCableIds([]);
      }
      const reqId = ++activeRequestIdRef.current;

      setFiberCutMode(false);
      soundFx.playFiberCutAlert();

      // If resetting previous runs, begin from pristine healthy CABLES
      const currentCables = resetPrevious
        ? CABLES.map((c) => ({ ...c, status: 'healthy' as const }))
        : cables;
      if (resetPrevious) {
        graphEngine.updateCables(currentCables);
      }

      // 1. Detect severed cables using Turf.js (guaranteed at least 1 cable or forced cable)
      const targetForcedCable = forcedCableId ? currentCables.find((c) => c.id === forcedCableId) : null;
      const initialCutCoords = targetForcedCable ? snapPointToCable(targetForcedCable, epicenter) : epicenter;

      const { severedCableIds, crater } = graphEngine.detectSeveredCables(initialCutCoords, radiusKm, forcedCableId);
      if (severedCableIds.length === 0) {
        setFiberCutMode(false);
        return;
      }
      const actualEpicenter = crater.center;
      const activeCrater = crater;

      // 2. Mark cables as severed
      const severedCables = currentCables.filter((c) => severedCableIds.includes(c.id));
      const primaryCable = targetForcedCable || severedCables[0];
      let updatedCables = currentCables.map((c) => {
        if (severedCableIds.includes(c.id)) {
          return { ...c, status: 'severed' as const };
        }
        return c;
      });

      // 3. Reverse Geocode via AWS Location Service
      const geocode = await awsLocation.reverseGeocode(actualEpicenter);

      // 4. Land vs Submarine Dispatch Logic
      const isOceanic = isOffshoreLocation(actualEpicenter);
      const isSubmarine = Boolean(
        isOceanic && (primaryCable ? primaryCable.type === 'submarine' : severedCables.some((c) => c.type === 'submarine'))
      );
      let truckDestCoords: [number, number];
      let nearestDepot: NetworkNode;
      let targetNode: NetworkNode;
      let maritimeRouteCoords: [number, number][] | undefined = undefined;
      let routeCrater: KiroCrater | undefined = undefined;

      if (!isSubmarine) {
        // Terrestrial cut:
        // 1. Truck destination is directly actualEpicenter (exact rupture point on fiber)
        // 2. Nearest depot is closest geodetically to actualEpicenter
        nearestDepot = graphEngine.findNearestDepot(actualEpicenter);
        truckDestCoords = actualEpicenter;
        targetNode = {
          id: `splice-${Date.now().toString().slice(-4)}`,
          name: `SPLICE POINT: ${geocode.municipality || geocode.placeName.split(',')[0]}`,
          city: geocode.municipality || geocode.placeName.split(',')[0],
          country: geocode.country,
          coordinates: actualEpicenter,
          type: 'landing_station',
          description: 'Emergency Field Optical Splice Point',
        };
        routeCrater = activeCrater;
      } else {
        // Submarine cut:
        // 1. Select optimal coastal gateway (landing station closest to actualEpicenter among severed cable endpoints and landing stations)
        const candidateNodeIds = new Set<string>();
        for (const c of severedCables) {
          if (c.source) candidateNodeIds.add(c.source);
          if (c.target) candidateNodeIds.add(c.target);
        }
        for (const n of nodes) {
          if (n.type === 'landing_station') candidateNodeIds.add(n.id);
        }
        const candidateNodes = Array.from(candidateNodeIds)
          .map((id) => nodes.find((n) => n.id === id))
          .filter((n): n is NetworkNode => Boolean(n));

        let coastalGateway = candidateNodes[0] || graphEngine.findNearestNetworkNode(actualEpicenter, ['landing_station']);
        let minCoastDist = Infinity;
        const cutPt = turf.point(actualEpicenter);

        for (const cand of candidateNodes) {
          const d = turf.distance(cutPt, turf.point(cand.coordinates), { units: 'kilometers' });
          if (d < minCoastDist) {
            minCoastDist = d;
            coastalGateway = cand;
          }
        }

        // 2. Nearest depot closest to the coastalGateway
        nearestDepot = graphEngine.findNearestDepot(coastalGateway.coordinates);
        targetNode = coastalGateway;
        truckDestCoords = coastalGateway.coordinates;
        routeCrater = undefined; // Oceanic crater must not block land highway

        // 3. Maritime route from coastalGateway to actualEpicenter (SUBSEA SPLICE)
        maritimeRouteCoords = generateMaritimeRoute(coastalGateway.coordinates, actualEpicenter, primaryCable?.coordinates, 15);
      }

      soundFx.playTruckDispatch();
      const routeResult: AwsRouteResult = await awsLocation.calculateEmergencyRoute(
        nearestDepot.coordinates,
        truckDestCoords,
        nearestDepot.name,
        targetNode.name,
        routeCrater
      );

      // Stale race condition guard: If a newer cut was triggered while calculating route, discard
      if (reqId !== activeRequestIdRef.current) return;

      // 6. Smoothly frame the repair route & hazard avoidance zone
      if (mapRef.current) {
        const truckCoords = routeResult.coordinates || [];
        const shipCoords = maritimeRouteCoords || [];
        const allRouteCoords = [...truckCoords, ...shipCoords];
        if (allRouteCoords.length > 1) {
          const lngs = allRouteCoords.map((c) => c[0]);
          const lats = allRouteCoords.map((c) => c[1]);
          const bottomPad = typeof window !== 'undefined' && window.innerHeight < 768 ? 160 : 220;
          const rightPad = typeof window !== 'undefined' && window.innerWidth < 1024 ? 100 : 220;
          mapRef.current.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            {
              padding: { top: 110, bottom: bottomPad, left: 300, right: rightPad },
              pitch: 54,
              bearing: -15,
              duration: 2200,
              maxZoom: 10.5,
            }
          );
        } else {
          mapRef.current.flyTo({
            center: actualEpicenter,
            zoom: 9.2,
            pitch: 60,
            bearing: -15,
            duration: 2200,
          });
        }
      }

      // 7. Intelligent BGP Failover Origin & Destination Selection
      let originNodeId = primaryCable ? primaryCable.source : targetNode.id;
      let destinationNodeId = primaryCable ? primaryCable.target : 'aws-us-east-1';
      let failover: DijkstraResult;
      let baseline: DijkstraResult;

      if (primaryCable) {
        const testPath = graphEngine.calculateShortestPath(primaryCable.source, primaryCable.target, updatedCables);
        if (testPath.reachable) {
          originNodeId = primaryCable.source;
          destinationNodeId = primaryCable.target;
          failover = testPath;
          baseline = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, CABLES);
        } else {
          // If direct endpoints cannot reach each other, find the shortest path from a surviving endpoint to the nearest AWS core region
          const awsRegions = nodes.filter((n) => n.type === 'aws_region');
          let bestRegionalPath: DijkstraResult | null = null;
          let bestOrigin = primaryCable.source;
          let bestDest = 'aws-us-east-1';

          for (const cand of [primaryCable.source, primaryCable.target]) {
            for (const region of awsRegions) {
              if (region.id === cand) continue;
              const r = graphEngine.calculateShortestPath(cand, region.id, updatedCables);
              if (r.reachable && (!bestRegionalPath || r.totalLatencyMs < bestRegionalPath.totalLatencyMs)) {
                bestRegionalPath = r;
                bestOrigin = cand;
                bestDest = region.id;
              }
            }
          }

          if (bestRegionalPath) {
            originNodeId = bestOrigin;
            destinationNodeId = bestDest;
            failover = bestRegionalPath;
            baseline = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, CABLES);
          } else {
            originNodeId = primaryCable.source;
            destinationNodeId = primaryCable.target;
            failover = testPath;
            baseline = { path: [originNodeId, destinationNodeId], totalLatencyMs: primaryCable.latencyBaseMs, hops: 1, reachable: true };
          }
        }
      } else {
        failover = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, updatedCables);
        baseline = graphEngine.calculateShortestPath(originNodeId, destinationNodeId, CABLES);
      }

      // Dynamically identify cables connecting each hop in the failover path
      const dynamicReroutedCableIds = graphEngine.findCablesForPath(failover.path, updatedCables);
      setReroutedCableIds(dynamicReroutedCableIds);

      // Mark failover cables with status 'rerouted' so the map renders them in failover green
      updatedCables = updatedCables.map((c) => {
        if (dynamicReroutedCableIds.includes(c.id)) {
          return { ...c, status: 'rerouted' as const };
        }
        return c;
      });
      setCables(updatedCables);

      // 8. Synthesize Dynamic Bedrock Nova Micro SRE Incident Summary
      const severedNames = severedCables.map((c) => c.name).join(', ') || 'Primary Optical Trunk';
      const failoverHopNamesEn =
        failover.reachable && failover.path.length > 0
          ? failover.path.map((nodeId) => nodes.find((n) => n.id === nodeId)?.name || nodeId).join(' → ')
          : 'No alternate BGP path available (Network Partition)';
      const failoverHopNamesEs =
        failover.reachable && failover.path.length > 0
          ? failover.path.map((nodeId) => nodes.find((n) => n.id === nodeId)?.name || nodeId).join(' → ')
          : 'Sin ruta BGP alternativa disponible (Partición de Red)';
      const latencyDelta =
        failover.reachable && baseline.reachable
          ? Math.max(0, Math.round((failover.totalLatencyMs - baseline.totalLatencyMs) * 10) / 10)
          : 0;

      const postMortemEn = isSubmarine
        ? `[SEVERITY-1 FIBER CUT] Subsea optical rupture near ${geocode.placeName}.
Severed optical fiber(s): ${severedNames}.
BGP Dijkstra reroute: ${failoverHopNamesEn} (RTT: ${failover.totalLatencyMs}ms, +${latencyDelta}ms failover delta).
Amazon Location Service dispatched emergency support to ${targetNode.name} while Subsea Cable Ship CS-Kiro deployed for oceanic fiber splicing.`
        : `[SEVERITY-1 FIBER CUT] Physical cable severance near ${geocode.placeName}.
Severed optical fiber(s): ${severedNames}.
BGP Dijkstra reroute: ${failoverHopNamesEn} (RTT: ${failover.totalLatencyMs}ms, +${latencyDelta}ms failover delta).
Amazon Location Service dispatched emergency repair truck from ${nearestDepot.name} with route detour ETA of ${routeResult.durationMinutes} mins avoiding hazard zone.`;

      const postMortemEs = isSubmarine
        ? `[SEVERITY-1 CORTE DE FIBRA] Ruptura óptica submarina cerca de ${geocode.placeName}.
Fibra(s) óptica(s) cortada(s): ${severedNames}.
Desvío BGP Dijkstra: ${failoverHopNamesEs} (RTT: ${failover.totalLatencyMs}ms, +${latencyDelta}ms incremento failover).
Amazon Location Service coordinó cuadrilla a ${targetNode.name} mientras el buque cablero CS-Kiro zarpó para empalme submarino ROV.`
        : `[SEVERITY-1 CORTE DE FIBRA] Corte físico de cable cerca de ${geocode.placeName}.
Fibra(s) óptica(s) cortada(s): ${severedNames}.
Desvío BGP Dijkstra: ${failoverHopNamesEs} (RTT: ${failover.totalLatencyMs}ms, +${latencyDelta}ms incremento failover).
Amazon Location Service despachó cuadrilla de reparación desde ${nearestDepot.name} con ETA de desvío vial de ${routeResult.durationMinutes} min esquivando zona de peligro.`;

      const event: KiroAttackEvent = {
        id: `CUT-${Date.now().toString().slice(-4)}`,
        scenarioName,
        attackType: 'FIBER_CUT',
        epicenter: actualEpicenter,
        placeName: geocode.placeName,
        crater: activeCrater,
        hazardArea: activeCrater,
        severedCableIds,
        latencyBeforeMs: baseline.totalLatencyMs || 68,
        latencyAfterMs: failover.totalLatencyMs || 194,
        failoverPath: failover.path.length > 0 ? failover.path : [originNodeId, destinationNodeId],
        repairDepot: nearestDepot,
        targetNode,
        routeResult,
        maritimeRouteCoords,
        isSubmarineCut: isSubmarine,
        aiPostMortem: langRef.current === 'en' ? postMortemEn : postMortemEs,
        aiPostMortemEs: postMortemEs,
        aiPostMortemEn: postMortemEn,
        timestamp: new Date().toISOString(),
      };

      setActiveEvent(event);
      logIncidentToAws(event);
      setTelemetryTabOverride({ tab: 'location', seq: Date.now() });
      setDrawerForceExpanded(true);

      // Dynamic BGP Convergence for all active Ping Tracers
      setActivePings((prev) => {
        if (prev.length === 0) return prev;
        const updatedPings = prev.map((p) => {
          const failover = graphEngine.calculateShortestPath(p.originId, p.targetId, updatedCables);
          const failoverCables = graphEngine.findCablesForPath(failover.path, updatedCables);
          return {
            ...p,
            path: failover.reachable ? failover.path : [],
            cableIds: failoverCables,
            rttMs: failover.totalLatencyMs,
            hops: failover.hops,
          };
        });
        const allCableIds = Array.from(new Set(updatedPings.flatMap((p) => p.cableIds)));
        setPingCableIds(allCableIds);
        if (updatedPings.length > 0) {
          setPingResult(updatedPings[0]);
        }
        return updatedPings;
      });

      startRepairLifecycle();
    },
    [cables, graphEngine, nodes, selectedPingOrigin, selectedPingTarget, startRepairLifecycle, lang, pingResult, isAnimating]
  );

  // SRE evaluation scenario dispatchers
  const handleRunScenario = useCallback(
    (index: 1 | 2 | 3) => {
      if (index === 1) {
        // Scenario 1: Andean Quake (Putre / Tambo Quemado - Bolivia Pacific Cut)
        triggerAttack(
          'Giant Kiro Andean Quake',
          [-69.65, -18.42], // Putre / Tambo Quemado pass
          14,
          'cls-arica',
          false
        );
      } else if (index === 2) {
        // Scenario 2: Fortaleza Subsea Cable Cut (95 km offshore)
        triggerFiberCut(
          '2. Fortaleza Subsea Cable Cut',
          [-37.75, -2.85], // Equatorial Atlantic ocean trench off Fortaleza
          16,
          'cls-fortaleza',
          false
        );
      } else if (index === 3) {
        // Scenario 3: North Atlantic Backbone Cut (Irish Sea / Dunant & Apollo)
        triggerFiberCut(
          '3. North Atlantic Backbone Cut',
          [-5.55, 53.32], // Irish Sea open optical corridor (cable-useast1-euwest1 only)
          14,
          'cls-dublin',
          false,
          'cable-useast1-euwest1'
        );
      }
    },
    [triggerAttack, triggerFiberCut]
  );

  const handleTriggerEarthshaker = useCallback(() => {
    // 1. Pick a random fault line from FAULT_LINES
    const randomFault = FAULT_LINES[Math.floor(Math.random() * FAULT_LINES.length)];
    const coordsList = randomFault.coordinates;

    // 2. Pick a random point along the fault (interpolated between vertices)
    const segIdx = Math.floor(Math.random() * (coordsList.length - 1));
    const p1 = coordsList[segIdx];
    const p2 = coordsList[segIdx + 1];
    const t = 0.15 + Math.random() * 0.7; // avoid extreme endpoints
    const epicenter: [number, number] = [
      Math.round((p1[0] + (p2[0] - p1[0]) * t) * 1000) / 1000,
      Math.round((p1[1] + (p2[1] - p1[1]) * t) * 1000) / 1000,
    ];

    // 3. Find the nearest network node to this random epicenter dynamically
    const targetNode = graphEngine.findNearestNetworkNode(epicenter);

    // 4. Trigger attack with dynamic scenario name, random epicenter, and tactical 14km radius
    triggerAttack(`Kiro Earthquake: ${randomFault.name}`, epicenter, 14, targetNode.id, false);
  }, [triggerAttack, graphEngine]);

  const handleMapClickForFiberCut = useCallback(
    (coords: [number, number]) => {
      setFiberCutMode(false);
      const nearestCable = graphEngine.findNearestCable(coords);
      if (!nearestCable) return;

      const cutEpicenter = snapPointToCable(nearestCable.cable, coords);
      const targetNode = graphEngine.findNearestNetworkNode(cutEpicenter);
      triggerFiberCut(
        langRef.current === 'en'
          ? `Physical Fiber Cut: ${nearestCable.cable.name}`
          : `Corte Físico de Fibra: ${nearestCable.cable.name}`,
        cutEpicenter,
        14,
        targetNode.id,
        false,
        nearestCable.cable.id
      );
    },
    [triggerFiberCut, graphEngine]
  );

  const handleResetNetwork = useCallback(() => {
    if (cameraTimeoutRef.current) {
      clearTimeout(cameraTimeoutRef.current);
      cameraTimeoutRef.current = null;
    }
    if (animTimeoutRef.current) {
      clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = null;
    }
    activeRequestIdRef.current++;

    if (repairIntervalRef.current) {
      clearInterval(repairIntervalRef.current);
      repairIntervalRef.current = null;
    }
    if (repairTimeoutRef.current) {
      clearTimeout(repairTimeoutRef.current);
      repairTimeoutRef.current = null;
    }
    setIncidentPhase('idle');
    setRepairProgress(0);
    setCables(CABLES);
    setActiveEvent(null);
    setReroutedCableIds([]);
    setPingCableIds([]);
    setActivePings([]);
    setPingResult(null);
    setAnimationState('IDLE_ORBIT');
    setIsZoomedIn(false);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-68.0, -15.0],
        zoom: 2.2,
        pitch: 0,
        bearing: 0,
        duration: 2500,
      });
    }
  }, []);

  const handleResetCameraToOrbit = useCallback(() => {
    setIsZoomedIn(false);
    setAnimationState('IDLE_ORBIT');
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-68.0, -15.0],
        zoom: 2.2,
        pitch: 0,
        bearing: 0,
        duration: 2500,
      });
    }
  }, []);

  const handleOriginChange = useCallback(
    (originId: string) => {
      setSelectedPingOrigin(originId);
      const node = nodes.find((n) => n.id === originId);
      if (node && mapRef.current) {
        mapRef.current.flyTo({
          center: node.coordinates,
          zoom: 3.8,
          pitch: 30,
          duration: 1500,
        });
      }
    },
    [nodes]
  );

  const handleTargetChange = useCallback(
    (targetId: string) => {
      setSelectedPingTarget(targetId);
      const node = nodes.find((n) => n.id === targetId);
      if (node && mapRef.current) {
        mapRef.current.flyTo({
          center: node.coordinates,
          zoom: 3.8,
          pitch: 30,
          duration: 1500,
        });
      }
    },
    [nodes]
  );

  const handleTracePing = useCallback(
    (originId: string, targetId: string) => {
      setSelectedPingOrigin(originId);
      setSelectedPingTarget(targetId);
      setTelemetryTabOverride({ tab: 'bgp', seq: Date.now() });
      setDrawerForceExpanded(true);

      const result = graphEngine.calculateShortestPath(originId, targetId, cables);
      const originNode = nodes.find((n) => n.id === originId);
      const targetNode = nodes.find((n) => n.id === targetId);

      // Illuminate the Dijkstra ping path cables in electric cyan on the globe (isolated from incident failover)
      const resolvedPingCables = graphEngine.findCablesForPath(result.path, cables);

      const newPing: ActivePing = {
        id: `ping-${originId}-${targetId}`,
        originId,
        targetId,
        originName: originNode?.name || originId,
        targetName: targetNode?.name || targetId,
        path: result.path,
        cableIds: resolvedPingCables,
        rttMs: result.totalLatencyMs,
        hops: result.hops,
        timestamp: Date.now(),
      };

      setActivePings((prev) => {
        const filtered = prev.filter((p) => !(p.originId === originId && p.targetId === targetId));
        const updated = [newPing, ...filtered].slice(0, 6);
        const allCableIds = Array.from(new Set(updated.flatMap((p) => p.cableIds)));
        setPingCableIds(allCableIds);
        return updated;
      });

      // Smooth camera framing of the origin and destination path with Transpacific & Drawer-Aware handling
      if (originNode && targetNode && mapRef.current) {
        const [lng1, lat1] = originNode.coordinates;
        const [lng2, lat2] = targetNode.coordinates;
        const lngDiff = Math.abs(lng1 - lng2);

        const bottomPad = typeof window !== 'undefined' && window.innerHeight < 768 ? 160 : 220;
        const rightPad = typeof window !== 'undefined' && window.innerWidth < 1024 ? 100 : 260;

        if (lngDiff > 180) {
          // Transpacific Crossing (crosses Antimeridian / 180° Longitude)
          const normLng1 = lng1 < 0 ? lng1 + 360 : lng1;
          const normLng2 = lng2 < 0 ? lng2 + 360 : lng2;
          let pacificMidLng = (normLng1 + normLng2) / 2;
          if (pacificMidLng > 180) pacificMidLng -= 360;
          const pacificMidLat = (lat1 + lat2) / 2;

          mapRef.current.flyTo({
            center: [pacificMidLng, pacificMidLat],
            zoom: 2.3,
            pitch: 22, // Low pitch prevents high-latitude northern arcs from clipping off top horizon
            bearing: 0,
            duration: 2200,
          });
        } else {
          const bounds: [[number, number], [number, number]] = [
            [Math.min(lng1, lng2), Math.min(lat1, lat2)],
            [Math.max(lng1, lng2), Math.max(lat1, lat2)],
          ];
          mapRef.current.fitBounds(bounds, {
            padding: { top: 110, bottom: bottomPad, left: 300, right: rightPad },
            pitch: 35,
            duration: 2000,
            maxZoom: 5.5,
          });
        }
      }

      setPingResult(newPing);
      soundFx.playPingSonar();
    },
    [graphEngine, cables, nodes]
  );

  const handleStopPing = useCallback((pingId?: string) => {
    if (!pingId) {
      setActivePings([]);
      setPingCableIds([]);
      setPingResult(null);
    } else {
      setActivePings((prev) => {
        const remaining = prev.filter((p) => p.id !== pingId);
        const allCableIds = Array.from(new Set(remaining.flatMap((p) => p.cableIds)));
        setPingCableIds(allCableIds);
        setPingResult(remaining.length > 0 ? remaining[0] : null);
        return remaining;
      });
    }
  }, []);

  const handleFocusPing = useCallback(
    (pingId: string) => {
      const ping = activePings.find((p) => p.id === pingId);
      if (!ping || !mapRef.current) return;
      const originNode = nodes.find((n) => n.id === ping.originId);
      const targetNode = nodes.find((n) => n.id === ping.targetId);
      if (originNode && targetNode) {
        const [lng1, lat1] = originNode.coordinates;
        const [lng2, lat2] = targetNode.coordinates;
        const lngDiff = Math.abs(lng1 - lng2);
        const bottomPad = typeof window !== 'undefined' && window.innerHeight < 768 ? 160 : 220;
        const rightPad = typeof window !== 'undefined' && window.innerWidth < 1024 ? 100 : 260;
        if (lngDiff > 180) {
          const normLng1 = lng1 < 0 ? lng1 + 360 : lng1;
          const normLng2 = lng2 < 0 ? lng2 + 360 : lng2;
          let pacificMidLng = (normLng1 + normLng2) / 2;
          if (pacificMidLng > 180) pacificMidLng -= 360;
          mapRef.current.flyTo({
            center: [pacificMidLng, (lat1 + lat2) / 2],
            zoom: 2.3,
            pitch: 22,
            bearing: 0,
            duration: 1800,
          });
        } else {
          const bounds: [[number, number], [number, number]] = [
            [Math.min(lng1, lng2), Math.min(lat1, lat2)],
            [Math.max(lng1, lng2), Math.max(lat1, lat2)],
          ];
          mapRef.current.fitBounds(bounds, {
            padding: { top: 110, bottom: bottomPad, left: 300, right: rightPad },
            pitch: 35,
            duration: 1800,
            maxZoom: 5.5,
          });
        }
        setPingResult(ping);
      }
    },
    [activePings, nodes]
  );

  const handleDispatchTruckToLocation = useCallback(
    (targetNodeId: string, coords: [number, number]) => {
      const nearestCable = graphEngine.findNearestCable(coords);
      const cable = nearestCable?.cable;
      const exactCoords = cable ? snapPointToCable(cable, coords) : coords;
      triggerFiberCut(
        langRef.current === 'en'
          ? `Emergency Dispatch: ${cable?.name || 'Optical Trunk'}`
          : `Despacho de Emergencia: ${cable?.name || 'Troncal Óptico'}`,
        exactCoords,
        14,
        targetNodeId,
        false,
        cable?.id
      );
    },
    [graphEngine, triggerFiberCut]
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030712] select-none">
      {/* 0. AWS Boot Splash Screen */}
      <AwsBootSplash lang={lang} />

      {/* 1. Real 3D Vector Globe (MapLibre GL JS v4.7+ & 3D Terrain) */}
      <div className="absolute inset-0 z-0">
        <GlobeMapCanvas
          lang={lang}
          nodes={nodes}
          cables={cables}
          faultLines={FAULT_LINES}
          activeEvent={activeEvent}
          fiberCutMode={fiberCutMode}
          onMapClickForFiberCut={handleMapClickForFiberCut}
          onCutCable={(cableId, coords) => {
            const targetCable = cables.find((c) => c.id === cableId);
            const snapped = targetCable ? snapPointToCable(targetCable, coords) : coords;
            triggerFiberCut('Targeted Cable Severance', snapped, 14, undefined, false, cableId);
          }}
          onSelectPingOrigin={(nodeId) => {
            setSelectedPingOrigin(nodeId);
            handleTracePing(nodeId, selectedPingTarget);
          }}
          onTracePing={handleTracePing}
          onDispatchTruckToLocation={handleDispatchTruckToLocation}
          onOpenIceberg={handleOpenIceberg}
          onQuickRepairCable={(_cableId) => handleCompleteRepair()}
          onTriggerStrikeAtNode={(nodeId, coords) => triggerFiberCut(`Fiber Cut at ${nodeId}`, coords, 18, nodeId)}
          onResetCameraToOrbit={handleResetCameraToOrbit}
          mapRefOut={mapRef}
          reroutedCableIds={reroutedCableIds}
          pingCableIds={pingCableIds}
          selectedPingOrigin={selectedPingOrigin}
          selectedPingTarget={selectedPingTarget}
          pingResult={pingResult}
          activePings={activePings}
          onStopPing={handleStopPing}
          repairProgress={repairProgress}
          incidentPhase={incidentPhase}
          coverMode={coverMode}
        />
      </div>

      {/* 2. Chubby Manga 3D Kiro Character Overlay (Three.js WebGL - pointer-events: none) */}
      <GiantKiroStage
        animationState={coverMode ? 'COVER_MODE' : animationState}
        isZoomedIn={isZoomedIn}
        coverMode={coverMode}
        onEarthquakeShake={handleEarthquakeShake}
        onAttackComplete={() => {
          setAnimationState('IDLE_ORBIT');
          setIsAnimating(false);
        }}
      />

      {/* 3. AWS Falling Servers & Tumbling Chaos Overlay */}
      <AwsChaosOverlay
        isActive={animationState === 'EARTHSHAKER_ATTACK' && !coverMode}
        scenarioName={activeEvent?.scenarioName}
        lang={lang}
      />

      {/* 4. Normal UI Panels (Hidden during Cover Photo Mode and during Earthquake Cutscene) */}
      {!coverMode && (
        <div
          className={`transition-opacity duration-500 ${
            animationState === 'EARTHSHAKER_ATTACK'
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100 pointer-events-auto'
          }`}
        >
          <TopHudBar
            healthPercentage={healthPercentage}
            activeCablesCount={activeCablesCount}
            totalCablesCount={cables.length}
            severedCablesCount={severedCablesCount}
            avgLatencyMs={avgLatencyMs}
            isMuted={isMuted}
            onToggleMute={() => {
              const muted = soundFx.toggleMute();
              setIsMuted(muted);
            }}
            onOpenArchitecture={() => setIsArchitectureOpen(true)}
            onToggleCoverMode={() => setCoverMode(true)}
            onResetNetwork={handleResetNetwork}
            lang={lang}
            onToggleLang={handleToggleLang}
          />

          {/* Top-Center Incident Lifecycle HUD Banner */}
          {incidentPhase !== 'idle' && (
            <div className="absolute top-14 sm:top-[60px] inset-x-0 z-30 flex justify-center px-3 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-300">
              <div
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border shadow-2xl backdrop-blur-md flex items-center gap-2.5 sm:gap-3 transition-all duration-300 max-w-[calc(100vw-24px)] sm:max-w-xl w-full sm:w-auto pointer-events-auto ${
                  incidentPhase === 'restored'
                    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-100 shadow-emerald-950/50'
                    : incidentPhase === 'repairing'
                    ? 'bg-slate-950/90 border-cyan-500/50 text-slate-100 shadow-cyan-950/50'
                    : 'bg-red-950/90 border-red-500/60 text-red-100 shadow-red-950/50'
                }`}
              >
                {/* Icon / Status indicator */}
                {incidentPhase === 'restored' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                ) : incidentPhase === 'repairing' ? (
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-400 animate-bounce" />
                  </div>
                )}

                {/* Text & Progress */}
                <div className="flex flex-col flex-1 min-w-0 sm:min-w-[240px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold tracking-wider uppercase">
                      {incidentPhase === 'restored'
                        ? TRANSLATIONS[lang].incidentLifecycle.phase5
                        : incidentPhase === 'repairing'
                        ? repairProgress < 75
                          ? TRANSLATIONS[lang].incidentLifecycle.phase3
                          : TRANSLATIONS[lang].incidentLifecycle.phase4
                        : TRANSLATIONS[lang].incidentLifecycle.phase1}
                    </span>
                    <span className="text-[10px] font-mono font-bold opacity-80">
                      {incidentPhase === 'restored' ? (lang === 'en' ? '100% OPERATIONAL' : '100% OPERATIVO') : `${repairProgress}%`}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-1 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-200 rounded-full ${
                        incidentPhase === 'restored'
                          ? 'bg-emerald-400 w-full'
                          : 'bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400'
                      }`}
                      style={{ width: `${incidentPhase === 'restored' ? 100 : Math.max(repairProgress, 6)}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-slate-300 font-mono mt-1 flex items-center gap-1.5">
                    {incidentPhase === 'restored' ? (
                      <span className="text-emerald-300">
                        {lang === 'en'
                          ? 'Splice complete. Nominal BGP 68ms latency restored.'
                          : 'Empalme completado. Latencia nominal BGP 68ms reestablecida.'}
                      </span>
                    ) : incidentPhase === 'repairing' ? (
                      <span className="text-cyan-200">
                        {repairProgress < 75
                          ? activeEvent?.isSubmarineCut
                            ? (lang === 'en'
                                ? `Cable Ship CS-Kiro & AWS crew converging on splice site (ETA ${activeEvent.routeResult?.durationMinutes || 20} min).`
                                : `Buque CS-Kiro y cuadrilla convergiendo al sitio de empalme (ETA ${activeEvent.routeResult?.durationMinutes || 20} min).`)
                            : activeEvent?.repairDepot && activeEvent?.targetNode
                            ? (lang === 'en'
                                ? `AWS crew en route (${activeEvent.routeResult?.distanceKm} km, ETA ${activeEvent.routeResult?.durationMinutes} min) avoiding hazard zone.`
                                : `Brigada AWS en ruta (${activeEvent.routeResult?.distanceKm} km, ETA ${activeEvent.routeResult?.durationMinutes} min) esquivando zona de peligro.`)
                            : (lang === 'en'
                                ? 'Truck avoiding hazard zone (Amazon Location Service).'
                                : 'Camión evitando zona de peligro (Amazon Location Service).')
                          : activeEvent?.isSubmarineCut
                          ? (lang === 'en'
                              ? 'Subsea ROV optical splicing and deep-water OTDR verification.'
                              : 'Empalme submarino ROV y verificación óptica OTDR en aguas profundas.')
                          : (lang === 'en'
                              ? 'Single-mode fiber fusion arc and OTDR verification.'
                              : 'Fusión de fibra monomodo y verificación de OTDR.')}
                      </span>
                    ) : (
                      <span className="text-red-300">
                        {lang === 'en'
                          ? 'BGP converged failover in milliseconds. Dispatching crew...'
                          : 'BGP recalculó failover en milisegundos. Despachando brigada...'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Instant Action Button */}
                {incidentPhase !== 'restored' && (
                  <button
                    onClick={handleCompleteRepair}
                    className={`ml-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/60 border border-emerald-400/40 active:scale-95 transition whitespace-nowrap cursor-pointer ${
                      repairProgress >= 75 ? 'animate-pulse ring-2 ring-emerald-400/60' : ''
                    }`}
                    title={lang === 'en' ? 'Force immediate fiber splice and restore 100% of grid' : 'Forzar empalme inmediato de fibra y restaurar 100% de la red'}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>{TRANSLATIONS[lang].incidentLifecycle.completeSplice}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <ChaosControlDeck
            onRunScenario={handleRunScenario}
            onTriggerEarthshaker={handleTriggerEarthshaker}
            onToggleFiberCutMode={() => setFiberCutMode(!fiberCutMode)}
            fiberCutMode={fiberCutMode}
            nodes={nodes}
            onTracePing={handleTracePing}
            onResetNetwork={handleResetNetwork}
            isDegraded={severedCablesCount > 0}
            isAnimating={isAnimating}
            selectedOrigin={selectedPingOrigin}
            selectedTarget={selectedPingTarget}
            onOriginChange={handleOriginChange}
            onTargetChange={handleTargetChange}
            activePings={activePings}
            onStopPing={handleStopPing}
            onFocusPing={handleFocusPing}
            lang={lang}
          />

          <AwsTelemetryDrawer
            activeEvent={activeEvent}
            cables={cables}
            nodes={nodes}
            pingResult={pingResult}
            activePings={activePings}
            onStopPing={handleStopPing}
            requestedTab={telemetryTabOverride}
            forceExpand={drawerForceExpanded}
            lang={lang}
            repairProgress={repairProgress}
            incidentPhase={incidentPhase}
          />
        </div>
      )}

      {/* 3. Cover Photo Mode Showcase Brand Watermark with Burning Server Graphic (Always Visible) */}
      {coverMode && <CoverShowcaseBadge />}

      {/* 4. Cover Photo Mode Minimal Exit Banner (Fades out smoothly after inactivity, reappears on mouse move) */}
      {coverMode && (
        <div
          className={`absolute bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 hover:bg-slate-900 border border-purple-500/40 text-purple-200 px-4 py-2 rounded-full text-xs font-mono shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-700 ${
            isCoverBannerVisible
              ? 'opacity-100 pointer-events-auto translate-y-0'
              : 'opacity-0 pointer-events-none translate-y-2'
          }`}
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <Camera className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>{lang === 'en' ? 'Cover Framing Active • Press [H] or [Esc] to exit' : 'Modo Portada Activo • Pulsa [H] o [Esc] para salir'}</span>
          <button
            onClick={() => setCoverMode(false)}
            className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold transition text-[11px] cursor-pointer"
          >
            {TRANSLATIONS[lang].incidentLifecycle.coverExit}
          </button>
        </div>
      )}

      {/* 4. 8-Service AWS Architecture & Iceberg Lakehouse Modal */}
      <ArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
        lang={lang}
      />
    </div>
  );
};

export default App;
