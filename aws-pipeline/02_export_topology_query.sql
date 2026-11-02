-- ==============================================================================
-- 02_EXPORT_TOPOLOGY_QUERY.SQL
-- Spatial ETL & Partitioned GeoJSON Materializer via Amazon Athena
-- Joins Subsea Cables, Andean Terrestrial Backbones, and USGS Seismic Faults
-- ==============================================================================

-- Query 1: Extract Andean Corridors connecting landlocked Bolivia (Cochabamba/La Paz)
-- to Pacific subsea cable landing stations (Arica/Tacna/Lima) and Atlantic Brazil
SELECT 
    t.feature_id,
    t.feature_name,
    t.layer_type,
    t.capacity_tbps,
    t.latency_base_ms,
    t.seismic_risk_zone,
    t.wkt_geometry
FROM kiro_spatial_db.global_fiber_topology t
WHERE t.corridor_name LIKE '%Andean%' OR t.region_code IN ('SA-WEST', 'SA-EAST')
ORDER BY t.capacity_tbps DESC;

-- Query 2: Spatial Hazard Intersect Query
-- Calculates which optical fibers intersect the Kiro Chaos Crater Polygon
WITH latest_incident AS (
    SELECT 
        incident_id,
        epicenter_lat,
        epicenter_lon,
        blast_radius_km,
        avoidance_polygon_wkt
    FROM kiro_spatial_db.kiro_chaos_incidents
    ORDER BY timestamp_utc DESC
    LIMIT 1
)
SELECT 
    f.feature_id,
    f.feature_name,
    f.capacity_tbps,
    f.latency_base_ms,
    i.incident_id,
    i.blast_radius_km
FROM kiro_spatial_db.global_fiber_topology f
CROSS JOIN latest_incident i
WHERE f.layer_type IN ('terrestrial', 'submarine', 'terrestrial_backbone', 'submarine_cable')
  AND ST_Intersects(
        ST_GeometryFromText(f.wkt_geometry),
        ST_GeometryFromText(i.avoidance_polygon_wkt)
      );

