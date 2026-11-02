export type LayerType = 
  | 'aws_region' 
  | 'ixp' 
  | 'landing_station' 
  | 'depot' 
  | 'submarine' 
  | 'terrestrial';

export type CableStatus = 'healthy' | 'severed' | 'rerouted' | 'ping';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'aws_region' | 'ixp' | 'landing_station' | 'depot';
  coordinates: [number, number]; // [lng, lat]
  city: string;
  country: string;
  regionCode?: string;
  description: string;
}

export interface NetworkCable {
  id: string;
  name: string;
  type: 'submarine' | 'terrestrial';
  source: string; // node id
  target: string; // node id
  coordinates: [number, number][]; // LineString coords
  capacityTbps: number;
  latencyBaseMs: number;
  status: CableStatus;
  corridor: string;
  seismicZone?: string;
}

export interface FaultLine {
  id: string;
  name: string;
  coordinates: [number, number][];
}

export interface HazardArea {
  center: [number, number]; // [lng, lat]
  radiusKm: number;
  polygonGeoJson: GeoJSON.Feature<GeoJSON.Polygon>;
  avoidancePolygonCoordinates: [number, number][][]; // for AWS AvoidanceAreas
}

// Alias for compatibility
export type KiroCrater = HazardArea;

export interface KiroAttackEvent {
  id: string;
  scenarioName: string;
  attackType: 'EARTHSHAKER' | 'FIBER_CUT';
  epicenter: [number, number]; // [lng, lat]
  placeName: string;
  crater: HazardArea;
  hazardArea?: HazardArea;
  severedCableIds: string[];
  latencyBeforeMs: number;
  latencyAfterMs: number;
  failoverPath: string[];
  repairDepot: NetworkNode;
  targetNode: NetworkNode;
  routeResult: AwsRouteResult;
  maritimeRouteCoords?: [number, number][];
  isSubmarineCut?: boolean;
  aiPostMortem: string;
  aiPostMortemEs?: string;
  aiPostMortemEn?: string;
  timestamp: string;
}

export interface AwsRouteResult {
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // Detailed highway polyline
  engine: 'LIVE AWS LOCATION SDK' | 'TURF.JS SPATIAL ENGINE (SIMULATION FALLBACK)';
  avoidanceAreasCount: number;
  originName: string;
  destinationName: string;
}

export interface PingPacket {
  id: string;
  sourceId: string;
  targetId: string;
  path: [number, number][];
  currentHop: number;
  totalHops: number;
  rttMs: number;
  status: 'transiting' | 'delivered' | 'dropped';
}

export interface ActivePing {
  id: string;
  originId: string;
  targetId: string;
  originName: string;
  targetName: string;
  path: string[];
  cableIds: string[];
  rttMs: number;
  hops: number;
  timestamp: number;
}

