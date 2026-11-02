import { NetworkNode, NetworkCable, FaultLine } from '../types/spatial';

export const NODES: NetworkNode[] = [
  // AWS Core Regions
  {
    id: 'aws-us-east-1',
    name: 'AWS us-east-1 (N. Virginia)',
    type: 'aws_region',
    coordinates: [-77.48, 39.04],
    city: 'Ashburn, VA',
    country: 'United States',
    regionCode: 'us-east-1',
    description: 'Primary Global Cloud Epicenter & High-Density Datacenter Nexus',
  },
  {
    id: 'aws-sa-east-1',
    name: 'AWS sa-east-1 (São Paulo)',
    type: 'aws_region',
    coordinates: [-46.63, -23.55],
    city: 'São Paulo',
    country: 'Brazil',
    regionCode: 'sa-east-1',
    description: 'Primary South American Cloud Hub & Regional Transit Backbone',
  },
  {
    id: 'aws-us-west-2',
    name: 'AWS us-west-2 (Oregon)',
    type: 'aws_region',
    coordinates: [-119.70, 45.84],
    city: 'Boardman, OR',
    country: 'United States',
    regionCode: 'us-west-2',
    description: 'US West Coast Gateway & Transpacific Cable Hub to Asia',
  },
  {
    id: 'aws-eu-west-1',
    name: 'AWS eu-west-1 (Dublin)',
    type: 'aws_region',
    coordinates: [-6.26, 53.35],
    city: 'Dublin',
    country: 'Ireland',
    regionCode: 'eu-west-1',
    description: 'European Core Cloud Hub & Transatlantic Gateway',
  },
  {
    id: 'aws-ap-northeast-1',
    name: 'AWS ap-northeast-1 (Tokyo)',
    type: 'aws_region',
    coordinates: [139.69, 35.68],
    city: 'Tokyo',
    country: 'Japan',
    regionCode: 'ap-northeast-1',
    description: 'Asia-Pacific Core Cloud Gateway & Trans-Pacific Interlink',
  },

  // Strategic South American & Global IXPs / Landing Stations
  {
    id: 'node-cbba',
    name: 'Cochabamba Andean IXP (PIT Cbba)',
    type: 'ixp',
    coordinates: [-66.15, -17.39],
    city: 'Cochabamba',
    country: 'Bolivia',
    regionCode: 'BO-CBB',
    description: 'Heart of South America: Interconnecting Andean corridors to Pacific & Atlantic backbones',
  },
  {
    id: 'node-lpz',
    name: 'La Paz Fiber Core (PIT Bolivia)',
    type: 'ixp',
    coordinates: [-68.11, -16.50],
    city: 'La Paz',
    country: 'Bolivia',
    regionCode: 'BO-LPZ',
    description: 'High-Altitude Altiplano Optical Junction to Peru & Northern Pacific routes',
  },
  {
    id: 'cls-arica',
    name: 'Arica Cable Landing Station (SACS / SAC)',
    type: 'landing_station',
    coordinates: [-70.31, -18.47],
    city: 'Arica',
    country: 'Chile',
    regionCode: 'CL-ARI',
    description: 'Crucial Pacific Gateway providing sea-cable access to landlocked Bolivia & southern Peru',
  },
  {
    id: 'cls-lima',
    name: 'Lima / Lurín Subsea Landing Station',
    type: 'landing_station',
    coordinates: [-76.82, -12.27],
    city: 'Lurín / Lima',
    country: 'Peru',
    regionCode: 'PE-LIM',
    description: 'Pan-American Submarine Cable landing linking South America to North America',
  },
  {
    id: 'cls-valparaiso',
    name: 'Valparaíso Coastal Landing Station',
    type: 'landing_station',
    coordinates: [-71.61, -33.04],
    city: 'Valparaíso',
    country: 'Chile',
    regionCode: 'CL-VAL',
    description: 'Southern Pacific termination feeding Trans-Andean cables to Argentina',
  },
  {
    id: 'cls-las-toninas',
    name: 'Las Toninas Atlantic Landing Station',
    type: 'landing_station',
    coordinates: [-56.69, -36.47],
    city: 'Las Toninas',
    country: 'Argentina',
    regionCode: 'AR-BUE',
    description: 'Argentina primary Atlantic submarine landing point connecting 90% of national traffic',
  },
  {
    id: 'cls-fortaleza',
    name: 'Fortaleza Atlantic Subsea Hub',
    type: 'landing_station',
    coordinates: [-38.52, -3.73],
    city: 'Fortaleza',
    country: 'Brazil',
    regionCode: 'BR-FOR',
    description: 'Major international submarine cable nexus linking South America directly to US and Europe',
  },
  {
    id: 'cls-miami',
    name: 'Miami NAP of the Americas',
    type: 'landing_station',
    coordinates: [-80.19, 25.78],
    city: 'Miami, FL',
    country: 'United States',
    regionCode: 'US-MIA',
    description: 'Primary routing nexus interconnecting all Latin American cables to US Backbones',
  },
  {
    id: 'cls-lisbon',
    name: 'Lisbon / Carcavelos Landing Station',
    type: 'landing_station',
    coordinates: [-9.33, 38.68],
    city: 'Carcavelos',
    country: 'Portugal',
    regionCode: 'PT-LIS',
    description: 'European terminus of EllaLink ultra-low latency direct transatlantic fiber',
  },
  {
    id: 'cls-dublin',
    name: 'Dublin Bay Subsea Cable Landing Station & Marine Gateway',
    type: 'landing_station',
    coordinates: [-6.15, 53.34],
    city: 'Dublin Port',
    country: 'Ireland',
    regionCode: 'IE-DUB',
    description: 'Primary Irish submarine optical gateway landing transoceanic cables into Europe',
  },
  {
    id: 'cls-cork',
    name: 'Cork Harbor Subsea Marine Base & Cable Station',
    type: 'landing_station',
    coordinates: [-8.30, 51.84],
    city: 'Cork Harbor',
    country: 'Ireland',
    regionCode: 'IE-CRK',
    description: 'Deepwater maritime operations base and Celtic Sea subsea cable landing facility',
  },
  {
    id: 'cls-oregon',
    name: 'Pacific City Subsea Landing Station & Marine Gateway',
    type: 'landing_station',
    coordinates: [-123.96, 45.20],
    city: 'Pacific City, OR',
    country: 'United States',
    regionCode: 'US-OR',
    description: 'Pacific Northwest transpacific submarine cable terminal linking AWS US-West to Asia-Pacific',
  },
  {
    id: 'cls-virginia',
    name: 'Virginia Beach Transatlantic Subsea Gateway',
    type: 'landing_station',
    coordinates: [-75.97, 36.85],
    city: 'Virginia Beach, VA',
    country: 'United States',
    regionCode: 'US-VA',
    description: 'Major transatlantic landing hub for MAREA, Dunant, and BRUSA high-capacity subsea cables',
  },
  {
    id: 'node-california',
    name: 'Silicon Valley Cloud Interconnect',
    type: 'ixp',
    coordinates: [-121.89, 37.33],
    city: 'San Jose, CA',
    country: 'United States',
    regionCode: 'US-CA',
    description: 'Primary Northern California network peering exchange and San Andreas fault monitoring nexus',
  },

  // 14 Emergency Fiber Maintenance Depots (Strategically placed 35-65 km from target stations)
  {
    id: 'depot-tacna',
    name: 'Tacna-Arica Border Emergency Telecom Depot',
    type: 'depot',
    coordinates: [-70.25, -18.00],
    city: 'Tacna',
    country: 'Peru / Chile Border',
    description: 'Rapid-response fiber fusion splicing trucks with 4x4 rugged vehicles for the Atacama & Andean passes',
  },
  {
    id: 'depot-cbba',
    name: 'Quillacollo / Vinto Central Telecom Depot',
    type: 'depot',
    coordinates: [-66.42, -17.38],
    city: 'Quillacollo / Vinto',
    country: 'Bolivia',
    description: 'Core Andean maintenance yard equipped with high-altitude optical OTDR analyzers',
  },
  {
    id: 'depot-lima',
    name: 'Mala / Chilca Panamericana Fleet Base',
    type: 'depot',
    coordinates: [-76.62, -12.68],
    city: 'Mala / Chilca',
    country: 'Peru',
    description: 'Coastal and coastal-highway emergency fiber repair base',
  },
  {
    id: 'depot-santiago',
    name: 'Quillota / Ruta 60 Rapid Depot',
    type: 'depot',
    coordinates: [-71.12, -32.88],
    city: 'Quillota',
    country: 'Chile',
    description: 'Heavy mountain transit repair fleet with snow-capable trucks for mountain passes',
  },
  {
    id: 'depot-fortaleza',
    name: 'Pecém / Caucaia Cable Support Hub',
    type: 'depot',
    coordinates: [-38.92, -3.65],
    city: 'Pecém / Caucaia',
    country: 'Brazil',
    description: 'Atlantic ocean and coastal landing station emergency fleet',
  },
  {
    id: 'depot-saopaulo',
    name: 'Campinas AWS NOC Regional Fleet Base',
    type: 'depot',
    coordinates: [-47.06, -22.90],
    city: 'Campinas / SP',
    country: 'Brazil',
    description: 'Dedicated AWS partner rapid response center for southeastern Brazil',
  },
  {
    id: 'depot-miami',
    name: 'Fort Lauderdale / Pompano Fleet Base',
    type: 'depot',
    coordinates: [-80.15, 26.22],
    city: 'Fort Lauderdale',
    country: 'United States',
    description: 'Subsea beach landing and terrestrial ring repair team',
  },
  {
    id: 'depot-toninas',
    name: 'Dolores Ruta 2 Emergency Depot',
    type: 'depot',
    coordinates: [-57.18, -36.31],
    city: 'Dolores',
    country: 'Argentina',
    description: 'Atlantic coastal dunes optical fiber protection crew',
  },
  {
    id: 'depot-dublin',
    name: 'Kildare / Newbridge M7 Telecom Depot',
    type: 'depot',
    coordinates: [-6.78, 53.18],
    city: 'Kildare / Newbridge',
    country: 'Ireland',
    description: 'European subsea and hyperscale datacenter emergency fiber fusion fleet',
  },
  {
    id: 'depot-lisbon',
    name: 'Setúbal Fleet Base',
    type: 'depot',
    coordinates: [-8.89, 38.52],
    city: 'Setúbal',
    country: 'Portugal',
    description: 'EllaLink and Atlantic rim coastal landing station repair base',
  },
  {
    id: 'depot-virginia',
    name: 'Alexandria / I-95 AWS Fiber Fleet Base',
    type: 'depot',
    coordinates: [-77.12, 38.80],
    city: 'Alexandria',
    country: 'United States',
    description: 'Northern Virginia Datacenter Alley optical emergency response crew',
  },
  {
    id: 'depot-oregon',
    name: 'Kennewick / Tri-Cities Optical Fleet Base',
    type: 'depot',
    coordinates: [-119.12, 46.21],
    city: 'Kennewick / Tri-Cities',
    country: 'United States',
    description: 'Pacific Northwest terrestrial and Trans-Pacific landing maintenance depot',
  },
  {
    id: 'depot-tokyo',
    name: 'Kanagawa / Hadano Rapid Fleet Base',
    type: 'depot',
    coordinates: [139.25, 35.42],
    city: 'Kanagawa / Hadano',
    country: 'Japan',
    description: 'Asia-Pacific Trans-Pacific subsea terminal and Tokyo ring rapid repair unit',
  },
  {
    id: 'depot-california',
    name: 'San Jose / Bay Area AWS Fleet Depot',
    type: 'depot',
    coordinates: [-121.95, 37.40],
    city: 'San Jose, CA',
    country: 'United States',
    description: 'Silicon Valley and California State Route rapid-response fiber maintenance base',
  },
];

export const CABLES: NetworkCable[] = [
  // 1. Andean Core Backbone: Cochabamba <-> La Paz
  {
    id: 'cable-cbba-lpz',
    name: 'Andean Central Optical Backbone (Cbba - La Paz)',
    type: 'terrestrial',
    source: 'node-cbba',
    target: 'node-lpz',
    coordinates: [
      [-66.15, -17.39],
      [-66.50, -17.55],
      [-67.10, -17.96],
      [-67.55, -17.60],
      [-68.05, -16.90],
      [-68.11, -16.50],
    ],
    capacityTbps: 48,
    latencyBaseMs: 4.8,
    status: 'healthy',
    corridor: 'Andean Core (Bolivia)',
    seismicZone: 'Altiplano Fault Zone',
  },

  // 2. Bolivia to Pacific Corridor: Cochabamba <-> Arica (Primary Outward Route)
  {
    id: 'cable-cbba-arica',
    name: 'Trans-Andean Pacific Link (Cbba - Oruro - Tambo Quemado - Arica)',
    type: 'terrestrial',
    source: 'node-cbba',
    target: 'cls-arica',
    coordinates: [
      [-66.15, -17.39],
      [-67.12, -17.98], // Oruro
      [-68.20, -18.25],
      [-69.05, -18.28], // Tambo Quemado / Chungará pass
      [-69.65, -18.42], // Putre
      [-70.31, -18.47], // Arica Pacific Landing Station
    ],
    capacityTbps: 40,
    latencyBaseMs: 14.5,
    status: 'healthy',
    corridor: 'Andean-Pacific Corridor (Bolivia - Chile)',
    seismicZone: 'Nazca-South American Subduction Megathrust',
  },

  // 3. La Paz <-> Lima (North-West Backup)
  {
    id: 'cable-lpz-lima',
    name: 'High Altiplano - Peru Optical Route (La Paz - Desaguadero - Puno - Lima)',
    type: 'terrestrial',
    source: 'node-lpz',
    target: 'cls-lima',
    coordinates: [
      [-68.11, -16.50],
      [-69.04, -16.56], // Desaguadero
      [-70.02, -15.84], // Puno
      [-71.53, -16.40], // Arequipa
      [-73.50, -15.80],
      [-75.73, -14.07], // Ica
      [-76.82, -12.27], // Lima
    ],
    capacityTbps: 32,
    latencyBaseMs: 18.2,
    status: 'healthy',
    corridor: 'Bolivia - Peru Interconnect',
    seismicZone: 'Peruvian Forearc Zone',
  },

  // 4. Cochabamba <-> São Paulo (Trans-Chaco/Pantanal Corridor to sa-east-1)
  {
    id: 'cable-cbba-santacruz-brazil',
    name: 'Trans-Continental Atlantic Corridor (Cbba - Santa Cruz - Corumbá - São Paulo)',
    type: 'terrestrial',
    source: 'node-cbba',
    target: 'aws-sa-east-1',
    coordinates: [
      [-66.15, -17.39],
      [-63.18, -17.78], // Santa Cruz de la Sierra
      [-59.60, -18.50], // Roboré
      [-57.65, -19.00], // Puerto Suárez / Corumbá
      [-54.62, -20.44], // Campo Grande
      [-50.50, -21.80],
      [-47.06, -22.90], // Campinas
      [-46.63, -23.55], // São Paulo
    ],
    capacityTbps: 36,
    latencyBaseMs: 24.0,
    status: 'healthy',
    corridor: 'Bioceanic Rail & Fiber Corridor (Atlantic East)',
    seismicZone: 'Stable Intraplate Basin',
  },

  // 5. Cochabamba <-> Las Toninas (Argentina Southern Cone Corridor)
  {
    id: 'cable-cbba-argentina',
    name: 'Southern Cone Terrestrial Trunk (Cbba - Yacuiba - Salta - Buenos Aires - Las Toninas)',
    type: 'terrestrial',
    source: 'node-cbba',
    target: 'cls-las-toninas',
    coordinates: [
      [-66.15, -17.39],
      [-64.30, -19.00], // Sucre pass
      [-63.68, -22.02], // Yacuiba / Pocitos
      [-65.41, -24.78], // Salta
      [-65.22, -26.82], // Tucumán
      [-64.18, -31.42], // Córdoba
      [-60.64, -32.95], // Rosario
      [-58.38, -34.60], // Buenos Aires
      [-56.69, -36.47], // Las Toninas
    ],
    capacityTbps: 28,
    latencyBaseMs: 31.0,
    status: 'healthy',
    corridor: 'Andean-Pampas Interconnect (Bolivia - Argentina)',
    seismicZone: 'Northwest Argentina Precordillera',
  },

  // 6. Pacific Rim Submarine: Arica <-> Valparaíso
  {
    id: 'cable-pacific-arica-valparaiso',
    name: 'South American Crossing West - SACS (Arica - Antofagasta - Valparaíso)',
    type: 'submarine',
    source: 'cls-arica',
    target: 'cls-valparaiso',
    coordinates: [
      [-70.31, -18.47],
      [-71.10, -20.20],
      [-71.30, -23.65],
      [-72.00, -27.50],
      [-72.20, -30.00],
      [-71.61, -33.04],
    ],
    capacityTbps: 72,
    latencyBaseMs: 16.0,
    status: 'healthy',
    corridor: 'Pacific Coastal Trench Submarine',
    seismicZone: 'Chile Megathrust Subduction',
  },

  // 7. Pacific Submarine: Arica <-> Lima
  {
    id: 'cable-pacific-arica-lima',
    name: 'Pan-American Submarine (Arica - Mollendo - Lima)',
    type: 'submarine',
    source: 'cls-arica',
    target: 'cls-lima',
    coordinates: [
      [-70.31, -18.47],
      [-71.50, -17.65],
      [-74.00, -15.50],
      [-76.50, -13.50],
      [-76.82, -12.27],
    ],
    capacityTbps: 80,
    latencyBaseMs: 11.2,
    status: 'healthy',
    corridor: 'Central Pacific Coastal Trench',
    seismicZone: 'Peru-Chile Trench Fault',
  },

  // 8. Pan-American Subsea: Lima <-> Miami
  {
    id: 'cable-pacific-lima-miami',
    name: 'Pacific-Caribbean Pan-Am Trunk (Lima - Manta - Panama - Miami)',
    type: 'submarine',
    source: 'cls-lima',
    target: 'cls-miami',
    coordinates: [
      [-76.82, -12.27],
      [-79.50, -7.00],
      [-81.20, -1.00],
      [-80.50, 4.00],
      [-79.60, 8.90], // Panama Canal Crossing
      [-78.50, 15.00],
      [-80.19, 25.78],
    ],
    capacityTbps: 96,
    latencyBaseMs: 42.0,
    status: 'healthy',
    corridor: 'Pan-American West Backbone',
    seismicZone: 'Cocos-Nazca Plate Boundary',
  },

  // 9. Trans-Andean Crossing: Valparaíso <-> Las Toninas
  {
    id: 'cable-valparaiso-toninas',
    name: 'Trans-Andean Mountain Crossing (Valparaíso - Santiago - Mendoza - Las Toninas)',
    type: 'terrestrial',
    source: 'cls-valparaiso',
    target: 'cls-las-toninas',
    coordinates: [
      [-71.61, -33.04],
      [-70.67, -33.45],
      [-69.80, -32.85], // Uspallata Pass
      [-68.84, -32.89], // Mendoza
      [-64.18, -31.42], // Córdoba
      [-58.38, -34.60], // Buenos Aires
      [-56.69, -36.47], // Las Toninas
    ],
    capacityTbps: 40,
    latencyBaseMs: 15.0,
    status: 'healthy',
    corridor: 'Southern Cone Trans-Andean Pass',
    seismicZone: 'Andean High Orogeny Fault',
  },

  // 10. South Atlantic Link: Las Toninas <-> São Paulo
  {
    id: 'cable-toninas-saopaulo',
    name: 'Malbec / Bicentenario Submarine Link (Las Toninas - Santos - São Paulo)',
    type: 'submarine',
    source: 'cls-las-toninas',
    target: 'aws-sa-east-1',
    coordinates: [
      [-56.69, -36.47],
      [-52.00, -34.00],
      [-48.50, -28.00],
      [-46.30, -24.00], // Santos Landing
      [-46.63, -23.55], // São Paulo
    ],
    capacityTbps: 108,
    latencyBaseMs: 19.5,
    status: 'healthy',
    corridor: 'South Atlantic Coastal Submarine',
    seismicZone: 'Stable Atlantic Continental Margin',
  },

  // 11. Brazilian Coast: São Paulo <-> Fortaleza
  {
    id: 'cable-saopaulo-fortaleza',
    name: 'Monet / Junior Coastal Subsea Trunk (São Paulo - Rio - Salvador - Fortaleza)',
    type: 'submarine',
    source: 'aws-sa-east-1',
    target: 'cls-fortaleza',
    coordinates: [
      [-46.63, -23.55],
      [-43.17, -22.90],
      [-39.80, -19.50],
      [-38.10, -13.00],
      [-34.60, -7.80],
      [-34.80, -5.10],
      [-36.80, -3.50],
      [-38.52, -3.73],
    ],
    capacityTbps: 120,
    latencyBaseMs: 25.0,
    status: 'healthy',
    corridor: 'Brazilian Coastal Marine Corridor',
    seismicZone: 'Atlantic Continental Shelf',
  },

  // 12. Equatorial Subsea: Fortaleza <-> Miami
  {
    id: 'cable-fortaleza-miami',
    name: 'Seabras-1 / Monet North Submarine (Fortaleza - San Juan - Miami)',
    type: 'submarine',
    source: 'cls-fortaleza',
    target: 'cls-miami',
    coordinates: [
      [-38.52, -3.73],
      [-45.00, 2.00],
      [-55.00, 10.00],
      [-66.00, 18.50], // Puerto Rico
      [-73.00, 22.00],
      [-80.19, 25.78], // Miami
    ],
    capacityTbps: 140,
    latencyBaseMs: 54.0,
    status: 'healthy',
    corridor: 'Atlantic-Caribbean Submarine Gateway',
    seismicZone: 'Puerto Rico Trench Subduction Zone',
  },

  // 13. Transatlantic Direct: Fortaleza <-> Lisbon
  {
    id: 'cable-fortaleza-lisbon',
    name: 'EllaLink Transatlantic Ultra-Low Latency (Fortaleza - Praia - Lisbon)',
    type: 'submarine',
    source: 'cls-fortaleza',
    target: 'cls-lisbon',
    coordinates: [
      [-38.52, -3.73],
      [-30.00, 5.00],
      [-23.50, 15.00], // Cape Verde
      [-17.00, 28.00], // Canary Islands
      [-12.00, 34.00],
      [-9.33, 38.68],  // Lisbon / Carcavelos
    ],
    capacityTbps: 100,
    latencyBaseMs: 59.0,
    status: 'healthy',
    corridor: 'South Atlantic - Europe Direct Oceanic Link',
    seismicZone: 'Mid-Atlantic Ridge Crossing',
  },

  // 14. US East Coast Backbone: Miami <-> N. Virginia
  {
    id: 'cable-miami-useast1',
    name: 'US East Coast AWS Terrestrial Fiber Ring (Miami - Atlanta - Ashburn)',
    type: 'terrestrial',
    source: 'cls-miami',
    target: 'aws-us-east-1',
    coordinates: [
      [-80.19, 25.78],
      [-81.65, 30.33], // Jacksonville
      [-84.38, 33.74], // Atlanta
      [-80.84, 35.22], // Charlotte
      [-78.63, 35.77], // Raleigh
      [-77.48, 39.04], // Ashburn / us-east-1
    ],
    capacityTbps: 160,
    latencyBaseMs: 14.8,
    status: 'healthy',
    corridor: 'US Eastern Megalopolis Backbone',
    seismicZone: 'Stable Craton',
  },

  // 15. Trans-Continental US: N. Virginia <-> Oregon
  {
    id: 'cable-useast1-uswest2',
    name: 'AWS Inter-Region Dedicated Backbone (us-east-1 <-> us-west-2)',
    type: 'terrestrial',
    source: 'aws-us-east-1',
    target: 'aws-us-west-2',
    coordinates: [
      [-77.48, 39.04],
      [-83.00, 39.96], // Columbus
      [-87.62, 41.87], // Chicago
      [-93.26, 44.97], // Minneapolis
      [-104.99, 39.73], // Denver
      [-111.89, 40.76], // Salt Lake City
      [-119.70, 45.84], // Boardman, OR
    ],
    capacityTbps: 200,
    latencyBaseMs: 51.5,
    status: 'healthy',
    corridor: 'AWS US Transcontinental Fiber Grid',
    seismicZone: 'Basin and Range Province',
  },

  // 15b. Mid-Atlantic Terrestrial Link: Ashburn <-> Virginia Beach
  {
    id: 'cable-virginia-metro',
    name: 'Northern Virginia - Virginia Beach Interconnect (Ashburn <-> Virginia Beach)',
    type: 'terrestrial',
    source: 'aws-us-east-1',
    target: 'cls-virginia',
    coordinates: [
      [-77.48, 39.04],
      [-77.43, 37.54],
      [-75.97, 36.85],
    ],
    capacityTbps: 240,
    latencyBaseMs: 2.6,
    status: 'healthy',
    corridor: 'Mid-Atlantic Hyperscale Optical Link',
    seismicZone: 'Atlantic Coastal Plain',
  },

  // 16. North Atlantic Subsea: Virginia Beach <-> Dublin
  {
    id: 'cable-useast1-euwest1',
    name: 'Apollo / Dunant Transatlantic Submarine (Virginia Beach - Dublin)',
    type: 'submarine',
    source: 'cls-virginia',
    target: 'cls-dublin',
    coordinates: [
      [-75.97, 36.85],
      [-73.50, 40.50],
      [-62.00, 42.50],
      [-45.00, 47.00],
      [-25.00, 50.50],
      [-11.50, 51.20], // Celtic Sea entrance (open water)
      [-7.20, 51.35],  // Celtic Sea deep trench
      [-5.80, 52.15],  // St. George's Channel south
      [-5.55, 52.85],  // Irish Sea channel east
      [-5.55, 53.32],  // Irish Sea open optical corridor (Scenario 3 cut)
      [-6.15, 53.34],  // Dublin Port / CLS Marine Gateway
    ],
    capacityTbps: 250,
    latencyBaseMs: 64.0,
    status: 'healthy',
    corridor: 'North Atlantic Super-Highway Submarine',
    seismicZone: 'North Atlantic Oceanic Abyssal',
  },

  // 17. Western Europe Subsea: Dublin <-> Lisbon
  {
    id: 'cable-euwest1-lisbon',
    name: 'Celtic-Iberian Coastal Fiber (Dublin - Bilbao - Lisbon)',
    type: 'submarine',
    source: 'cls-dublin',
    target: 'cls-lisbon',
    coordinates: [
      [-6.15, 53.34],  // Dublin Port / CLS Marine Gateway
      [-6.12, 52.95],  // Wicklow coastal waters
      [-6.35, 52.25],  // Rosslare southern headland
      [-7.50, 51.40],  // Celtic Sea south of Cork
      [-8.30, 51.84],  // Cork Harbor approach
      [-8.50, 49.50],  // Celtic shelf deep trench
      [-9.80, 43.80],  // off Galicia
      [-10.20, 41.20], // off Porto
      [-10.00, 39.20], // off Peniche
      [-9.33, 38.68],  // Lisbon / Carcavelos
    ],
    capacityTbps: 110,
    latencyBaseMs: 18.0,
    status: 'healthy',
    corridor: 'Western European Coastal Subsea',
    seismicZone: 'Iberian Plate Boundary',
  },

  // 17b. Dublin Metro Terrestrial Interconnect: CLS Dublin <-> AWS eu-west-1
  {
    id: 'cable-dublin-metro',
    name: 'Dublin Metro Optical Ring (CLS Dublin Bay <-> AWS eu-west-1)',
    type: 'terrestrial',
    source: 'cls-dublin',
    target: 'aws-eu-west-1',
    coordinates: [
      [-6.15, 53.34], // Dublin Port CLS
      [-6.26, 53.35], // Dublin Core / aws-eu-west-1
    ],
    capacityTbps: 200,
    latencyBaseMs: 0.8,
    status: 'healthy',
    corridor: 'Dublin High-Density Cloud Interconnect',
    seismicZone: 'Stable Intraplate Basin',
  },

  // 17c. Pacific Northwest Terrestrial Link: Boardman <-> Pacific City
  {
    id: 'cable-oregon-terrestrial',
    name: 'Columbia Basin - Pacific Gateway Link (Boardman <-> Pacific City)',
    type: 'terrestrial',
    source: 'aws-us-west-2',
    target: 'cls-oregon',
    coordinates: [
      [-119.70, 45.84],
      [-121.18, 45.60], // The Dalles
      [-122.67, 45.52], // Portland
      [-123.96, 45.20], // Pacific City CLS
    ],
    capacityTbps: 200,
    latencyBaseMs: 2.2,
    status: 'healthy',
    corridor: 'Pacific Northwest Cloud Corridor',
    seismicZone: 'Cascadia Forearc Zone',
  },

  // 17d. US West Coast Terrestrial Highway: Oregon <-> Silicon Valley
  {
    id: 'cable-california-terrestrial',
    name: 'Pacific Coast Terrestrial Fiber (Pacific City <-> Silicon Valley)',
    type: 'terrestrial',
    source: 'cls-oregon',
    target: 'node-california',
    coordinates: [
      [-123.96, 45.20], // Pacific City
      [-123.00, 44.05], // Eugene
      [-122.87, 42.33], // Medford
      [-122.39, 40.58], // Redding
      [-121.49, 38.58], // Sacramento
      [-121.89, 37.33], // San Jose / Silicon Valley
    ],
    capacityTbps: 160,
    latencyBaseMs: 8.5,
    status: 'healthy',
    corridor: 'West Coast Coastal Terrestrial Backbone',
    seismicZone: 'San Andreas Fault Zone',
  },

  // 18. Transpacific Crossing: Oregon <-> Tokyo
  {
    id: 'cable-uswest2-tokyo',
    name: 'FASTER / PC-1 Transpacific Submarine (Pacific City - Tokyo)',
    type: 'submarine',
    source: 'cls-oregon',
    target: 'aws-ap-northeast-1',
    coordinates: [
      [-123.96, 45.20], // Pacific City Coastal Gateway
      [-125.50, 46.20],
      [-145.00, 49.50],
      [-165.00, 51.20],
      [-180.00, 50.00],
      [-198.00, 44.50],
      [-215.00, 38.00],
      [-220.31, 35.68],
    ],
    capacityTbps: 180,
    latencyBaseMs: 82.0,
    status: 'healthy',
    corridor: 'Transpacific Deep Sea Trunk',
    seismicZone: 'Japan Trench & Pacific Ring of Fire',
  },
];

export const FAULT_LINES: FaultLine[] = [
  {
    id: 'fault-nazca-subduction',
    name: 'Peru-Chile Trench (Nazca Subduction Megathrust)',
    coordinates: [
      [-77.5, -5.0],
      [-78.5, -9.0],
      [-77.0, -13.0],
      [-72.0, -17.5],
      [-71.0, -21.0],
      [-71.5, -27.0],
      [-72.5, -34.0],
      [-74.5, -42.0],
    ],
  },
  {
    id: 'fault-andean-cordillera',
    name: 'Eastern Andean Thrust Fault System',
    coordinates: [
      [-68.5, -14.0],
      [-67.8, -16.5],
      [-65.5, -18.5],
      [-64.5, -22.0],
      [-65.0, -26.0],
    ],
  },
  {
    id: 'fault-san-andreas',
    name: 'San Andreas & Cascadia Subduction Zone',
    coordinates: [
      [-125.0, 49.0],
      [-124.5, 43.0],
      [-123.0, 38.0],
      [-120.5, 35.0],
      [-117.0, 33.0],
    ],
  },
  {
    id: 'fault-mid-atlantic',
    name: 'Mid-Atlantic Oceanic Spreading Ridge',
    coordinates: [
      [-20.0, 65.0],
      [-28.0, 45.0],
      [-42.0, 25.0],
      [-38.0, 10.0],
      [-25.0, -5.0],
      [-14.0, -20.0],
      [-14.0, -40.0],
    ],
  },
];

// Helper to convert to GeoJSON FeatureCollection
export function getTopologyAsGeoJson(): GeoJSON.FeatureCollection {
  const nodeFeatures: GeoJSON.Feature[] = NODES.map((node) => ({
    type: 'Feature',
    id: node.id,
    geometry: {
      type: 'Point',
      coordinates: node.coordinates,
    },
    properties: {
      id: node.id,
      name: node.name,
      type: node.type,
      city: node.city,
      country: node.country,
      regionCode: node.regionCode,
      description: node.description,
    },
  }));

  const cableFeatures: GeoJSON.Feature[] = CABLES.map((cable) => ({
    type: 'Feature',
    id: cable.id,
    geometry: {
      type: 'LineString',
      coordinates: cable.coordinates,
    },
    properties: {
      id: cable.id,
      name: cable.name,
      type: cable.type,
      source: cable.source,
      target: cable.target,
      capacity_tbps: cable.capacityTbps,
      latency_base_ms: cable.latencyBaseMs,
      status: cable.status,
      corridor: cable.corridor,
      seismic_zone: cable.seismicZone,
    },
  }));

  const faultFeatures: GeoJSON.Feature[] = FAULT_LINES.map((fault) => ({
    type: 'Feature',
    id: fault.id,
    geometry: {
      type: 'LineString',
      coordinates: fault.coordinates,
    },
    properties: {
      id: fault.id,
      name: fault.name,
      type: 'fault_line',
    },
  }));

  return {
    type: 'FeatureCollection',
    features: [...nodeFeatures, ...cableFeatures, ...faultFeatures],
  };
}

