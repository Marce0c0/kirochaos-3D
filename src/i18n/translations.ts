// Internationalization Dictionary (ES / EN)
// 100% Comprehensive Bilingual Translation for KiroChaos 3D

export type Language = 'es' | 'en';

export interface TranslationDictionary {
  topHud: {
    title: string;
    subtitle: string;
    meshHealth: string;
    optics: string;
    cut: string;
    globalRtt: string;
    resetGrid: string;
    awsArch: string;
    coverMode: string;
    audioMuted: string;
    audioUnmuted: string;
    langToggle: string;
  };
  controlDeck: {
    scenariosHeader: string;
    evaluatorReady: string;
    chaosArsenalHeader: string;
    chaosArsenalSub: string;
    earthshakerBtn: string;
    earthshakerSub: string;
    cutFiberBtn: string;
    cutFiberSub: string;
    activeCutBanner: string;
    pingTracerHeader: string;
    pingTracerSub: string;
    originLabel: string;
    targetLabel: string;
    traceRouteBtn: string;
    stopPingBtn: string;
    stopAllPingsBtn: string;
    activePingsTitle: string;
    groupAwsRegions: string;
    groupLandingStations: string;
    groupIxps: string;
    groupDepots: string;
    scenario1Name: string;
    scenario1Desc: string;
    scenario2Name: string;
    scenario2Desc: string;
    scenario3Name: string;
    scenario3Desc: string;
  };
  incidentLifecycle: {
    phase1: string;
    phase2: string;
    phase3: string;
    phase4: string;
    phase5: string;
    focusCrew: string;
    completeSplice: string;
    coverExit: string;
  };
  mapHud: {
    layerSubmarine: string;
    layerTerrestrial: string;
    layerNodes: string;
    layerFaults: string;
    layerRoutes: string;
    orbitView: string;
    cutPrompt: string;
    truckEnRoute: string;
    truckSplicing: string;
    truckRestored: string;
    truckDispatching: string;
    pingPkt: string;
    pingDrop: string;
    tacticalHudTitle: string;
    targetCoordinates: string;
    nearestFiberTrunk: string;
    nearestFacility: string;
    distance: string;
    statusHealthy: string;
    statusSevered: string;
    capacity: string;
    baseLatency: string;
    btnCutFiber: string;
    btnTracePing: string;
    btnInspectIceberg: string;
    btnDispatchTruck: string;
    btnInstantSplice: string;
    btnBgpContingency: string;
    btnDetails: string;
    btnCompact: string;
    pingPlannerTitle: string;
    originNode: string;
    destinationNode: string;
    btnInvert: string;
    btnExecutePing: string;
    btnStopPing: string;
    btnBack: string;
    selectDestination: string;
    straightDistance: string;
    estLatency: string;
  };
  telemetryDrawer: {
    tabLocation: string;
    tabBgp: string;
    tabBedrock: string;
    tabIceberg: string;
    locationTitle: string;
    locationSub: string;
    detourDistance: string;
    routeEta: string;
    waypointsAvoided: string;
    hazardCorridor: string;
    truckStatus: string;
    activeFleetMonitoring: string;
    bgpTitle: string;
    bgpSub: string;
    baselineLatency: string;
    failoverLatency: string;
    latencyImpact: string;
    hopSequence: string;
    activePingTrace: string;
    bedrockTitle: string;
    bedrockSub: string;
    bedrockModel: string;
    summaryHeading: string;
    impactHeading: string;
    icebergTitle: string;
    icebergSub: string;
    runAthenaQuery: string;
    runningQuery: string;
    queryComplete: string;
    scannedData: string;
    execTime: string;
    estimatedCost: string;
    costFree: string;
    recordsFound: string;
    colName: string;
    colCapacity: string;
    colType: string;
    colStatus: string;
    miniPing: string;
    miniHops: string;
    miniHealth: string;
  };
  architectureModal: {
    modalTitle: string;
    costZero: string;
    closeBtn: string;
    pipelineFlow: string;
    serviceSummary: string;
    athenaCodeTitle: string;
    athenaCodeSub: string;
  };
  chaosOverlay: {
    alertTitle: string;
    alertSub: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  es: {
    topHud: {
      title: 'KiroChaos 3D — Simulación Global de Resiliencia de Internet y AWS',
      subtitle: 'Red Global de Fibra Óptica Submarina y Terrestre & Enrutamiento de Emergencia AWS',
      meshHealth: 'Salud de Red',
      optics: 'Óptica',
      cut: 'Cortados',
      globalRtt: 'RTT Global',
      resetGrid: 'Restaurar Red',
      awsArch: 'Arquitectura AWS e Iceberg',
      coverMode: 'Modo Portada (H)',
      audioMuted: 'Audio Silenciado',
      audioUnmuted: 'Efectos de Audio Activos',
      langToggle: 'EN',
    },
    controlDeck: {
      scenariosHeader: 'Escenarios en 1 Clic (Evaluadores)',
      evaluatorReady: 'Listo para Evaluar',
      chaosArsenalHeader: 'Arsenal de Caos y Desastres Físicos',
      chaosArsenalSub: 'Cortes Físicos de Fibra Óptica y Terremotos Tectónicos',
      earthshakerBtn: 'Desatar Terremoto de Giant Kiro',
      earthshakerSub: 'Kiro sacude la Tierra, activa fallas tectónicas y BGP failover',
      cutFiberBtn: 'Simular Corte de Fibra',
      cutFiberSub: 'Haz clic en cualquier cable o nodo del globo para cortar fibra',
      activeCutBanner: 'Modo Corte Activo: Haz clic en el globo',
      pingTracerHeader: 'Trazador de Paquetes BGP (Ping Tracer)',
      pingTracerSub: 'Inspecciona en tiempo real las rutas ópticas Dijkstra y latencias',
      originLabel: 'Nodo Origen',
      targetLabel: 'Nodo Destino',
      traceRouteBtn: 'Trazar Ruta Dijkstra (Ping BGP)',
      stopPingBtn: 'Detener Ping',
      stopAllPingsBtn: 'Detener Todos los Pings',
      activePingsTitle: 'Pings Activos en Vivo',
      groupAwsRegions: 'Regiones Principales AWS',
      groupLandingStations: 'Estaciones de Amarre Submarinas (CLS)',
      groupIxps: 'Puntos de Intercambio (IXP)',
      groupDepots: 'Depósitos de Mantenimiento de Flota AWS',
      scenario1Name: '1. Terremoto Andino de Giant Kiro',
      scenario1Desc: 'Ruptura en la fosa Nazca-Arica. Corte de troncal Pacífico, desvío BGP por Brasil y despacho de camión.',
      scenario2Name: '2. Corte Submarino en Fortaleza',
      scenario2Desc: 'Corte transatlántico en Praia do Futuro. Aislamiento del Atlántico Sur y contingencia transpacífica.',
      scenario3Name: '3. Ruptura del Troncal Atlántico Norte',
      scenario3Desc: 'Corte submarino Dunant/Apollo en el corredor del Mar de Irlanda. Cuadrilla AWS a estación CLS y buque CS-Kiro para empalme ROV.',
    },
    incidentLifecycle: {
      phase1: 'FASE 1: RUPTURA DETECTADA',
      phase2: 'FASE 2: CONVERGENCIA BGP FAILOVER',
      phase3: 'FASE 3: CUADRILLA DESPACHADA (AWS Location)',
      phase4: 'FASE 4: EMPALME ÓPTICO EN SITIO',
      phase5: 'FASE 5: INCIDENTE RESUELTO (100% Operativo)',
      focusCrew: 'Enfocar Cuadrilla',
      completeSplice: 'Completar Fusión',
      coverExit: 'Modo Portada Activo (Presiona H para salir)',
    },
    mapHud: {
      layerSubmarine: 'Submarinos',
      layerTerrestrial: 'Terrestres',
      layerNodes: 'Nodos e IXPs',
      layerFaults: 'Fallas Tectónicas',
      layerRoutes: 'Rutas de Rescate',
      orbitView: 'Vista Orbital',
      cutPrompt: 'Haz clic en cualquier cable o mapa para cortar la fibra física y trazar el desvío AWS',
      truckEnRoute: 'En Ruta',
      truckSplicing: 'Fusión Óptica en Sitio',
      truckRestored: 'Enlace 100% Restaurado',
      truckDispatching: 'Despacho Cuadrilla AWS',
      pingPkt: 'BGP PKT',
      pingDrop: 'DROP: Fibra Cortada',
      tacticalHudTitle: 'Consola Táctica de Red & Telemetría',
      targetCoordinates: 'Coordenadas del Objetivo',
      nearestFiberTrunk: 'Troncal de Fibra Más Cercano',
      nearestFacility: 'Instalación de Red Más Cercana',
      distance: 'Distancia',
      statusHealthy: 'OPERATIVO',
      statusSevered: 'CORTADO',
      capacity: 'Capacidad',
      baseLatency: 'Latencia Base',
      btnCutFiber: 'Simular Corte Físico',
      btnTracePing: 'Trazar Ruta BGP (Ping)',
      btnInspectIceberg: 'Inspeccionar en Iceberg S3',
      btnDispatchTruck: 'Despachar Cuadrilla AWS',
      btnInstantSplice: 'Empalme Inmediato / Fusionar',
      btnBgpContingency: 'BGP Contingencia',
      btnDetails: 'Detalles',
      btnCompact: 'Compacto',
      pingPlannerTitle: 'Planificador de Ping BGP',
      originNode: 'Nodo Origen',
      destinationNode: 'Destino',
      btnInvert: 'Invertir',
      btnExecutePing: 'Ejecutar Ping',
      btnStopPing: 'Detener Ping',
      btnBack: 'Volver',
      selectDestination: 'Selecciona Destino Global:',
      straightDistance: 'Distancia Geodésica',
      estLatency: 'Latencia Estimada',
    },
    telemetryDrawer: {
      tabLocation: 'Amazon Location Service',
      tabBgp: 'Matriz BGP Dijkstra',
      tabBedrock: 'Amazon Bedrock SRE',
      tabIceberg: 'Apache Iceberg S3',
      locationTitle: 'Amazon Location Service — Despacho y Enrutamiento con Evasión de Zonas de Peligro',
      locationSub: 'Cálculo de Rutas en Tiempo Real con CalculateRoute & AvoidanceAreas',
      detourDistance: 'Distancia de Desvío',
      routeEta: 'Tiempo Estimado (ETA)',
      waypointsAvoided: 'Polígonos Evitados',
      hazardCorridor: 'Corredor Seguro',
      truckStatus: 'Estado de la Cuadrilla',
      activeFleetMonitoring: 'Monitoreo de Flota en Vivo',
      bgpTitle: 'Motor de Grafos BGP Dijkstra — Rerouting y Failover Dinámico',
      bgpSub: 'Topología Planetaria de Fibra Óptica: Regiones AWS, Estaciones de Amarre e IXPs',
      baselineLatency: 'Latencia Nominal Baseline',
      failoverLatency: 'Latencia Tras Ruptura (Failover)',
      latencyImpact: 'Impacto en la Latencia',
      hopSequence: 'Secuencia de Saltos BGP',
      activePingTrace: 'Traza Activa de Ping',
      bedrockTitle: 'Amazon Bedrock — Post-Mortem de Incidente Automatizado',
      bedrockSub: 'Modelo Serverless amazon.nova-micro-v1:0 (Free Tier)',
      bedrockModel: 'Modelo Fundacional',
      summaryHeading: 'Diagnóstico Automatizado del Incidente',
      impactHeading: 'Evaluación de Impacto Operativo',
      icebergTitle: 'Apache Iceberg en Amazon S3 — Consultas Geoespaciales Serverless con Athena',
      icebergSub: 'Catálogo AWS Glue con Particionamiento Snappy Parquet (Límite $0.00 USD Free Tier)',
      runAthenaQuery: 'Simular Consulta Athena Spatial SQL (ST_Intersects)',
      runningQuery: 'Ejecutando ST_Intersects en Iceberg...',
      queryComplete: 'Consulta Athena Ejecutada Exitosamente',
      scannedData: 'Datos Parquet Escaneados',
      execTime: 'Tiempo de Ejecución',
      estimatedCost: 'Costo Estimado de Consulta',
      costFree: '$0.00 USD (Capa Gratuita de Athena: 1 TB/mes gratis)',
      recordsFound: 'Registros de Topología Evaluados',
      colName: 'Nombre del Cable',
      colCapacity: 'Capacidad',
      colType: 'Tipo',
      colStatus: 'Estado',
      miniPing: 'Ping',
      miniHops: 'saltos',
      miniHealth: 'Salud de Malla',
    },
    architectureModal: {
      modalTitle: 'Arquitectura de 8 Servicios AWS y Pipeline Apache Iceberg',
      costZero: 'Costo Total del Proyecto: $0.00 USD (Estrictamente Capa Gratuita / Free Tier)',
      closeBtn: 'Cerrar',
      pipelineFlow: 'Flujo del Pipeline de Datos y Telemetría Espacial',
      serviceSummary: 'Los 8 Servicios AWS Integrados',
      athenaCodeTitle: 'Consulta SQL Geoespacial en Amazon Athena',
      athenaCodeSub: 'Verificación de Intersección Espacial ST_Intersects con la Zona de Peligro',
    },
    chaosOverlay: {
      alertTitle: '¡INCIDENTE CRÍTICO DE INFRAESTRUCTURA!',
      alertSub: 'Ruptura física de fibra óptica detectada. BGP Dijkstra ejecutando failover...',
    },
  },
  en: {
    topHud: {
      title: 'KiroChaos 3D — Global Internet Resilience & AWS Simulation',
      subtitle: 'Global Subsea & Terrestrial Optical Fiber Mesh & AWS Emergency Dispatch',
      meshHealth: 'Mesh Health',
      optics: 'Optics',
      cut: 'Severed',
      globalRtt: 'Global RTT',
      resetGrid: 'Reset Grid',
      awsArch: 'AWS Architecture & Iceberg',
      coverMode: 'Cover Mode (H)',
      audioMuted: 'Audio Muted',
      audioUnmuted: 'Audio FX Active',
      langToggle: 'ES',
    },
    controlDeck: {
      scenariosHeader: '1-Click Judge Scenarios',
      evaluatorReady: 'Evaluator Ready',
      chaosArsenalHeader: 'Physical Chaos & Disaster Arsenal',
      chaosArsenalSub: 'Physical Optical Fiber Cuts & Tectonic Earthquakes',
      earthshakerBtn: 'Unleash Giant Kiro Earthshaker',
      earthshakerSub: 'Kiro shakes the Earth, triggers seismic faults and BGP failover',
      cutFiberBtn: 'Simulate Fiber Cut',
      cutFiberSub: 'Click anywhere on globe cables or nodes to cut fiber',
      activeCutBanner: 'Cut Mode Active: Click on the globe',
      pingTracerHeader: 'BGP Packet Ping Tracer',
      pingTracerSub: 'Inspect real-time Dijkstra optical fiber paths & round-trip latency',
      originLabel: 'Origin Node',
      targetLabel: 'Target Node',
      traceRouteBtn: 'Trace Dijkstra Route (BGP Ping)',
      stopPingBtn: 'Stop Ping',
      stopAllPingsBtn: 'Stop All Pings',
      activePingsTitle: 'Live Active Pings',
      groupAwsRegions: 'AWS Core Regions',
      groupLandingStations: 'Subsea Cable Landing Stations (CLS)',
      groupIxps: 'Internet Exchange Points (IXP)',
      groupDepots: 'AWS Emergency Fleet Maintenance Depots',
      scenario1Name: '1. Giant Kiro Andean Quake',
      scenario1Desc: 'Nazca-Arica subduction rupture. Pacific trunk severed, BGP failover via Brazil, and truck dispatch.',
      scenario2Name: '2. Fortaleza Subsea Cable Cut',
      scenario2Desc: 'Transatlantic subsea severance at Praia do Futuro. South Atlantic isolation and Trans-Pacific failover.',
      scenario3Name: '3. North Atlantic Backbone Cut',
      scenario3Desc: 'Dunant/Apollo transatlantic severance in the Irish Sea corridor. AWS crew to CLS station and CS-Kiro cable ship for ROV splicing.',
    },
    incidentLifecycle: {
      phase1: 'PHASE 1: RUPTURE DETECTED',
      phase2: 'PHASE 2: BGP FAILOVER CONVERGENCE',
      phase3: 'PHASE 3: CREW DISPATCHED (AWS Location)',
      phase4: 'PHASE 4: ON-SITE OPTICAL SPLICING',
      phase5: 'PHASE 5: INCIDENT RESOLVED (100% Operational)',
      focusCrew: 'Focus Crew',
      completeSplice: 'Complete Splice',
      coverExit: 'Cover Photo Mode Active (Press H to exit)',
    },
    mapHud: {
      layerSubmarine: 'Submarine',
      layerTerrestrial: 'Terrestrial',
      layerNodes: 'Nodes & IXPs',
      layerFaults: 'Tectonic Faults',
      layerRoutes: 'Rescue Routes',
      orbitView: 'Orbit View',
      cutPrompt: 'Click anywhere on the map or cables to cut physical fiber & trace AWS repair detour',
      truckEnRoute: 'En Route',
      truckSplicing: 'Optical Splicing on Site',
      truckRestored: 'Link 100% Restored',
      truckDispatching: 'AWS Crew Dispatched',
      pingPkt: 'BGP PKT',
      pingDrop: 'DROP: Fiber Cut',
      tacticalHudTitle: 'Tactical Network & Telemetry HUD',
      targetCoordinates: 'Target Coordinates',
      nearestFiberTrunk: 'Nearest Fiber Trunk',
      nearestFacility: 'Nearest Network Facility',
      distance: 'Distance',
      statusHealthy: 'OPERATIONAL',
      statusSevered: 'SEVERED',
      capacity: 'Capacity',
      baseLatency: 'Base Latency',
      btnCutFiber: 'Simulate Physical Cut',
      btnTracePing: 'Trace BGP Route (Ping)',
      btnInspectIceberg: 'Inspect in S3 Iceberg',
      btnDispatchTruck: 'Dispatch AWS Crew',
      btnInstantSplice: 'Instant Splice / Restore',
      btnBgpContingency: 'BGP Contingency',
      btnDetails: 'Details',
      btnCompact: 'Compact',
      pingPlannerTitle: 'BGP Ping Planner',
      originNode: 'Origin Node',
      destinationNode: 'Destination',
      btnInvert: 'Invert',
      btnExecutePing: 'Execute Ping',
      btnStopPing: 'Stop Ping',
      btnBack: 'Back',
      selectDestination: 'Select Global Destination:',
      straightDistance: 'Great-Circle Distance',
      estLatency: 'Estimated Latency',
    },
    telemetryDrawer: {
      tabLocation: 'Amazon Location Service',
      tabBgp: 'BGP Dijkstra Matrix',
      tabBedrock: 'Amazon Bedrock SRE',
      tabIceberg: 'Apache Iceberg S3',
      locationTitle: 'Amazon Location Service — Dispatch & Routing with Hazard Area Avoidance',
      locationSub: 'Real-Time Emergency Roadway Detour via CalculateRoute & AvoidanceAreas',
      detourDistance: 'Detour Distance',
      routeEta: 'Estimated Travel Time (ETA)',
      waypointsAvoided: 'Avoidance Areas Bypassed',
      hazardCorridor: 'Safe Highway Corridor',
      truckStatus: 'Fleet Crew Status',
      activeFleetMonitoring: 'Live Fleet Telemetry',
      bgpTitle: 'BGP Dijkstra Graph Engine — Dynamic Rerouting & Failover Matrix',
      bgpSub: 'Planetary Optical Topology: AWS Regions, Landing Stations & IXP Peering',
      baselineLatency: 'Baseline Nominal Latency',
      failoverLatency: 'Post-Cut Failover Latency',
      latencyImpact: 'Latency Impact',
      hopSequence: 'BGP Hop Sequence',
      activePingTrace: 'Active Ping Trace',
      bedrockTitle: 'Amazon Bedrock — Automated SRE Incident Post-Mortem',
      bedrockSub: 'Serverless amazon.nova-micro-v1:0 Model (Free Tier)',
      bedrockModel: 'Foundation Model',
      summaryHeading: 'Automated SRE Diagnostic',
      impactHeading: 'Operational Impact Assessment',
      icebergTitle: 'Apache Iceberg on Amazon S3 — Serverless Geospatial Athena Queries',
      icebergSub: 'AWS Glue Catalog with Snappy Parquet Partition Pruning (Strict $0.00 USD Free Tier)',
      runAthenaQuery: 'Run Athena Spatial SQL Query (ST_Intersects)',
      runningQuery: 'Executing ST_Intersects on Iceberg...',
      queryComplete: 'Athena Query Executed Successfully',
      scannedData: 'Parquet Data Scanned',
      execTime: 'Execution Runtime',
      estimatedCost: 'Estimated Query Cost',
      costFree: '$0.00 USD (Athena Free Tier: 1 TB/month free)',
      recordsFound: 'Topology Records Evaluated',
      colName: 'Cable Name',
      colCapacity: 'Capacity',
      colType: 'Type',
      colStatus: 'Status',
      miniPing: 'Ping',
      miniHops: 'hops',
      miniHealth: 'Mesh Health',
    },
    architectureModal: {
      modalTitle: '8-Service AWS Architecture & Apache Iceberg Data Pipeline',
      costZero: 'Total Project Cost: $0.00 USD (Strictly AWS Always Free Tier / Free Tier)',
      closeBtn: 'Close',
      pipelineFlow: 'Spatial Data & Telemetry Pipeline Flow',
      serviceSummary: 'The 8 Integrated AWS Services',
      athenaCodeTitle: 'Geospatial SQL Query in Amazon Athena',
      athenaCodeSub: 'ST_Intersects Spatial Verification against the Hazard Polygon',
    },
    chaosOverlay: {
      alertTitle: 'CRITICAL INFRASTRUCTURE INCIDENT!',
      alertSub: 'Physical fiber severance detected. BGP Dijkstra executing failover...',
    },
  },
};

