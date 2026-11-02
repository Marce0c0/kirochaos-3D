// Procedural High-Fidelity Earth Equirectangular Canvas Texture
// 100% Procedural & Self-Contained — High-Resolution Sci-Fi NOC Globe
// Features: Detailed Coastlines, Bioluminescent Shelves, Submarine Fiber Cables,
// AWS Region Clusters, City Night Lights, and Tectonic Fault Lines (Ring of Fire)

export function createProceduralEarthTexture(): HTMLCanvasElement {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Helper: Convert [lng, lat] to canvas pixel coords
  const toCanvas = (lng: number, lat: number): [number, number] => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [x, y];
  };

  // 1. Deep Space Oceanic Gradient (Deep Midnight to Abyssal Navy)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, '#030712');
  oceanGrad.addColorStop(0.25, '#050c1e');
  oceanGrad.addColorStop(0.5, '#08162d');
  oceanGrad.addColorStop(0.75, '#050c1e');
  oceanGrad.addColorStop(1, '#030712');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Lat/Lon Graticule Grid Lines (Cyberpunk telemetry coordinates)
  ctx.lineWidth = 1;

  // Latitude lines every 15 deg
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * height;
    ctx.strokeStyle = Math.abs(lat) === 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Longitude lines every 30 deg
  for (let lon = -180; lon <= 180; lon += 30) {
    const x = ((lon + 180) / 360) * width;
    ctx.strokeStyle = lon === 0 ? 'rgba(56, 189, 248, 0.30)' : 'rgba(56, 189, 248, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Tropics (Cancer & Capricorn) faint dashed lines
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.18)';
  [23.5, -23.5].forEach((lat) => {
    const y = ((90 - lat) / 180) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Helper: Draw polygon landmass with glowing shelf
  const drawLandmass = (
    coords: [number, number][],
    fillColor = '#101a2e',
    strokeColor = '#38bdf8',
    glowColor = '#00f0ff',
    glowBlur = 12
  ) => {
    if (coords.length < 3) return;
    ctx.save();
    ctx.beginPath();
    const [startX, startY] = toCanvas(coords[0][0], coords[0][1]);
    ctx.moveTo(startX, startY);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = toCanvas(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();

    // Landmass interior
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Bioluminescent continental shelf glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  };

  // 3. HIGH-FIDELITY CONTINENTAL LANDMASSES

  // South America (High precision: Colombia, Venezuela, Amazon bulge, Chile, Peru, Patagonia)
  const southAmerica: [number, number][] = [
    [-77, 8], [-73, 11], [-65, 11], [-61, 9], [-53, 5], [-44, -2],
    [-35, -5], [-35, -9], [-38, -13], [-40, -18], [-43, -23], [-48, -28],
    [-52, -32], [-57, -38], [-64, -43], [-66, -48], [-66, -55], [-73, -54],
    [-75, -50], [-73, -42], [-72, -34], [-70.5, -24], [-70.3, -18.5], [-76, -14],
    [-81, -5], [-80, 2], [-77, 8]
  ];
  drawLandmass(southAmerica, '#111d33', '#38bdf8', '#00f0ff', 14);

  // Central America & Caribbean
  const centralAmerica: [number, number][] = [
    [-77, 8], [-80, 8.5], [-83, 9.5], [-86, 12], [-88, 15], [-92, 16],
    [-90, 18], [-87, 16], [-83, 14], [-82, 10], [-77, 8]
  ];
  drawLandmass(centralAmerica, '#101a2e', '#38bdf8', '#00f0ff', 10);

  // Cuba & Hispaniola
  const cuba: [number, number][] = [
    [-84, 22], [-80, 22], [-75, 20], [-77, 21], [-84, 23], [-84, 22]
  ];
  drawLandmass(cuba, '#101a2e', '#38bdf8', '#00f0ff', 8);

  // North America (Alaska, Canada, California, Gulf of Mexico, East Coast)
  const northAmerica: [number, number][] = [
    [-168, 66], [-158, 71], [-140, 70], [-125, 69], [-105, 74], [-85, 70],
    [-68, 62], [-58, 52], [-65, 45], [-70, 43], [-75, 38], [-80, 28],
    [-81, 25], [-83, 30], [-88, 30], [-97, 26], [-92, 19], [-88, 16],
    [-93, 16], [-100, 20], [-105, 22], [-110, 24], [-115, 30], [-120, 35],
    [-124, 40], [-124, 48], [-130, 54], [-137, 59], [-152, 60], [-162, 55],
    [-168, 60], [-168, 66]
  ];
  drawLandmass(northAmerica, '#0f182c', '#2c4e7d', '#00f0ff', 12);

  // Greenland
  const greenland: [number, number][] = [
    [-44, 60], [-35, 65], [-20, 75], [-30, 83], [-55, 82], [-60, 75],
    [-50, 68], [-44, 60]
  ];
  drawLandmass(greenland, '#182744', '#60a5fa', '#93c5fd', 10);

  // Europe & Scandinavia
  const europe: [number, number][] = [
    [-9, 37], [-9, 43], [-2, 44], [-4, 48], [1, 51], [5, 54],
    [5, 62], [15, 68], [25, 71], [31, 60], [22, 54], [15, 54],
    [14, 45], [19, 40], [26, 38], [24, 35], [15, 38], [5, 36], [-9, 37]
  ];
  drawLandmass(europe, '#0f182c', '#2c4e7d', '#00f0ff', 10);

  // British Isles & Ireland
  const britain: [number, number][] = [
    [-5, 50], [1, 52], [0, 55], [-3, 58], [-5, 55], [-5, 50]
  ];
  drawLandmass(britain, '#111d33', '#38bdf8', '#00f0ff', 10);
  const ireland: [number, number][] = [
    [-10, 52], [-6, 52], [-6, 55], [-10, 54], [-10, 52]
  ];
  drawLandmass(ireland, '#111d33', '#38bdf8', '#00f0ff', 8);

  // Africa (Mediterranean to Cape of Good Hope, Madagascar)
  const africa: [number, number][] = [
    [-17, 15], [-17, 28], [-6, 36], [10, 37], [25, 32], [32, 31],
    [35, 27], [43, 12], [51, 11], [42, -2], [40, -12], [35, -23],
    [28, -34], [18, -34], [12, -20], [10, -5], [9, 5], [0, 6],
    [-10, 5], [-17, 15]
  ];
  drawLandmass(africa, '#0f182c', '#2c4e7d', '#00f0ff', 12);

  // Madagascar
  const madagascar: [number, number][] = [
    [44, -13], [50, -15], [48, -25], [44, -25], [44, -13]
  ];
  drawLandmass(madagascar, '#101a2e', '#38bdf8', '#00f0ff', 8);

  // Asia (Arabia, India, China, Russia, Indochina)
  const asia: [number, number][] = [
    [32, 31], [40, 42], [50, 40], [60, 70], [100, 75], [170, 66],
    [142, 50], [130, 40], [122, 30], [118, 22], [108, 18], [105, 10],
    [98, 10], [90, 22], [80, 8], [73, 20], [68, 25], [58, 24],
    [52, 16], [43, 12], [35, 27], [32, 31]
  ];
  drawLandmass(asia, '#0f182c', '#2c4e7d', '#00f0ff', 12);

  // Japan (Honshu, Hokkaido, Kyushu)
  const japan: [number, number][] = [
    [130, 32], [133, 34], [137, 36], [141, 41], [144, 44], [141, 45],
    [140, 38], [136, 35], [131, 31], [130, 32]
  ];
  drawLandmass(japan, '#111d33', '#38bdf8', '#00f0ff', 12);

  // Australia & New Zealand
  const australia: [number, number][] = [
    [114, -22], [120, -14], [136, -12], [142, -10], [148, -18], [153, -28],
    [150, -37], [138, -35], [128, -32], [115, -34], [114, -22]
  ];
  drawLandmass(australia, '#0f182c', '#2c4e7d', '#00f0ff', 12);

  const newZealandNorth: [number, number][] = [
    [174, -35], [178, -38], [175, -41], [174, -35]
  ];
  drawLandmass(newZealandNorth, '#111d33', '#38bdf8', '#00f0ff', 8);

  const newZealandSouth: [number, number][] = [
    [168, -44], [173, -41], [170, -46], [168, -44]
  ];
  drawLandmass(newZealandSouth, '#111d33', '#38bdf8', '#00f0ff', 8);

  // Antarctica Ice Cap
  ctx.save();
  const antarcticY = ((90 - (-65)) / 180) * height;
  const antGrad = ctx.createLinearGradient(0, antarcticY, 0, height);
  antGrad.addColorStop(0, '#13213a');
  antGrad.addColorStop(0.5, '#1e3458');
  antGrad.addColorStop(1, '#2c4e7d');
  ctx.fillStyle = antGrad;
  ctx.fillRect(0, antarcticY, width, height - antarcticY);

  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, antarcticY);
  ctx.lineTo(width, antarcticY);
  ctx.stroke();
  ctx.restore();

  // 4. SUBMARINE FIBER OPTIC CABLES (Planetary Internet Resilience Grid)
  const drawSubmarineCable = (
    path: [number, number][],
    strokeColor = '#00f0ff',
    widthPx = 1.6,
    dash: number[] = [4, 4]
  ) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = widthPx;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;
    ctx.setLineDash(dash);
    ctx.beginPath();
    const [sx, sy] = toCanvas(path[0][0], path[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < path.length; i++) {
      const [px, py] = toCanvas(path[i][0], path[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Trans-Atlantic Backbone (NYC -> London/Bilbao)
  drawSubmarineCable([[-74, 40], [-45, 45], [-20, 48], [-5, 50]], '#00f0ff', 2.0, []);
  drawSubmarineCable([[-74, 40], [-40, 38], [-9, 38]], '#a855f7', 1.8, [5, 4]);

  // EllaLink (Fortaleza, Brazil -> Sines/Lisbon, Portugal)
  drawSubmarineCable([[-38, -4], [-28, 12], [-18, 26], [-9, 38]], '#38bdf8', 1.8, []);

  // SAm-1 & SAC (South American Fiber Ring circling South America)
  drawSubmarineCable([
    [-80, 26], [-66, 18], [-38, -4], [-43, -23], [-58, -34],
    [-65, -45], [-72, -34], [-77, -12], [-80, 8], [-80, 26]
  ], '#00f0ff', 2.0, [6, 3]);

  // Trans-Pacific Backbone (LA/Silicon Valley -> Hawaii -> Tokyo & Sydney)
  drawSubmarineCable([[-122, 37], [-157, 21], [140, 35]], '#00f0ff', 2.2, []);
  drawSubmarineCable([[-157, 21], [-175, -15], [151, -34]], '#c084fc', 1.8, [4, 4]);

  // Asia-Europe (Marseille -> Suez -> Mumbai -> Singapore -> Tokyo)
  drawSubmarineCable([
    [5, 43], [32, 31], [43, 12], [72, 19], [103, 1.3], [121, 25], [140, 35]
  ], '#38bdf8', 2.0, []);

  // 5. TECTONIC FAULT LINES & PACIFIC RING OF FIRE (Earthquake Origin Fissures)
  const drawFaultLine = (coords: [number, number][]) => {
    ctx.save();
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur = 12;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    const [sx, sy] = toCanvas(coords[0][0], coords[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < coords.length; i++) {
      const [px, py] = toCanvas(coords[i][0], coords[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Nazca - South American Subduction Zone (Chile-Peru Trench)
  drawFaultLine([
    [-78, 5], [-81, -2], [-78, -12], [-72, -20], [-71.5, -30],
    [-74, -42], [-75, -50], [-68, -55]
  ]);

  // Pacific Ring of Fire (Japan Trench to Aleutians & San Andreas)
  drawFaultLine([
    [130, 28], [140, 35], [145, 45], [160, 52], [180, 52],
    [-170, 54], [-145, 58], [-130, 50], [-124, 42], [-118, 33]
  ]);

  // 6. GLOBAL CITY NIGHT LIGHTS CLUSTERS (Golden-Amber Nodes)
  const cityClusters: [number, number, number][] = [
    // [lng, lat, radius]
    [-74, 40.7, 9],    // New York / East Coast Megacity
    [-87.6, 41.8, 6],   // Chicago
    [-118.2, 34.0, 7],  // Los Angeles
    [-122.4, 37.7, 7],  // San Francisco / Silicon Valley
    [-95.3, 29.7, 5],   // Houston
    [-46.6, -23.5, 8],  // São Paulo
    [-43.1, -22.9, 6],  // Rio de Janeiro
    [-58.3, -34.6, 6],  // Buenos Aires
    [-70.6, -33.4, 5],  // Santiago
    [-77.0, -12.0, 5],  // Lima
    [-74.0, 4.7, 5],    // Bogotá
    [-0.1, 51.5, 8],    // London
    [2.3, 48.8, 7],     // Paris
    [8.7, 50.1, 7],     // Frankfurt / Rhine-Ruhr
    [12.5, 41.9, 5],    // Rome
    [55.3, 25.2, 5],    // Dubai
    [72.8, 18.9, 7],    // Mumbai
    [77.2, 28.6, 7],    // New Delhi
    [77.5, 12.9, 6],    // Bengaluru
    [103.8, 1.3, 6],    // Singapore
    [100.5, 13.7, 5],   // Bangkok
    [121.5, 31.2, 8],   // Shanghai
    [116.4, 39.9, 8],   // Beijing
    [114.1, 22.3, 7],   // Hong Kong
    [126.9, 37.5, 7],   // Seoul
    [139.7, 35.7, 9],   // Tokyo
    [151.2, -33.8, 6],  // Sydney
    [144.9, -37.8, 5],  // Melbourne
  ];

  cityClusters.forEach(([lng, lat, r]) => {
    const [cx, cy] = toCanvas(lng, lat);
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6);
    radGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    radGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.65)');
    radGrad.addColorStop(0.8, 'rgba(217, 119, 6, 0.2)');
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 7. AWS REGION BEACONS (Cyan Glowing Concentric Radar Targets)
  const awsRegions: { name: string; lng: number; lat: number }[] = [
    { name: 'us-east-1', lng: -77.5, lat: 39.0 },
    { name: 'us-west-2', lng: -119.5, lat: 45.5 },
    { name: 'sa-east-1', lng: -46.6, lat: -23.5 },
    { name: 'eu-central-1', lng: 8.7, lat: 50.1 },
    { name: 'eu-west-1', lng: -6.3, lat: 53.3 },
    { name: 'ap-northeast-1', lng: 139.7, lat: 35.7 },
    { name: 'ap-southeast-1', lng: 103.8, lat: 1.3 },
    { name: 'ap-southeast-2', lng: 151.2, lat: -33.9 },
  ];

  awsRegions.forEach((reg) => {
    const [ax, ay] = toCanvas(reg.lng, reg.lat);
    ctx.save();
    // Inner pulse point
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ax, ay, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer target ring
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(ax, ay, 6.0, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(reg.name, ax + 8, ay + 3);
    ctx.restore();
  });

  return canvas;
}
