# KiroChaos 3D

Planetary Internet Resilience and AWS Spatial Dispatch Simulator built for the AWS Builder Center Spatial Challenge.

[English](README.md) | [Versión en Español](README.es.md)

Production URL: [https://dmioezmtwljpo.cloudfront.net](https://dmioezmtwljpo.cloudfront.net)  
Live Incident API: [https://u81plwceve.execute-api.us-east-2.amazonaws.com](https://u81plwceve.execute-api.us-east-2.amazonaws.com)

---

## Overview

Submarine fiber-optic cables and terrestrial backbones transport more than 95 percent of international internet traffic. Physical cuts caused by seismic activity, anchor drags, and equipment failures require immediate rerouting and physical dispatch.

KiroChaos 3D models this global infrastructure in an interactive 3D WebGL environment. It simulates fiber ruptures and seismic events, computes dynamic BGP Dijkstra failovers, and coordinates multimodal dispatch using Amazon Location Service, AWS Lambda, Amazon DynamoDB, and Apache Iceberg on Amazon S3. The entire cloud footprint runs within AWS Always Free Tier limits ($0.00 USD total cost).

---

## AWS Architecture

The application implements eight AWS services organized into spatial execution, persistence, and delivery layers.

```
                           +------------------------+
                           |   Client Web Browser   |
                           +-----------+------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
        +---------------------+                 +---------------------+
        |  Amazon CloudFront  |                 | Amazon API Gateway  |
        |  (Global Edge CDN)  |                 |     (HTTP API)      |
        +----------+----------+                 +----------+----------+
                   |                                       |
                   v                                       v
        +---------------------+                 +---------------------+
        |      Amazon S3      |                 |     AWS Lambda      |
        |  (Frontend Hosting) |                 |   (Chaos Logger)    |
        +---------------------+                 +-----+---------+-----+
                                                      |         |
                                                      v         v
                                            +-----------+     +------------+
                                            | DynamoDB  |     |  Bedrock   |
                                            | (Storage) |     | Nova-Micro |
                                            +-----------+     +------------+

   +-----------------------------------------------------------------------+
   |                        Spatial & Data Lake Layer                      |
   |                                                                       |
   |  Amazon Location Service:                                             |
   |    - Place Index (KiroNocPlaceIndex) -> Reverse Geocoding             |
   |    - Route Calculator (KiroNocRouteCalculator) -> Hazard Avoidance    |
   |                                                                       |
   |  Amazon S3 + AWS Glue + Amazon Athena:                                |
   |    - Iceberg Tables (s3://kirochaos-telemetry-*)                      |
   |    - Database: kiro_spatial_db                                        |
   +-----------------------------------------------------------------------+
```

### Deployed Services

1. **Amazon Location Service:**
   - Place Index (`KiroNocPlaceIndex`): Reverse geocodes rupture coordinates into municipality and country names.
   - Route Calculator (`KiroNocRouteCalculator`): Computes emergency road routes for repair crews from maintenance depots to fiber cut points, applying avoidance polygons around hazard zones.
   - API Key (`KiroNocWebKey`): Scoped credential with read-only access restricted to reverse geocoding and route calculation.
2. **Amazon CloudFront:**
   - Distribution `E139QIZAFN8Z17` serving static SPA assets over HTTPS with TLS 1.3, compression, and error response redirects (403/404 to `index.html`).
3. **Amazon S3:**
   - Frontend bucket (`kirochaos-frontend-*`) with public access blocked and Origin Access Control (OAC).
   - Telemetry data lake bucket (`kirochaos-telemetry-*`) holding global topology GeoJSON files and Apache Iceberg partitions.
4. **Amazon API Gateway:**
   - HTTP API (`kirochaos-api`) providing low-latency ingestion of chaos events with CORS enabled.
5. **AWS Lambda:**
   - Node.js 20.x runtime (`kirochaos-incident-logger`) executing event validation, DynamoDB persistence, and Bedrock Nova Micro inference fallbacks.
6. **Amazon DynamoDB:**
   - Table `kirochaos-incidents` configured in on-demand mode (`PAY_PER_REQUEST`) to store incident identifiers, severed cable arrays, latency metrics, and dispatch coordinates.
7. **AWS Glue Data Catalog:**
   - Database `kiro_spatial_db` tracking Apache Iceberg table schemas on S3.
8. **Amazon Bedrock:**
   - Automated SRE post-mortem generation based on the `amazon.nova-micro-v1:0` model format.

---

## Technical Features

- **Procedural 3D Globe:** Built with MapLibre GL JS v6 globe projection and Three.js WebGL overlay. Incorporates AWS S3 Terrarium DEM elevation tiles for 3D terrain relief.
- **Dynamic BGP Dijkstra Engine:** Real-time graph engine that recalculates shortest paths, hop sequences, and latency deltas when links are severed.
- **Multimodal Field Dispatch:** 
  - Terrestrial cuts snap directly to the fiber line geometry, select the closest maintenance depot by geodetic distance, and route the repair truck along highway networks around the hazard area.
  - Submarine cuts trigger both a shore landing station crew and the CS-Kiro cable ship to deploy ROV optical splicing units at sea.
- **Serverless Lakehouse Queries:** Built-in Athena spatial SQL interface executing `ST_Intersects` queries against Apache Iceberg Parquet files.
- **Cover Photo Mode:** UI suppression mode (`H` key) displaying clean 1200x675 marketing layouts with live Orbitron typography and procedural 3D elements.

---

## Repository Structure

```
kirochaos-3d/
├── aws-pipeline/
│   ├── 01_create_iceberg_tables.sql       # Athena DDL for Iceberg tables
│   ├── 02_export_topology_query.sql       # Spatial export queries
│   ├── lambda_chaos_logger.mjs            # Lambda function handler
│   ├── spatial_iceberg_etl.ipynb          # Jupyter notebook for Iceberg ETL
│   ├── README_AWS_SETUP.md                # Deployment reference
│   └── *.template.json                    # Policy and config templates
├── public/
│   ├── data/
│   │   └── network_topology.geojson       # Optical cable and node dataset
│   └── kiros_escondite.webp               # Application brand icon
├── src/
│   ├── components/
│   │   ├── TopHudBar.tsx                  # Global status, health, and navigation
│   │   ├── ChaosControlDeck.tsx           # Scenario runner and Ping tracer
│   │   ├── GlobeMapCanvas.tsx             # MapLibre 3D globe and routing layer
│   │   ├── GiantKiroStage.tsx             # Three.js 3D mascot and Earth overlay
│   │   ├── AwsTelemetryDrawer.tsx         # Telemetry drawer with AWS tabs
│   │   ├── ArchitectureModal.tsx          # AWS architecture modal
│   │   └── CoverShowcaseBadge.tsx         # Cover mode branding badge
│   ├── services/
│   │   ├── awsLocationClient.ts           # Location Service SDK integration
│   │   ├── networkGraphEngine.ts          # Dijkstra graph algorithm implementation
│   │   └── soundEffects.ts                # Web Audio API procedural synthesizer
│   ├── types/
│   │   └── spatial.ts                     # TypeScript definitions
│   ├── App.tsx                            # Main state coordinator
│   ├── main.tsx                           # Entry point
│   └── index.css                          # Styles and keyframes
├── .env.example                           # Environment configuration template
├── package.json
└── vite.config.ts
```

---

## Local Development

### Prerequisites

- Node.js 18+ or Bun 1.0+
- Modern browser with WebGL support

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Marce0c0/kirochaos-3D.git
   cd kirochaos-3D
   ```

2. Install dependencies:
   ```bash
   bun install
   # or: npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   The application operates with full offline simulation if AWS credentials are not configured.

4. Start the development server:
   ```bash
   bun run dev
   # or: npm run dev
   ```

5. Open `http://localhost:5173` in your browser.

---

## Cost and Free Tier Allocation

Every resource created for this simulator remains within the AWS Always Free Tier or 12-Month Free Tier:

- Amazon Location Service: Up to 10,000 route calculations and geocoding requests free per month.
- Amazon CloudFront: 1 TB data transfer out and 10,000,000 requests free per month.
- Amazon S3: 5 GB standard storage in the 12-month tier, standard micro-usage thereafter.
- AWS Lambda: 1,000,000 invocations and 3,200,000 seconds of compute time free per month.
- Amazon DynamoDB: 25 GB storage and 25 provisioned write/read units (or zero cost on idle pay-per-request).
- Amazon API Gateway: 1,000,000 HTTP API calls free per month.
- AWS Glue Data Catalog: 1,000,000 objects and requests free per month.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

