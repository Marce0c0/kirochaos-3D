-- ==============================================================================
-- 01_CREATE_ICEBERG_TABLES.SQL
-- KiroChaos 3D — Apache Iceberg Spatial Lakehouse on Amazon Athena & S3
-- AWS Builder Center Spatial Challenge | 100% Free-Tier Compatible
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS kiro_spatial_db;

-- 1. Iceberg Table: Global Submarine & Terrestrial Fiber Topology
CREATE TABLE IF NOT EXISTS kiro_spatial_db.global_fiber_topology (
  feature_id string,
  feature_name string,
  layer_type string,           -- 'submarine_cable', 'terrestrial_backbone', 'landing_station', 'aws_region'
  corridor_name string,        -- e.g. 'Andean-Pacific Corridor (Bolivia - Chile)'
  region_code string,          -- e.g. 'SA-WEST', 'SA-EAST', 'NA-EAST'
  origin_node_id string,
  dest_node_id string,
  capacity_tbps double,
  latency_base_ms double,
  status string,               -- 'healthy', 'severed', 'rerouted'
  wkt_geometry string,         -- GeoJSON / WKT LineString or Point
  min_depth_meters double,
  seismic_risk_zone string,    -- 'Nazca-SouthAmerican Subduction', 'Pacific Ring of Fire'
  last_updated timestamp
)
LOCATION 's3://kiro-chaos-spatial-lakehouse-prod/iceberg-tables/global_fiber_topology/'
TBLPROPERTIES (
  'table_type'='ICEBERG',
  'format'='parquet',
  'write_compression'='snappy',
  'vacuum_max_snapshot_age_ms'='86400000',
  'optimize_rewrite_data_file_threshold'='5'
);

-- 2. Iceberg Table: Planetary Kiro Chaos Incident Log
CREATE TABLE IF NOT EXISTS kiro_spatial_db.kiro_chaos_incidents (
  incident_id string,
  timestamp_utc timestamp,
  attack_type string,          -- 'EARTHSHAKER', 'METEOR_STRIKE', 'BGP_FLAP'
  epicenter_lat double,
  epicenter_lon double,
  blast_radius_km double,
  severed_cable_ids array<string>,
  affected_regions array<string>,
  bgp_latency_spike_ms double,
  repair_depot_id string,
  road_detour_distance_km double,
  repair_eta_minutes int,
  avoidance_polygon_wkt string,
  bedrock_post_mortem string
)
LOCATION 's3://kiro-chaos-spatial-lakehouse-prod/iceberg-tables/kiro_chaos_incidents/'
TBLPROPERTIES (
  'table_type'='ICEBERG',
  'format'='parquet',
  'write_compression'='snappy'
);

