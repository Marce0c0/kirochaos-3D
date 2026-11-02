import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Loader2, Circle, ShieldCheck } from 'lucide-react';

interface AwsBootSplashProps {
  onComplete?: () => void;
  lang?: 'es' | 'en';
}

interface StepItem {
  threshold: number;
  label: string;
}

const STEPS_EN: StepItem[] = [
  { threshold: 25, label: 'Mounting S3 Apache Iceberg v2 Parquet Snapshots (kiro_spatial_db)...' },
  { threshold: 55, label: 'Compiling 59-Feature Geodesic BGP Dijkstra Mesh (33 Nodes / 22 Trunks)...' },
  { threshold: 85, label: 'Initializing Amazon Location Service & AvoidanceAreas Spatial Engine...' },
  { threshold: 100, label: 'Linking Amazon Bedrock (nova-micro-v1:0) & 3D WebGL Terrain Globe...' },
];

const STEPS_ES: StepItem[] = [
  { threshold: 25, label: 'Montando Snapshots S3 Apache Iceberg v2 Parquet (kiro_spatial_db)...' },
  { threshold: 55, label: 'Compilando Malla BGP Dijkstra Geodésica de 59 Elementos (33 Nodos / 22 Troncales)...' },
  { threshold: 85, label: 'Iniciando Amazon Location Service y Motor Espacial AvoidanceAreas...' },
  { threshold: 100, label: 'Enlazando Amazon Bedrock (nova-micro-v1:0) y Globo de Terreno WebGL 3D...' },
];

export const AwsBootSplash: React.FC<AwsBootSplashProps> = ({ onComplete, lang = 'es' }) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [progress, setProgress] = useState(8);
  const [isFading, setIsFading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [stepLatencies, setStepLatencies] = useState<{ [key: number]: number }>({});

  const steps = lang === 'en' ? STEPS_EN : STEPS_ES;

  useEffect(() => {
    // Generate randomized durations for each service to simulate realistic cloud latency variance
    const d1 = Math.floor(220 + Math.random() * 420); // S3 Iceberg: 220ms - 640ms
    const d2 = Math.floor(250 + Math.random() * 460); // BGP Mesh: 250ms - 710ms
    const d3 = Math.floor(280 + Math.random() * 480); // Location Service: 280ms - 760ms
    const d4 = Math.floor(200 + Math.random() * 380); // Bedrock Nova Micro: 200ms - 580ms

    const t1_mid = d1 * 0.45;
    const t1_end = d1;

    const t2_mid = d1 + d2 * 0.45;
    const t2_end = d1 + d2;

    const t3_mid = t2_end + d3 * 0.45;
    const t3_end = t2_end + d3;

    const t4_mid = t3_end + d4 * 0.45;
    const t4_end = t3_end + d4;

    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 1: Iceberg S3
    timers.push(setTimeout(() => setProgress(Math.floor(16 + Math.random() * 6)), t1_mid));
    timers.push(
      setTimeout(() => {
        setProgress(Math.floor(30 + Math.random() * 6));
        setStepLatencies((prev) => ({ ...prev, 0: d1 }));
      }, t1_end)
    );

    // Step 2: BGP Dijkstra
    timers.push(setTimeout(() => setProgress(Math.floor(44 + Math.random() * 6)), t2_mid));
    timers.push(
      setTimeout(() => {
        setProgress(Math.floor(60 + Math.random() * 6));
        setStepLatencies((prev) => ({ ...prev, 1: d2 }));
      }, t2_end)
    );

    // Step 3: Location Service
    timers.push(setTimeout(() => setProgress(Math.floor(74 + Math.random() * 6)), t3_mid));
    timers.push(
      setTimeout(() => {
        setProgress(Math.floor(88 + Math.random() * 5));
        setStepLatencies((prev) => ({ ...prev, 2: d3 }));
      }, t3_end)
    );

    // Step 4: Bedrock Nova Micro & WebGL Globe
    timers.push(setTimeout(() => setProgress(Math.floor(94 + Math.random() * 4)), t4_mid));
    timers.push(
      setTimeout(() => {
        setProgress(100);
        setStepLatencies((prev) => ({ ...prev, 3: d4 }));
      }, t4_end)
    );

    // Fade-out and completion
    timers.push(setTimeout(() => setIsFading(true), t4_end + 320));
    timers.push(
      setTimeout(() => {
        setIsDone(true);
        onCompleteRef.current?.();
      }, t4_end + 820)
    );

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  const handleSkip = () => {
    setProgress(100);
    setStepLatencies({
      0: Math.floor(140 + Math.random() * 40),
      1: Math.floor(120 + Math.random() * 40),
      2: Math.floor(160 + Math.random() * 40),
      3: Math.floor(110 + Math.random() * 40),
    });
    setIsFading(true);
    setTimeout(() => {
      setIsDone(true);
      onCompleteRef.current?.();
    }, 220);
  };

  if (isDone) return null;

  const getSubStatusLabel = () => {
    if (progress < 25) return lang === 'en' ? 'MOUNTING S3 ICEBERG PARQUET' : 'MONTANDO PARQUET S3 ICEBERG';
    if (progress < 55) return lang === 'en' ? 'RESOLVING BGP DIJKSTRA MESH' : 'COMPILANDO MALLA BGP DIJKSTRA';
    if (progress < 85) return lang === 'en' ? 'CALCULATING HAZARD AVOIDANCE' : 'CALCULANDO EVITACIÓN ESPACIAL';
    if (progress < 100) return lang === 'en' ? 'LINKING BEDROCK NOVA MICRO' : 'ENLAZANDO BEDROCK NOVA-MICRO';
    return lang === 'en' ? 'ALL SYSTEMS NOMINAL // NOC ONLINE' : 'SISTEMAS OPERATIVOS // NOC ONLINE';
  };

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#060911]/95 backdrop-blur-2xl flex items-center justify-center p-4 transition-opacity duration-500 select-none font-mono ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative w-[450px] max-w-[92vw] bg-[#0B0F19] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-[0_0_70px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Subtle top amber highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF9900] to-transparent opacity-80" />

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded-md bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
          title={lang === 'en' ? 'Skip startup check' : 'Saltar verificación de inicio'}
        >
          <span>{lang === 'en' ? 'Skip' : 'Saltar'}</span>
        </button>

        {/* Header with Official AWS Logo & Title */}
        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-slate-800/80">
          <div className="shrink-0 px-2 py-1.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner flex items-center justify-center">
            {/* Official AWS Logo from Amazon_Web_Services_Logo.svg */}
            <svg
              className="w-12 h-7.5"
              viewBox="0 0 304 182"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="AWS Logo"
            >
              {/* aws letters */}
              <path
                fill="#FFFFFF"
                d="M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2 c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8 c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8 c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4 c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1 c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6 c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7 c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6 C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4 c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1 h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5 c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.6-2.1,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1 c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-4,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8 c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3 c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5 c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1 c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1 c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2 c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1 c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6 c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z"
              />
              {/* official orange smile curve */}
              <path
                fill="#FF9900"
                d="M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4 c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z"
              />
              {/* official orange arrowhead */}
              <path
                fill="#FF9900"
                d="M287.2,128.1c-4.2-5.4-27.8-2.6-38.5-1.3c-3.2,0.4-3.7-2.4-0.8-4.5c18.8-13.2,49.7-9.4,53.3-5 c3.6,4.5-1,35.4-18.6,50.2c-2.7,2.3-5.3,1.1-4.1-1.9C282.5,155.7,291.4,133.4,287.2,128.1z"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-white tracking-wider">
                KIROCHAOS 3D
              </span>
              <span className="text-[9px] bg-[#FF9900]/15 text-[#FF9900] border border-[#FF9900]/30 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                NOC ENGINE
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-tight">
              AWS SPATIAL LAKEHOUSE & RESILIENCE
            </span>
          </div>
        </div>

        {/* Real-Time Simulated Checklist */}
        <div className="flex flex-col gap-2.5 mb-5 text-[11px]">
          {steps.map((step, idx) => {
            const isCompleted = progress >= step.threshold;
            const isCurrent =
              progress < step.threshold &&
              (idx === 0 || progress >= steps[idx - 1].threshold);

            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 transition-colors duration-200 ${
                  isCompleted
                    ? 'text-slate-300'
                    : isCurrent
                    ? 'text-amber-300 font-semibold'
                    : 'text-slate-600'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[#FF9900] animate-spin shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                )}
                <span className="leading-snug break-words flex-1">{step.label}</span>
                {isCompleted && stepLatencies[idx] ? (
                  <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0 ml-1">
                    {stepLatencies[idx]}ms
                  </span>
                ) : isCurrent ? (
                  <span className="text-[9px] font-mono text-amber-400/80 animate-pulse shrink-0 ml-1">
                    {lang === 'en' ? 'syncing...' : 'sincronizando...'}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Precision Progress Bar */}
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[9px] tracking-wider uppercase">{getSubStatusLabel()}</span>
            </span>
            <span className="font-bold text-cyan-300 font-mono">
              {progress.toString().padStart(2, '0')}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-[#FF9900] via-amber-400 to-cyan-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500 font-mono">
          <span>REGION: us-east-2</span>
          <span>TIER: 100% FREE-TIER ($0.00)</span>
          <span>ENGINE: WEBGL2</span>
        </div>
      </div>
    </div>
  );
};
