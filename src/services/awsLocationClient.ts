import {
  LocationClient,
  SearchPlaceIndexForPositionCommand,
  CalculateRouteCommand,
} from '@aws-sdk/client-location';
import * as turf from '@turf/turf';
import { AwsRouteResult, KiroCrater } from '../types/spatial';

interface ReverseGeocodeResult {
  placeName: string;
  country: string;
  municipality: string;
  road?: string;
  source: 'AWS_LOCATION_PLACES' | 'OPENSTREETMAP_NOMINATIM' | 'SPATIAL_TOPOLOGY_INDEX';
}

class AwsLocationServiceManager {
  private client: LocationClient | null = null;
  private apiKey: string | null = null;
  private region: string = 'us-east-2';
  private placeIndexName: string = 'KiroNocPlaceIndex';
  private routeCalculatorName: string = 'KiroNocRouteCalculator';

  constructor() {
    this.apiKey = import.meta.env.VITE_AWS_LOCATION_API_KEY || null;
    this.region = import.meta.env.VITE_AWS_REGION || 'us-east-2';
    this.placeIndexName = import.meta.env.VITE_AWS_PLACE_INDEX_NAME || 'KiroNocPlaceIndex';
    this.routeCalculatorName = import.meta.env.VITE_AWS_ROUTE_CALCULATOR_NAME || 'KiroNocRouteCalculator';

    if (this.apiKey) {
      try {
        this.client = new LocationClient({
          region: this.region,
        });
      } catch (e) {
        console.warn('Could not initialize AWS Location Client, using simulation engine.', e);
        this.client = null;
      }
    }
  }

  // Reverse Geocoding: AWS Location Service -> OpenStreetMap Nominatim Live -> Local Spatial Index
  public async reverseGeocode(position: [number, number]): Promise<ReverseGeocodeResult> {
    let [lon, lat] = position;
    if (lon < -180) lon += 360;
    if (lon > 180) lon -= 360;

    // 1. AWS Location Service REST endpoint with API Key (Browser-native, avoids SigV4 credential errors)
    if (this.apiKey) {
      try {
        const placesUrl = `https://places.geo.${this.region}.amazonaws.com/places/v0/indexes/${encodeURIComponent(this.placeIndexName)}/search/position?key=${encodeURIComponent(this.apiKey)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const resp = await fetch(placesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Position: [lon, lat], MaxResults: 1 }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (resp.ok) {
          const res = await resp.json();
          if (res.Results && res.Results.length > 0) {
            const place = res.Results[0].Place;
            const label = place?.Label || `${place?.Municipality || 'Urban Center'}, ${place?.Country || ''}`;
            return {
              placeName: label,
              country: place?.Country || 'South America',
              municipality: place?.Municipality || 'Subsea Corridor',
              road: place?.Street,
              source: 'AWS_LOCATION_PLACES',
            };
          }
        }
      } catch (err) {
        console.warn('AWS Places REST error, trying SDK / Nominatim fallback:', err);
      }
    }

    // 1b. AWS Location Service SDK fallback if credentials available
    if (this.client && this.apiKey) {
      try {
        const command = new SearchPlaceIndexForPositionCommand({
          IndexName: this.placeIndexName,
          Position: [lon, lat],
          MaxResults: 1,
          Key: this.apiKey,
        });
        const res = await this.client.send(command);
        if (res.Results && res.Results.length > 0) {
          const place = res.Results[0].Place;
          const label = place?.Label || `${place?.Municipality || 'Urban Center'}, ${place?.Country || ''}`;
          return {
            placeName: label,
            country: place?.Country || 'South America',
            municipality: place?.Municipality || 'Subsea Corridor',
            road: place?.Street,
            source: 'AWS_LOCATION_PLACES',
          };
        }
      } catch (err) {
        console.warn('AWS SearchPlaceIndex error, trying Nominatim fallback:', err);
      }
    }

    // 2. OpenStreetMap Nominatim Live Public API
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'KiroChaos-3D-NOC/1.0',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const addr = data.address || {};
        const road = addr.road || addr.highway || addr.suburb || '';
        const town = addr.city || addr.town || addr.municipality || addr.village || addr.county || 'Urban Area';
        const country = addr.country || 'International Waters';
        const placeName = road ? `${road}, ${town}, ${country}` : `${town}, ${country}`;

        if (placeName && placeName.length > 3) {
          return {
            placeName,
            country,
            municipality: town,
            road: road || undefined,
            source: 'OPENSTREETMAP_NOMINATIM',
          };
        }
      }
    } catch {
      // Nominatim failed or timed out, fall through to high-fidelity geographic dictionary
    }

    // 3. High-Fidelity Regional Geographic Fallback
    let name = 'Pacific Subsea Junction';
    let country = 'Chile / Peru Border';
    let municipality = 'Arica-Tacna Interconnect';
    let road = 'Ruta 5 Panamericana';

    if (lat >= -19.5 && lat <= -17.5 && lon >= -71.5 && lon <= -69.5) {
      name = 'Ruta 5 Panamericana, Arica-Tacna Optical Border';
      country = 'Chile';
      municipality = 'Arica (Arica y Parinacota)';
      road = 'Ruta Panamericana 5 Norte';
    } else if (lat >= -18.0 && lat <= -16.5 && lon >= -67.0 && lon <= -65.5) {
      name = 'Carretera RN4, Corredor de Fibra Valle de Cochabamba';
      country = 'Bolivia';
      municipality = 'Cochabamba';
      road = 'Ruta Nacional 4';
    } else if (lat >= -17.0 && lat <= -15.5 && lon >= -69.0 && lon <= -67.5) {
      name = 'Autopista La Paz - El Alto / Altiplano Core';
      country = 'Bolivia';
      municipality = 'La Paz';
      road = 'Ruta 1';
    } else if (lat >= -4.5 && lat <= -3.0 && lon >= -39.5 && lon <= -37.5) {
      name = 'Praia do Futuro Hub, Av. Dioguinho, Fortaleza';
      country = 'Brazil';
      municipality = 'Fortaleza (Ceará)';
      road = 'Av. Zezé Diogo';
    } else if (lat >= 38.0 && lat <= 41.5 && lon >= -78.5 && lon <= -73.5) {
      name = 'Loudoun County Pkwy, Ashburn Data Center Nexus';
      country = 'United States';
      municipality = 'Ashburn / Loudoun County, VA';
      road = 'VA-267 / Waxpool Rd';
    } else if (lat >= 52.5 && lat <= 54.5 && lon >= -7.5 && lon <= -5.5) {
      name = 'Grand Canal Dock / Silicon Docks, Dublin';
      country = 'Ireland';
      municipality = 'Dublin';
      road = 'East Wall Rd';
    }

    return {
      placeName: `${name} (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
      country,
      municipality,
      road,
      source: 'SPATIAL_TOPOLOGY_INDEX',
    };
  }

  // Calculate Emergency Route using AWS Location -> OSRM Road Routing -> Turf.js Detour
  public async calculateEmergencyRoute(
    depotCoords: [number, number],
    targetCoords: [number, number],
    depotName: string,
    targetName: string,
    crater?: KiroCrater
  ): Promise<AwsRouteResult> {
    // 0. The truck arrives directly at targetCoords on the fiber corridor
    const effectiveTargetCoords: [number, number] = targetCoords;

    // Compute detour waypoint outside crater if crater blocks direct path
    const detourPoint = this.computeDetourApex(depotCoords, effectiveTargetCoords, crater);

    // 1. Live AWS Location Service REST endpoint with API Key (Browser-native, avoids SigV4 credential errors)
    if (this.apiKey) {
      try {
        const routesUrl = `https://routes.geo.${this.region}.amazonaws.com/routes/v0/calculators/${encodeURIComponent(this.routeCalculatorName)}/calculate/route?key=${encodeURIComponent(this.apiKey)}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(routesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            DeparturePosition: depotCoords,
            DestinationPosition: effectiveTargetCoords,
            WaypointPositions: detourPoint ? [detourPoint] : undefined,
            TravelMode: 'Truck',
            DistanceUnit: 'Kilometers',
            IncludeLegGeometry: true,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const response = await resp.json();
          if (response.Legs && response.Legs.length > 0) {
            const coords: [number, number][] = [];
            let totalDistance = 0;
            let totalDuration = 0;

            for (const leg of response.Legs) {
              totalDistance += leg.Distance || 0;
              totalDuration += leg.DurationSeconds || 0;
              if (leg.Geometry?.LineString) {
                for (const pt of leg.Geometry.LineString) {
                  coords.push([pt[0], pt[1]]);
                }
              }
            }

            if (coords.length > 1) {
              return {
                distanceKm: Math.round(totalDistance * 10) / 10,
                durationMinutes: Math.round(totalDuration / 60),
                coordinates: coords,
                engine: 'LIVE AWS LOCATION SDK',
                avoidanceAreasCount: crater ? 1 : 0,
                originName: depotName,
                destinationName: targetName,
              };
            }
          }
        }
      } catch (err) {
        console.warn('AWS CalculateRoute REST error, trying SDK / OSRM fallback:', err);
      }
    }

    // 1b. Live AWS Location Service SDK fallback
    if (this.client && this.apiKey) {
      try {
        const command = new CalculateRouteCommand({
          CalculatorName: this.routeCalculatorName,
          DeparturePosition: depotCoords,
          DestinationPosition: effectiveTargetCoords,
          WaypointPositions: detourPoint ? [detourPoint] : undefined,
          TravelMode: 'Truck',
          DistanceUnit: 'Kilometers',
          Key: this.apiKey,
        });

        const response = await this.client.send(command);
        if (response.Legs && response.Legs.length > 0) {
          const coords: [number, number][] = [];
          let totalDistance = 0;
          let totalDuration = 0;

          for (const leg of response.Legs) {
            totalDistance += leg.Distance || 0;
            totalDuration += leg.DurationSeconds || 0;
            if (leg.Geometry?.LineString) {
              for (const pt of leg.Geometry.LineString) {
                coords.push([pt[0], pt[1]]);
              }
            }
          }

          if (coords.length > 1) {
            return {
              distanceKm: Math.round(totalDistance * 10) / 10,
              durationMinutes: Math.round(totalDuration / 60),
              coordinates: coords,
              engine: 'LIVE AWS LOCATION SDK',
              avoidanceAreasCount: crater ? 1 : 0,
              originName: depotName,
              destinationName: targetName,
            };
          }
        }
      } catch (err) {
        console.warn('AWS CalculateRoute fallback triggered:', err);
      }
    }

    // 2. Real Road Navigation via OSRM Public Routing API
    try {
      const osrmPoints = detourPoint
        ? `${depotCoords[0]},${depotCoords[1]};${detourPoint[0]},${detourPoint[1]};${effectiveTargetCoords[0]},${effectiveTargetCoords[1]}`
        : `${depotCoords[0]},${depotCoords[1]};${effectiveTargetCoords[0]},${effectiveTargetCoords[1]}`;

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${osrmPoints}?geometries=geojson&overview=full`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const resp = await fetch(osrmUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates as [number, number][];
          if (coords && coords.length > 1) {
            const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
            const durationMinutes = Math.max(14, Math.round(route.duration / 60));
            return {
              distanceKm,
              durationMinutes,
              coordinates: coords,
              engine: 'TURF.JS SPATIAL ENGINE (SIMULATION FALLBACK)',
              avoidanceAreasCount: crater ? 1 : 0,
              originName: depotName,
              destinationName: targetName,
            };
          }
        }
      }
    } catch {
      // OSRM failed or network timed out, fall back to smooth road bezier
    }

    // 3. Fallback: High-Fidelity Realistic Road & Detour Routing Engine with Turf.js
    const detourPath = this.generateDetourPolyline(depotCoords, effectiveTargetCoords, crater);
    const line = turf.lineString(detourPath);
    const lengthKm = Math.round(turf.length(line, { units: 'kilometers' }) * 10) / 10;
    const durationMinutes = Math.max(18, Math.round((lengthKm / 55) * 60));

    return {
      distanceKm: lengthKm,
      durationMinutes,
      coordinates: detourPath,
      engine: 'TURF.JS SPATIAL ENGINE (SIMULATION FALLBACK)',
      avoidanceAreasCount: crater ? 1 : 0,
      originName: depotName,
      destinationName: targetName,
    };
  }

  // Calculate detour apex outside crater
  private computeDetourApex(
    start: [number, number],
    end: [number, number],
    crater?: KiroCrater
  ): [number, number] | null {
    if (!crater) return null;

    // Check if the route between start and end actually passes near the hazard exclusion zone
    const directLine = turf.lineString([start, end]);
    const distToLine = turf.pointToLineDistance(turf.point(crater.center), directLine, { units: 'kilometers' });
    if (distToLine > crater.radiusKm * 1.35) {
      return null;
    }

    // Compute safe detour point around the hazard perimeter
    const bearingStartToEnd = turf.bearing(turf.point(start), turf.point(end));
    const mid = turf.midpoint(turf.point(start), turf.point(end));
    const testP1 = turf.destination(mid, crater.radiusKm * 1.45, bearingStartToEnd + 90, { units: 'kilometers' });
    const testP2 = turf.destination(mid, crater.radiusKm * 1.45, bearingStartToEnd - 90, { units: 'kilometers' });
    const d1 = turf.distance(testP1, turf.point(crater.center), { units: 'kilometers' });
    const d2 = turf.distance(testP2, turf.point(crater.center), { units: 'kilometers' });
    const bestApex = d1 > d2 ? testP1 : testP2;

    return bestApex.geometry.coordinates as [number, number];
  }

  // Generate realistic curved highway detour around fiber cut hazard exclusion polygon
  private generateDetourPolyline(
    start: [number, number],
    end: [number, number],
    crater?: KiroCrater
  ): [number, number][] {
    const apex = this.computeDetourApex(start, end, crater);
    const waypoints: [number, number][] = [start];
    const steps = 18;

    if (apex) {
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const lon = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * apex[0] + t * t * end[0];
        const lat = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * apex[1] + t * t * end[1];
        const roadWiggle = Math.sin(t * Math.PI * 3) * 0.003;
        waypoints.push([lon + roadWiggle, lat + roadWiggle]);
      }
    } else {
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const lon = start[0] + (end[0] - start[0]) * t;
        const lat = start[1] + (end[1] - start[1]) * t;
        const curveOffset = Math.sin(t * Math.PI) * 0.008;
        waypoints.push([lon + curveOffset, lat - curveOffset * 0.5]);
      }
    }

    waypoints.push(end);
    return waypoints;
  }
}

export const awsLocation = new AwsLocationServiceManager();
