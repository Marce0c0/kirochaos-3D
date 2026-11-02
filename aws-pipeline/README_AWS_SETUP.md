# AWS Deployment & Free-Tier Configuration Guide
## KiroChaos 3D — Planetary Internet Resilience & AWS Spatial Dispatch Simulator

This project demonstrates a production-grade 8-service AWS Spatial architecture that operates **100% within the AWS Free Tier** (or less than $0.05 total run cost).

---

### 1. The 8 AWS Services Implemented
1. **Amazon Location Service (Core Spatial Engine):**
   - **Maps:** Vector dark theme (`VectorEsriDarkGrayCanvas` / MapLibre GL 3D Globe).
   - **Places (`SearchPlaceIndexForPosition`):** Reverse geocoding of Kiro impact coordinates.
   - **Routes (`CalculateRoute`):** Dispatches emergency fiber repair trucks with highway routing and `AvoidanceAreas` bounding polygons.
2. **Amazon S3:** Hosts raw optical fiber datasets and Apache Iceberg Parquet partitions (`s3://.../iceberg-tables/`).
3. **Apache Iceberg + AWS Glue Data Catalog:** Schema versioning, partition pruning, and ACID table transactions.
4. **Amazon Athena:** Serverless spatial SQL engine running geospatial queries (`ST_Intersects`, `ST_GeometryFromText`).
5. **Amazon CloudFront:** Edge CDN distributing the single-page application with sub-millisecond cache latency.
6. **Amazon Cognito / API Keys:** Unauthenticated & role-based access for web browser SDK calls.
7. **AWS Lambda + Amazon DynamoDB:** Serverless REST backend logging planetary chaos incidents to a persistent feed.
8. **Amazon Bedrock (`amazon.nova-micro-v1:0`):** Ultra-low-cost, instant AI NOC Post-Mortem generator.

---

### 2. 5-Minute Setup for Judges & Developers

#### Step A: Configure Amazon Location Service
```bash
# 1. Create a Place Index
aws location create-place-index \
  --index-name KiroNocPlaceIndex \
  --data-source Esri \
  --pricing-plan RequestBasedUsage \
  --region us-east-2

# 2. Create a Route Calculator
aws location create-route-calculator \
  --calculator-name KiroNocRouteCalculator \
  --data-source Esri \
  --pricing-plan RequestBasedUsage \
  --region us-east-2

# 3. Create an API Key for Web Client
aws location create-key \
  --key-name KiroNocWebKey \
  --restrictions "AllowActions=geo:SearchPlaceIndexForPosition,geo:CalculateRoute,geo:GetMap*" \
  --region us-east-2
```

#### Step B: Create Apache Iceberg Tables via Athena
Run the SQL queries in `01_create_iceberg_tables.sql` inside the Amazon Athena Query Editor.

#### Step C: Local Environment Setup
Copy `.env.example` to `.env` and fill in your values (or leave blank to use the built-in high-fidelity Turf.js spatial simulation engine):
```bash
cp .env.example .env
bun install
bun run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

