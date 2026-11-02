import React from 'react';
import { X, Check, Database, MapPin, Cpu, ShieldCheck, Zap, Cloud, Layers, Terminal, ArrowRight } from 'lucide-react';
import { Language, TRANSLATIONS } from '../i18n/translations';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose, lang = 'es' }) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];

  const services = [
    {
      num: 1,
      name: 'Amazon Location Service',
      category: lang === 'en' ? 'Core Spatial Engine' : 'Motor Espacial Central',
      icon: MapPin,
      badge: lang === 'en' ? 'Free Tier (3-month / request based)' : 'Capa Gratuita (Peticiones)',
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30',
      description:
        lang === 'en'
          ? 'Powers the 3D dark vector basemap, reverse geocoding (SearchPlaceIndexForPosition) of impact zones, and vehicle hazard routing (CalculateRoute) avoiding fiber cut hazard zones (AvoidanceAreas).'
          : 'Alimenta el mapa base vectorial 3D oscuro, geocodificación inversa (SearchPlaceIndexForPosition) de zonas de impacto, y cálculo de rutas de emergencia (CalculateRoute) esquivando zonas de corte de fibra (AvoidanceAreas).',
    },
    {
      num: 2,
      name: 'Amazon S3',
      category: lang === 'en' ? 'Spatial Data Lakehouse' : 'Data Lakehouse Espacial',
      icon: Database,
      badge: lang === 'en' ? 'Free Tier (5GB Standard Storage)' : 'Capa Gratuita (5GB Standard)',
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/30',
      description:
        lang === 'en'
          ? 'Stores raw GeoJSON optical fiber layers, USGS fault lines, and hosts the Apache Iceberg Parquet files with snappy compression.'
          : 'Almacena capas GeoJSON de fibra óptica, fallas geológicas USGS y aloja los archivos Parquet de Apache Iceberg con compresión snappy.',
    },
    {
      num: 3,
      name: 'Apache Iceberg + AWS Glue',
      category: lang === 'en' ? 'ACID Lakehouse Table Format' : 'Formato de Tablas ACID Lakehouse',
      icon: Layers,
      badge: lang === 'en' ? 'Glue 1M Free Metadata Requests' : 'Glue 1M Peticiones Libres',
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30',
      description:
        lang === 'en'
          ? 'Maintains immutable versioned snapshots of global cable topology, allowing instant rollback and zero-copy partition pruning for spatial queries.'
          : 'Mantiene instantáneas inmutables y versionadas de la topología global de cables, permitiendo rollback instantáneo y poda de particiones sin copia para consultas espaciales.',
    },
    {
      num: 4,
      name: 'Amazon Athena',
      category: lang === 'en' ? 'Serverless Spatial SQL' : 'SQL Espacial Serverless',
      icon: Terminal,
      badge: lang === 'en' ? 'Free Tier (1TB scanned/mo)' : 'Capa Gratuita (1TB escaneado/mes)',
      color: 'text-purple-400 border-purple-500/40 bg-purple-950/30',
      description:
        lang === 'en'
          ? 'Executes serverless geospatial queries using ST_Intersects and ST_GeometryFromText to pinpoint optical cables severed by Kiro impact polygons.'
          : 'Ejecuta consultas geoespaciales serverless usando ST_Intersects y ST_GeometryFromText para identificar cables ópticos cortados por los polígonos de impacto de Kiro.',
    },
    {
      num: 5,
      name: 'Amazon CloudFront',
      category: lang === 'en' ? 'Global Edge CDN' : 'CDN Global de Borde',
      icon: Cloud,
      badge: lang === 'en' ? 'Always Free (1TB transfer/mo)' : 'Siempre Gratis (1TB transfer/mes)',
      color: 'text-blue-400 border-blue-500/40 bg-blue-950/30',
      description:
        lang === 'en'
          ? 'Distributes the React/Three.js SPA and caches vector tiles and GeoJSON topology files with sub-5ms latency across 400+ Edge Locations.'
          : 'Distribuye la SPA React/Three.js y cachea teselas vectoriales y archivos GeoJSON con latencia sub-5ms en más de 400 Edge Locations.',
    },
    {
      num: 6,
      name: 'Amazon Cognito & API Keys',
      category: lang === 'en' ? 'Identity & Access Control' : 'Identidad y Control de Acceso',
      icon: ShieldCheck,
      badge: lang === 'en' ? 'Always Free (50k MAUs)' : 'Siempre Gratis (50k MAUs)',
      color: 'text-indigo-400 border-indigo-500/40 bg-indigo-950/30',
      description:
        lang === 'en'
          ? 'Provides scoped credentials and API Key authorization for client-side WebGL applications calling Amazon Location APIs securely.'
          : 'Proporciona credenciales acotadas y autorización por API Key para aplicaciones WebGL clientes que consultan APIs de Amazon Location de forma segura.',
    },
    {
      num: 7,
      name: 'AWS Lambda + DynamoDB',
      category: lang === 'en' ? 'Serverless Chaos Logging' : 'Registro de Caos Serverless',
      icon: Zap,
      badge: lang === 'en' ? 'Always Free (1M reqs / 25GB)' : 'Siempre Gratis (1M reqs / 25GB)',
      color: 'text-rose-400 border-rose-500/40 bg-rose-950/30',
      description:
        lang === 'en'
          ? 'Logs all Kiro Earthshaker and physical fiber cut events in real-time, recording epicenters, severed infrastructure, and truck dispatch telemetry.'
          : 'Registra todos los eventos de terremoto y cortes físicos de fibra en tiempo real, guardando epicentros, infraestructura afectada y telemetría de despacho.',
    },
    {
      num: 8,
      name: 'Amazon Bedrock (Nova Micro)',
      category: lang === 'en' ? 'Automated SRE Diagnostics' : 'Diagnóstico Automatizado SRE NOC',
      icon: Cpu,
      badge: lang === 'en' ? 'Ultra-low cost ($0.00003/call)' : 'Costo ultra-bajo ($0.00003/llamada)',
      color: 'text-fuchsia-400 border-fuchsia-500/40 bg-fuchsia-950/30',
      description:
        lang === 'en'
          ? 'Synthesizes instant 3-line NOC Post-Mortem Incident Reports explaining physical fiber damage, affected regions, and repair ETAs.'
          : 'Sintetiza informes post-mortem instantáneos de 3 líneas para NOC explicando daños físicos a la fibra, regiones afectadas y tiempos estimados de reparación (ETA).',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#0B0F19] border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>{t.architectureModal.modalTitle}</span>
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {t.architectureModal.costZero}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'en'
                  ? 'Spatial Data Lakehouse & Emergency Dispatch Pipeline for the AWS Builder Center'
                  : 'Spatial Data Lakehouse & Pipeline de Despacho de Emergencia para el AWS Builder Center'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Architecture Flow Diagram */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-purple-300 mb-3">
              {t.architectureModal.pipelineFlow}
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-center">
              <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{lang === 'en' ? 'Step 1: Storage' : 'Paso 1: Almacenamiento'}</span>
                <span className="text-amber-300 font-bold">Amazon S3</span>
                <p className="text-[9px] text-slate-400 mt-1">GeoJSON &amp; Faults</p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

              <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{lang === 'en' ? 'Step 2: Table Format' : 'Paso 2: Formato ACID'}</span>
                <span className="text-cyan-300 font-bold">Apache Iceberg</span>
                <p className="text-[9px] text-slate-400 mt-1">AWS Glue Catalog</p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

              <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{lang === 'en' ? 'Step 3: Serverless SQL' : 'Paso 3: SQL Serverless'}</span>
                <span className="text-purple-300 font-bold">Amazon Athena</span>
                <p className="text-[9px] text-slate-400 mt-1">ST_Intersects Cuts</p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

              <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{lang === 'en' ? 'Step 4: Spatial Engine' : 'Paso 4: Motor Espacial'}</span>
                <span className="text-emerald-300 font-bold">Amazon Location</span>
                <p className="text-[9px] text-slate-400 mt-1">Places &amp; Detours</p>
              </div>

              <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

              <div className="flex-1 min-w-[120px] p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">{lang === 'en' ? 'Step 5: SRE Post-Mortem' : 'Paso 5: Post-Mortem SRE'}</span>
                <span className="text-fuchsia-300 font-bold">Bedrock Nova Micro</span>
                <p className="text-[9px] text-slate-400 mt-1">NOC Briefs</p>
              </div>
            </div>
          </div>

          {/* 8 Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {services.map((svc) => {
              const Icon = svc.icon;
              return (
                <div
                  key={svc.num}
                  className={`p-3.5 rounded-2xl border ${svc.color} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700/60">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h4 className="font-bold text-sm text-slate-100">{svc.name}</h4>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                        {svc.badge}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                      {svc.category}
                    </span>
                    <p className="text-xs text-slate-300 leading-snug">{svc.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Apache Iceberg Athena SQL snippet */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-amber-400 font-bold text-[11px]">
                {t.architectureModal.athenaCodeTitle}
              </span>
              <span className="text-[10px] text-slate-500">{t.architectureModal.athenaCodeSub}</span>
            </div>
            <pre className="text-[10px] text-slate-300 overflow-x-auto p-3 rounded-xl bg-[#070A13] border border-slate-800 leading-relaxed">
{`CREATE DATABASE IF NOT EXISTS kiro_spatial_db;

CREATE TABLE kiro_spatial_db.global_fiber_topology (
  feature_id string,
  feature_name string,
  layer_type string,
  corridor_name string,
  region_code string,
  capacity_tbps double,
  latency_base_ms double,
  wkt_geometry string,
  last_updated timestamp
)
LOCATION 's3://kiro-chaos-spatial-lakehouse-prod/iceberg-tables/global_fiber_topology/'
TBLPROPERTIES (
  'table_type'='ICEBERG',
  'format'='parquet',
  'write_compression'='snappy'
);`}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
            <Check className="w-4 h-4" />
            <span>{lang === 'en' ? '100% Free-Tier Reproducible & Zero-Cost Tested' : '100% Reproducible en Capa Gratuita & Costo Cero ($0.00)'}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition"
          >
            {t.architectureModal.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

