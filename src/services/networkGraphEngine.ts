import * as turf from '@turf/turf';
import { NetworkNode, NetworkCable, KiroCrater } from '../types/spatial';

export interface DijkstraResult {
  path: string[]; // sequence of node IDs
  totalLatencyMs: number;
  hops: number;
  reachable: boolean;
}

// Snap a raw coordinate onto a cable geometry with Antimeridian Pacific normalization and Node-offset protection
export function snapPointToCable(cable: NetworkCable, rawCoords: [number, number]): [number, number] {
  if (!cable || !cable.coordinates || cable.coordinates.length < 2) {
    return rawCoords;
  }

  // 1. Pacific Antimeridian normalization (handles unwrapped cables like FASTER / PC-1 Tokyo)
  const hasNegativeUnwrapped = cable.coordinates.some((pt) => pt[0] < -180);
  const hasPositiveUnwrapped = cable.coordinates.some((pt) => pt[0] > 180);
  let queryCoords: [number, number] = [rawCoords[0], rawCoords[1]];

  if (hasNegativeUnwrapped && rawCoords[0] > 0) {
    queryCoords = [rawCoords[0] - 360, rawCoords[1]];
  } else if (hasPositiveUnwrapped && rawCoords[0] < 0) {
    queryCoords = [rawCoords[0] + 360, rawCoords[1]];
  }

  const line = turf.lineString(cable.coordinates);
  const snapped = turf.nearestPointOnLine(line, turf.point(queryCoords));
  let resultCoords = snapped.geometry.coordinates as [number, number];

  // 2. Proximity check to cable endpoints (clicked from Node popup < 15km)
  const totalLength = turf.length(line, { units: 'kilometers' });
  if (totalLength > 10) {
    const startPt = turf.point(cable.coordinates[0]);
    const endPt = turf.point(cable.coordinates[cable.coordinates.length - 1]);
    const dStart = turf.distance(turf.point(queryCoords), startPt, { units: 'kilometers' });
    const dEnd = turf.distance(turf.point(queryCoords), endPt, { units: 'kilometers' });

    if (dStart < 15) {
      // Displace cut 25% along cable from start node so rupture is clearly on the line
      const displaced = turf.along(line, totalLength * 0.25, { units: 'kilometers' });
      resultCoords = displaced.geometry.coordinates as [number, number];
    } else if (dEnd < 15) {
      // Displace cut 25% along cable from end node (75% from start)
      const displaced = turf.along(line, totalLength * 0.75, { units: 'kilometers' });
      resultCoords = displaced.geometry.coordinates as [number, number];
    }
  }

  return [resultCoords[0], resultCoords[1]];
}

export class NetworkGraphEngine {
  private nodes: Map<string, NetworkNode> = new Map();
  private cables: NetworkCable[] = [];

  constructor(nodes: NetworkNode[], cables: NetworkCable[]) {
    this.setTopology(nodes, cables);
  }

  public setTopology(nodes: NetworkNode[], cables: NetworkCable[]) {
    this.nodes = new Map(nodes.map(n => [n.id, n]));
    this.cables = cables;
  }

  public updateCables(cables: NetworkCable[]) {
    this.cables = cables;
  }

  // Find severed cables given a blast center and radius (km)
  // Guarantees at least 1 cable is severed even if center is far from any cable
  // If forcedCableId is provided, snaps the center to that cable and guarantees it is severed
  public detectSeveredCables(center: [number, number], radiusKm: number, forcedCableId?: string): {
    severedCableIds: string[];
    crater: KiroCrater;
  } {
    // Generate circular polygon using Turf
    let actualCenter = center;
    const actualRadius = radiusKm;
    let centerPoint = turf.point(actualCenter);

    const targetForcedCable = forcedCableId ? this.cables.find((c) => c.id === forcedCableId) : null;
    if (targetForcedCable) {
      actualCenter = snapPointToCable(targetForcedCable, actualCenter);
      centerPoint = turf.point(actualCenter);
    }

    let circlePolygon = turf.circle(centerPoint, actualRadius, { steps: 24, units: 'kilometers' });

    const severedIds: string[] = [];

    for (const cable of this.cables) {
      const line = turf.lineString(cable.coordinates);
      const intersects = turf.booleanIntersects(line, circlePolygon);
      if (intersects) {
        severedIds.push(cable.id);
      }
    }

    // Guarantee targetForcedCable is severed and snap actualCenter to it if necessary
    if (targetForcedCable) {
      if (!severedIds.includes(targetForcedCable.id)) {
        severedIds.push(targetForcedCable.id);
      }
      actualCenter = snapPointToCable(targetForcedCable, actualCenter);
      centerPoint = turf.point(actualCenter);
      circlePolygon = turf.circle(centerPoint, actualRadius, { steps: 24, units: 'kilometers' });
    } else if (severedIds.length === 0 && this.cables.length > 0) {
      // Guarantee that at least the nearest cable is severed, snapping actualCenter to it
      const nearestResult = this.findNearestCable(center);
      if (nearestResult) {
        severedIds.push(nearestResult.cable.id);
        actualCenter = snapPointToCable(nearestResult.cable, center);
        centerPoint = turf.point(actualCenter);
        circlePolygon = turf.circle(centerPoint, actualRadius, { steps: 24, units: 'kilometers' });
      }
    }

    // Coordinates for AWS AvoidanceAreas (array of polygon rings)
    const avoidanceCoords = circlePolygon.geometry.coordinates as [number, number][][];

    return {
      severedCableIds: severedIds,
      crater: {
        center: actualCenter,
        radiusKm: actualRadius,
        polygonGeoJson: circlePolygon,
        avoidancePolygonCoordinates: avoidanceCoords,
      },
    };
  }

  // Find nearest cable to given coordinates
  public findNearestCable(coords: [number, number]): { cable: NetworkCable; distanceKm: number } | null {
    if (this.cables.length === 0) return null;
    const point = turf.point(coords);
    let nearest: NetworkCable = this.cables[0];
    let minDistance = Infinity;

    for (const cable of this.cables) {
      const line = turf.lineString(cable.coordinates);
      const dist = turf.pointToLineDistance(point, line, { units: 'kilometers' });
      if (dist < minDistance) {
        minDistance = dist;
        nearest = cable;
      }
    }

    return { cable: nearest, distanceKm: minDistance };
  }

  // Find nearest network node (IXP, Landing Station, or AWS Region) to given coordinates
  public findNearestNetworkNode(
    coords: [number, number],
    allowedTypes: Array<'aws_region' | 'ixp' | 'landing_station' | 'depot'> = ['landing_station', 'ixp', 'aws_region']
  ): NetworkNode {
    const candidates = Array.from(this.nodes.values()).filter((n) => allowedTypes.includes(n.type));
    const list = candidates.length > 0 ? candidates : Array.from(this.nodes.values());
    if (list.length === 0) {
      throw new Error('No network nodes available');
    }

    let nearest = list[0];
    let minDistance = Infinity;
    const targetPoint = turf.point(coords);

    for (const node of list) {
      const nodePoint = turf.point(node.coordinates);
      const dist = turf.distance(targetPoint, nodePoint, { units: 'kilometers' });
      if (dist < minDistance) {
        minDistance = dist;
        nearest = node;
      }
    }

    return nearest;
  }

  // Identify exact cable IDs connecting each hop in a Dijkstra node sequence
  public findCablesForPath(nodePath: string[], activeCables?: NetworkCable[]): string[] {
    if (!nodePath || nodePath.length < 2) return [];
    const cableList = activeCables || this.cables;
    const matchedCableIds: string[] = [];

    for (let i = 0; i < nodePath.length - 1; i++) {
      const u = nodePath[i];
      const v = nodePath[i + 1];

      // Find cable connecting u and v
      const match = cableList.find(
        (c) => (c.source === u && c.target === v) || (c.source === v && c.target === u)
      );

      if (match && !matchedCableIds.includes(match.id)) {
        matchedCableIds.push(match.id);
      }
    }

    return matchedCableIds;
  }

  // Dijkstra Shortest Path on Graph
  public calculateShortestPath(
    sourceId: string,
    targetId: string,
    activeCables?: NetworkCable[]
  ): DijkstraResult {
    if (sourceId === targetId) {
      return {
        path: [sourceId],
        totalLatencyMs: 0,
        hops: 0,
        reachable: true,
      };
    }

    const cablesToUse = activeCables || this.cables;
    
    // Build adjacency list for non-severed cables
    const adj = new Map<string, Array<{ neighbor: string; weight: number; cableId: string }>>();
    for (const node of this.nodes.values()) {
      adj.set(node.id, []);
    }

    for (const cable of cablesToUse) {
      if (cable.status === 'severed') continue;
      
      const u = cable.source;
      const v = cable.target;
      const weight = cable.latencyBaseMs;

      if (adj.has(u)) {
        adj.get(u)!.push({ neighbor: v, weight, cableId: cable.id });
      }
      if (adj.has(v)) {
        adj.get(v)!.push({ neighbor: u, weight, cableId: cable.id });
      }
    }

    // Connect each depot node via a virtual bidirectional metro fiber link (weight: 1.5 ms)
    // to its nearest network node ('ixp', 'landing_station', or 'aws_region')
    const networkNodes = Array.from(this.nodes.values()).filter(
      (n) => n.type === 'ixp' || n.type === 'landing_station' || n.type === 'aws_region'
    );
    for (const node of this.nodes.values()) {
      if (node.type === 'depot' && networkNodes.length > 0) {
        let nearestNetNode = networkNodes[0];
        let minD = Infinity;
        const depotPt = turf.point(node.coordinates);
        for (const netNode of networkNodes) {
          const d = turf.distance(depotPt, turf.point(netNode.coordinates), { units: 'kilometers' });
          if (d < minD) {
            minD = d;
            nearestNetNode = netNode;
          }
        }
        const virtualCableId = `virtual-metro-${node.id}-${nearestNetNode.id}`;
        if (adj.has(node.id)) {
          adj.get(node.id)!.push({ neighbor: nearestNetNode.id, weight: 1.5, cableId: virtualCableId });
        }
        if (adj.has(nearestNetNode.id)) {
          adj.get(nearestNetNode.id)!.push({ neighbor: node.id, weight: 1.5, cableId: virtualCableId });
        }
      }
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    for (const nodeId of this.nodes.keys()) {
      distances.set(nodeId, Infinity);
      previous.set(nodeId, null);
      unvisited.add(nodeId);
    }

    distances.set(sourceId, 0);

    while (unvisited.size > 0) {
      // Pick unvisited node with lowest distance
      let current: string | null = null;
      let minDistance = Infinity;
      for (const node of unvisited) {
        const d = distances.get(node)!;
        if (d < minDistance) {
          minDistance = d;
          current = node;
        }
      }

      if (current === null || minDistance === Infinity) break;
      if (current === targetId) break;

      unvisited.delete(current);

      const neighbors = adj.get(current) || [];
      for (const edge of neighbors) {
        if (!unvisited.has(edge.neighbor)) continue;
        const alt = distances.get(current)! + edge.weight;
        if (alt < distances.get(edge.neighbor)!) {
          distances.set(edge.neighbor, alt);
          previous.set(edge.neighbor, current);
        }
      }
    }

    // Reconstruct path
    const path: string[] = [];
    let curr: string | null = targetId;
    while (curr) {
      path.unshift(curr);
      curr = previous.get(curr) || null;
      if (curr === sourceId) {
        path.unshift(sourceId);
        break;
      }
    }

    const reachable = path.length > 1 && path[0] === sourceId && path[path.length - 1] === targetId;
    const totalLatency = reachable ? Math.round(distances.get(targetId)! * 10) / 10 : 999;

    return {
      path: reachable ? path : [],
      totalLatencyMs: totalLatency,
      hops: reachable ? path.length - 1 : 0,
      reachable,
    };
  }

  // Calculate Overall Global Mesh Availability %
  public getNetworkHealthPercentage(cables: NetworkCable[]): number {
    if (cables.length === 0) return 100;
    const healthyCount = cables.filter(c => c.status !== 'severed').length;
    return Math.round((healthyCount / cables.length) * 100);
  }

  // Find nearest repair depot to a target coordinate
  public findNearestDepot(targetCoords: [number, number]): NetworkNode {
    const depots = Array.from(this.nodes.values()).filter(n => n.type === 'depot');
    if (depots.length === 0) {
      return this.nodes.values().next().value!;
    }

    let nearest = depots[0];
    let minDistance = Infinity;

    const targetPoint = turf.point(targetCoords);
    for (const depot of depots) {
      const depotPoint = turf.point(depot.coordinates);
      const dist = turf.distance(targetPoint, depotPoint, { units: 'kilometers' });
      if (dist < minDistance) {
        minDistance = dist;
        nearest = depot;
      }
    }

    return nearest;
  }
}

