import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { soundFx } from '../services/soundEffects';
import { createProceduralEarthTexture } from '../utils/earthTexture';

export type KiroAnimationState = 'IDLE_ORBIT' | 'EARTHSHAKER_ATTACK' | 'COVER_MODE';

interface GiantKiroStageProps {
  animationState: KiroAnimationState;
  isZoomedIn?: boolean;
  onEarthquakeShake?: (intensity: number) => void;
  onAttackComplete?: () => void;
  coverMode?: boolean;
}

export const GiantKiroStage: React.FC<GiantKiroStageProps> = ({
  animationState,
  isZoomedIn = false,
  onEarthquakeShake,
  onAttackComplete,
  coverMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(animationState);
  const coverModeRef = useRef(coverMode);
  const zoomedRef = useRef(isZoomedIn);

  stateRef.current = animationState;
  coverModeRef.current = coverMode;
  zoomedRef.current = isZoomedIn;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- THREE.JS SCENE SETUP ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    // CRITICAL: Pure non-blocking pointer events
    renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(renderer.domElement);

    // --- LIGHTS ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 12, 10);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.2);
    fillLight.position.set(-8, -4, 6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xa855f7, 3.2, 35);
    rimLight.position.set(0, 4, -6);
    scene.add(rimLight);

    const frontPoint = new THREE.PointLight(0xffffff, 1.4, 20);
    frontPoint.position.set(0, 2, 8);
    scene.add(frontPoint);

    // --- MATERIALS ---
    // Pure White Matte Body Material
    const kiroWhiteMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.32,
      metalness: 0.0,
      emissive: 0x181822,
    });

    // Deep Black Manga Ink Outline (Inverted Hull)
    const mangaOutlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x050510,
      side: THREE.BackSide,
    });

    const createMangaOutline = (geometry: THREE.BufferGeometry, offset = 0.09) => {
      const outlineGeom = geometry.clone();
      const pos = outlineGeom.attributes.position;
      const norm = outlineGeom.attributes.normal;
      if (norm) {
        for (let i = 0; i < pos.count; i++) {
          pos.setXYZ(
            i,
            pos.getX(i) + norm.getX(i) * offset,
            pos.getY(i) + norm.getY(i) * offset,
            pos.getZ(i) + norm.getZ(i) * offset
          );
        }
      }
      return new THREE.Mesh(outlineGeom, mangaOutlineMaterial);
    };

    // --- EXACT 2D/3D CONTOUR TRACED FROM USER REFERENCE (640x640 PNG) ---
    // 100% faithful to the iconic sticker: rounded dome, hanging left flap, 2 bottom scallops
    const GHOST_BODY_POINTS: [number, number][] = [
      [-0.089, 2.600], [0.244, 2.592], [0.504, 2.543], [0.821, 2.429], [1.113, 2.259],
      [1.284, 2.121], [1.536, 1.836], [1.747, 1.463], [1.828, 1.243], [1.926, 0.796],
      [1.966, 0.406], [1.966, -0.122], [1.918, -0.561], [1.804, -1.056], [1.658, -1.463],
      [1.454, -1.869], [1.292, -2.088], [1.097, -2.283], [0.926, -2.413], [0.699, -2.535],
      [0.536, -2.584], [0.366, -2.592], [0.195, -2.535], [0.073, -2.421], [-0.024, -2.218],
      [-0.284, -2.397], [-0.634, -2.543], [-0.845, -2.584], [-1.154, -2.568], [-1.259, -2.535],
      [-1.414, -2.446], [-1.528, -2.316], [-1.592, -2.169], [-1.617, -2.007], [-1.601, -1.804],
      [-1.560, -1.641], [-1.479, -1.438], [-1.495, -1.430], [-1.633, -1.487], [-1.804, -1.528],
      [-2.031, -1.528], [-2.178, -1.463], [-2.242, -1.389], [-2.283, -1.300], [-2.299, -1.211],
      [-2.283, -1.040], [-2.056, -0.577], [-1.966, -0.317], [-1.893, 0.065], [-1.788, 0.967],
      [-1.682, 1.357], [-1.536, 1.690], [-1.292, 2.031], [-1.121, 2.194], [-0.918, 2.340],
      [-0.699, 2.454], [-0.471, 2.535], [-0.292, 2.576], [-0.098, 2.592]
    ];

    const GHOST_LEFT_EYE: [number, number][] = [
      [0.041, 1.146], [0.008, 1.146], [-0.041, 1.121], [-0.098, 1.064], [-0.146, 0.959],
      [-0.171, 0.796], [-0.171, 0.699], [-0.146, 0.536], [-0.081, 0.406], [0.000, 0.349],
      [0.122, 0.341], [0.187, 0.366], [0.252, 0.422], [0.301, 0.512], [0.333, 0.642],
      [0.333, 0.845], [0.317, 0.934], [0.268, 1.048], [0.228, 1.097], [0.138, 1.146],
      [0.049, 1.154]
    ];

    const GHOST_RIGHT_EYE: [number, number][] = [
      [0.926, 1.146], [0.894, 1.146], [0.804, 1.089], [0.756, 1.008], [0.731, 0.934],
      [0.715, 0.821], [0.715, 0.674], [0.739, 0.528], [0.796, 0.414], [0.886, 0.349],
      [1.008, 0.341], [1.072, 0.366], [1.138, 0.422], [1.186, 0.512], [1.219, 0.658],
      [1.219, 0.837], [1.203, 0.926], [1.162, 1.032], [1.089, 1.113], [1.024, 1.146],
      [0.934, 1.154]
    ];

    // --- PROCEDURAL 3D CHUBBY MANGA KIRO ---
    const rootKiro = new THREE.Group();
    scene.add(rootKiro);

    // Build solid Shape (without holes so eyes sit clean, crisp, and prominent on the front face)
    const ghostShape = new THREE.Shape();
    ghostShape.moveTo(GHOST_BODY_POINTS[0][0], GHOST_BODY_POINTS[0][1]);
    for (let i = 1; i < GHOST_BODY_POINTS.length; i++) {
      ghostShape.lineTo(GHOST_BODY_POINTS[i][0], GHOST_BODY_POINTS[i][1]);
    }
    ghostShape.closePath();

    // 3D Extrusion with rounded puffy bevel
    const ghostGeom = new THREE.ExtrudeGeometry(ghostShape, {
      depth: 0.85,
      bevelEnabled: true,
      bevelSegments: 8,
      steps: 1,
      bevelSize: 0.30,
      bevelThickness: 0.38,
    });
    ghostGeom.center();
    ghostGeom.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(ghostGeom, kiroWhiteMaterial);
    bodyMesh.add(createMangaOutline(ghostGeom, 0.09));
    rootKiro.add(bodyMesh);

    // 2. Bold Iconic Black Oval Eyes placed firmly on the front face (matching ghost sticker 1:1)
    const eyeGeom = new THREE.SphereGeometry(0.38, 32, 32);
    eyeGeom.scale(0.80, 1.28, 0.36); // Classic rounded vertical oval ratio ~1.6:1 from reference
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x020205,
      roughness: 0.04,
      metalness: 0.15,
    });

    // Exact front face coordinates matching ghost sticker
    const baseLeftEyePos = new THREE.Vector3(0.25, 0.74, 0.84);
    const baseRightEyePos = new THREE.Vector3(1.14, 0.74, 0.84);

    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.copy(baseLeftEyePos);
    rootKiro.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.copy(baseRightEyePos);
    rootKiro.add(rightEye);

    // 3. Smooth White Ghost Hands (Soft rounded flipper mittens without fingers)
    const createGhostHand = () => {
      const handGroup = new THREE.Group();
      const handGeom = new THREE.SphereGeometry(0.82, 32, 32);
      handGeom.scale(0.92, 1.35, 0.52);
      const handMesh = new THREE.Mesh(handGeom, kiroWhiteMaterial);
      handMesh.add(createMangaOutline(handGeom, 0.08));
      handGroup.add(handMesh);
      return handGroup;
    };

    const leftHand = createGhostHand();
    const rightHand = createGhostHand();
    // Attached directly to Kiro's body (glued to his flanks, scaling and rotating with him)
    rootKiro.add(leftHand);
    rootKiro.add(rightHand);
    leftHand.position.set(-1.95, -0.45, 0.20);
    rightHand.position.set(1.95, -0.45, 0.20);

    // 4. Halo Particle Ring
    const haloParticleCount = 48;
    const haloGeom = new THREE.BufferGeometry();
    const haloPos = new Float32Array(haloParticleCount * 3);
    for (let i = 0; i < haloParticleCount; i++) {
      const angle = (i / haloParticleCount) * Math.PI * 2;
      const radius = 3.8 + (Math.random() - 0.5) * 0.4;
      haloPos[i * 3] = Math.cos(angle) * radius;
      haloPos[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
      haloPos[i * 3 + 2] = Math.sin(angle) * radius;
    }
    haloGeom.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    const haloMat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const haloPoints = new THREE.Points(haloGeom, haloMat);
    rootKiro.add(haloPoints);

    // 7. Shockwave Rings
    const shockwaveRings: THREE.Mesh[] = [];
    for (let s = 0; s < 4; s++) {
      const torusGeom = new THREE.TorusGeometry(3.2 + s * 1.1, 0.12, 16, 64);
      const torusMat = new THREE.MeshBasicMaterial({
        color: s % 2 === 0 ? 0xa855f7 : 0xff9900,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      const torus = new THREE.Mesh(torusGeom, torusMat);
      scene.add(torus);
      shockwaveRings.push(torus);
    }

    // 8. 3D Earth Sphere (High-detail procedural planetary NOC globe)
    const earthGroup = new THREE.Group();
    scene.add(earthGroup);

    const earthCanvas = createProceduralEarthTexture();
    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    earthTexture.needsUpdate = true;

    const earthGeom = new THREE.SphereGeometry(3.35, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.60,
      metalness: 0.12,
      emissive: 0x050d1a,
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    earthMesh.rotation.x = 0.22; // 23.4° axial tilt towards camera
    earthGroup.add(earthMesh);

    // Multi-layer glowing sci-fi atmosphere
    const atmosGeom = new THREE.SphereGeometry(3.48, 64, 64);
    const atmosMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.26,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeom, atmosMat);
    earthGroup.add(atmosMesh);

    const outerAtmosGeom = new THREE.SphereGeometry(3.62, 48, 48);
    const outerAtmosMat = new THREE.MeshBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const outerAtmosMesh = new THREE.Mesh(outerAtmosGeom, outerAtmosMat);
    earthGroup.add(outerAtmosMesh);

    earthGroup.position.set(0, -1.05, 0.0);
    earthGroup.visible = false;

    // Helper: Compute hands' contact anchor points on the 3D globe surface
    // Eliminates polygon clipping by anchoring to (Earth center + normal * R_GRIP)
    const computeEarthGripTargets = (
      earthPos: THREE.Vector3,
      earthRotZ: number,
      gripPulse: number = 0
    ) => {
      const R_GRIP = 3.65 + gripPulse; // Rest comfortably on top of R=3.35 surface without penetrating
      const phi = 0.36; // ~20.6 deg elevation in northern hemisphere
      const theta = 0.92; // ~52.7 deg azimuth hugging Kiro's natural flank reach

      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      // Normal vectors on sphere surface
      const uLx = -cosPhi * sinTheta;
      const uLy = sinPhi;
      const uLz = cosPhi * cosTheta;

      const uRx = cosPhi * sinTheta;
      const uRy = sinPhi;
      const uRz = cosPhi * cosTheta;

      // Rotate with Earth's torque roll around Z
      const cosT = Math.cos(earthRotZ);
      const sinT = Math.sin(earthRotZ);

      const rotL = new THREE.Vector3(
        uLx * cosT - uLy * sinT,
        uLx * sinT + uLy * cosT,
        uLz
      );
      const rotR = new THREE.Vector3(
        uRx * cosT - uRy * sinT,
        uRx * sinT + uRy * cosT,
        uRz
      );

      // World positions on the sphere surface
      const worldL = new THREE.Vector3().copy(earthPos).addScaledVector(rotL, R_GRIP);
      const worldR = new THREE.Vector3().copy(earthPos).addScaledVector(rotR, R_GRIP);

      // Transform world coordinates into rootKiro's local coordinate space
      rootKiro.updateMatrixWorld(true);
      const localL = rootKiro.worldToLocal(worldL);
      const localR = rootKiro.worldToLocal(worldR);

      return { localL, localR };
    };

    // --- ANIMATION CHOREOGRAPHY ---
    let attackStartTime = 0;
    let previousState: KiroAnimationState = 'IDLE_ORBIT';

    const posTarget = new THREE.Vector3();
    const scaleTarget = new THREE.Vector3(1, 1, 1);
    const rotTarget = new THREE.Euler(0, 0, 0);

    const leftHandPosTarget = new THREE.Vector3(-1.95, -0.45, 0.20);
    const rightHandPosTarget = new THREE.Vector3(1.95, -0.45, 0.20);
    const leftHandRotTarget = new THREE.Euler(0.15, 0.1, 0.35);
    const rightHandRotTarget = new THREE.Euler(0.15, -0.1, -0.35);

    // Pointer / Mouse Cursor Tracking for Kiro's Eyes Follow
    let mouseNormX = 0.70;
    let mouseNormY = 0.55;

    const updatePointer = (clientX: number, clientY: number) => {
      mouseNormX = (clientX / window.innerWidth) * 2 - 1;
      mouseNormY = -(clientY / window.innerHeight) * 2 + 1;
    };

    const handlePointerMove = (e: PointerEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updatePointer(e.clientX, e.clientY);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // Small Upper-Right Companion Mode ("lado superior derecho acomodalo bonito")
    const getTopRightPos = (aspect: number) => {
      const vFOV = THREE.MathUtils.degToRad(camera.fov);
      const dist = camera.position.z - 2.0;
      const visibleH = 2 * Math.tan(vFOV / 2) * dist;
      const visibleW = visibleH * aspect;
      return new THREE.Vector3(visibleW * 0.36, visibleH * 0.28, 2.0);
    };
    const getTopRightScale = () => {
      const s = container.clientWidth < 640 ? 0.34 : 0.48;
      return new THREE.Vector3(s, s, s);
    };

    // 3D Earthquake Attack: Kiro hovers over the globe matching his cute lateral look & proportions
    const PEEK_LOW_POS = new THREE.Vector3(0, 0.6, -0.6);
    const PEEK_HIGH_POS = new THREE.Vector3(0, 2.75, -0.45);
    const PEEK_SCALE = new THREE.Vector3(0.95, 0.95, 0.95);
    const PEEK_ROT = new THREE.Euler(0.04, -0.18, 0.04);

    const initialTr = getTopRightPos(container.clientWidth / container.clientHeight);
    rootKiro.position.copy(initialTr);
    rootKiro.scale.copy(getTopRightScale());
    rootKiro.rotation.set(0, -0.25, 0);

    // --- NATURAL ORGANIC BLINKING STATE ---
    let nextBlinkTime = 1.8 + Math.random() * 2.2;
    const blinkDuration = 0.16; // 160ms snappy cartoon blink
    let blinkStartTime = -1;
    let isBlinking = false;

    // --- RENDER LOOP ---
    let reqId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const currentState = stateRef.current;
      const isCover = coverModeRef.current;
      const isZoomed = zoomedRef.current;

      // Natural Organic Blinking Engine
      if (!isBlinking && elapsed >= nextBlinkTime) {
        isBlinking = true;
        blinkStartTime = elapsed;
      }

      let eyeScaleY = 1.0;
      if (isBlinking) {
        const blinkT = (elapsed - blinkStartTime) / blinkDuration;
        if (blinkT >= 1.0) {
          isBlinking = false;
          // 20% chance of an adorable double-blink after 0.28s, otherwise standard 2.5 - 5.5s interval
          const isDouble = Math.random() < 0.20;
          nextBlinkTime = elapsed + (isDouble ? 0.28 : 2.5 + Math.random() * 3.0);
          eyeScaleY = 1.0;
        } else {
          // Half-sine curve: 1.0 -> 0.05 (closed eyelid slit) -> 1.0
          const closeAmount = Math.sin(blinkT * Math.PI);
          eyeScaleY = THREE.MathUtils.lerp(1.0, 0.05, closeAmount);
        }
      }

      // Soft halo rotation
      haloPoints.rotation.y = elapsed * 0.35;

      // Detect state transition
      if (currentState !== previousState) {
        if (currentState === 'EARTHSHAKER_ATTACK') {
          attackStartTime = elapsed;
          soundFx.playKiroRoar();
          soundFx.playEarthquakeRumble(2.8);
          soundFx.playBgpAlarm();
        }
        previousState = currentState;
      }

      // --- LOGIC PER STATE ---
      if (isCover || currentState === 'COVER_MODE') {
        // Cover Photo Pose: Earth 3D Sphere visible and Kiro holding it firmly
        earthGroup.visible = true;
        earthGroup.position.set(0, -1.05, 0.0);
        earthMesh.rotation.y = elapsed * 0.12;

        posTarget.copy(PEEK_HIGH_POS);
        scaleTarget.copy(PEEK_SCALE);
        rotTarget.copy(PEEK_ROT);

        // Hands contact Earth smoothly at exact sphere radius
        const coverGrip = computeEarthGripTargets(earthGroup.position, 0, 0);
        leftHandPosTarget.copy(coverGrip.localL);
        rightHandPosTarget.copy(coverGrip.localR);
        leftHandRotTarget.set(-0.60, 0.45, -0.55);
        rightHandRotTarget.set(-0.60, -0.45, 0.55);

        // Eyes glance down at the globe
        leftEye.position.set(baseLeftEyePos.x - 0.03, baseLeftEyePos.y - 0.10, baseLeftEyePos.z);
        rightEye.position.set(baseRightEyePos.x - 0.03, baseRightEyePos.y - 0.10, baseRightEyePos.z);

        rootKiro.position.y = PEEK_HIGH_POS.y + Math.sin(elapsed * 2.2) * 0.06;

        shockwaveRings[0].visible = true;
        (shockwaveRings[0].material as THREE.MeshBasicMaterial).opacity =
          0.55 + Math.sin(elapsed * 3.5) * 0.2;
        shockwaveRings[0].rotation.z = elapsed * 0.3;

      } else if (currentState === 'EARTHSHAKER_ATTACK') {
        const attackElapsed = elapsed - attackStartTime;

        // Expressive eyes glance down at the globe with seismic tremor
        const eyeTremor = attackElapsed >= 1.0 && attackElapsed < 2.5
          ? Math.sin((attackElapsed - 1.0) * 34) * 0.03
          : 0;
        leftEye.position.set(baseLeftEyePos.x - 0.03, baseLeftEyePos.y - 0.12 + eyeTremor, baseLeftEyePos.z);
        rightEye.position.set(baseRightEyePos.x - 0.03, baseRightEyePos.y - 0.12 + eyeTremor, baseRightEyePos.z);

        if (attackElapsed < 0.6) {
          // Asomarse: Make 3D Earth sphere visible & hands reach onto the globe
          earthGroup.visible = true;
          earthGroup.position.set(0, -1.05, 0.0);
          earthMesh.rotation.y = elapsed * 0.15;

          const peekT = Math.min(1, attackElapsed / 0.6);
          posTarget.lerpVectors(PEEK_LOW_POS, PEEK_HIGH_POS, peekT);
          scaleTarget.copy(PEEK_SCALE);
          rotTarget.copy(PEEK_ROT);

          // Hands smoothly reach onto the globe surface
          const idleL = new THREE.Vector3(-1.90, -0.45, 0.15);
          const idleR = new THREE.Vector3(1.90, -0.45, 0.15);
          const grip = computeEarthGripTargets(earthGroup.position, 0, 0);
          leftHandPosTarget.lerpVectors(idleL, grip.localL, peekT);
          rightHandPosTarget.lerpVectors(idleR, grip.localR, peekT);
          leftHandRotTarget.set(-0.60 * peekT, 0.45 * peekT, -0.55 * peekT);
          rightHandRotTarget.set(-0.60 * peekT, -0.45 * peekT, 0.55 * peekT);

        } else if (attackElapsed < 1.0) {
          // Manos colocadas firmemente sobre la superficie del globo sin colisión
          earthGroup.visible = true;
          earthGroup.position.set(0, -1.05, 0.0);
          earthMesh.rotation.y = elapsed * 0.15;

          posTarget.copy(PEEK_HIGH_POS);
          scaleTarget.copy(PEEK_SCALE);
          rotTarget.copy(PEEK_ROT);

          const grip = computeEarthGripTargets(earthGroup.position, 0, 0);
          leftHandPosTarget.copy(grip.localL);
          rightHandPosTarget.copy(grip.localR);
          leftHandRotTarget.set(-0.60, 0.45, -0.55);
          rightHandRotTarget.set(-0.60, -0.45, 0.55);

        } else if (attackElapsed < 2.5) {
          // AGITAR EL GLOBO TERRÁQUEO: Manos firmemente ancladas a la superficie durante la sacudida (ZERO clipping)
          earthGroup.visible = true;
          const shakeElapsed = attackElapsed - 1.0;
          const shakeDuration = 1.5;
          const shakeProgress = shakeElapsed / shakeDuration;
          const shakeDamp = Math.max(0, 1 - shakeProgress);

          const freq = 34;
          const wobbleX = Math.sin(shakeElapsed * 36) * 0.36 * shakeDamp;
          const wobbleY = Math.cos(shakeElapsed * 28) * 0.20 * shakeDamp;
          const torqueZ = Math.sin(shakeElapsed * freq) * 0.12 * shakeDamp;
          const pulseL = Math.sin(shakeElapsed * freq) * 0.04 * shakeDamp;
          const pulseR = -Math.sin(shakeElapsed * freq) * 0.04 * shakeDamp;

          // 1. Earth shakes and rolls
          earthGroup.position.set(wobbleX, -1.05 + wobbleY, 0.0);
          earthGroup.rotation.z = torqueZ;
          earthMesh.rotation.y = elapsed * 0.15 + wobbleX * 0.15;

          // 2. Hands follow Earth's spherical surface at exact radius R_GRIP (ZERO clipping/penetration)
          const gripL = computeEarthGripTargets(earthGroup.position, torqueZ, pulseL);
          const gripR = computeEarthGripTargets(earthGroup.position, torqueZ, pulseR);
          leftHandPosTarget.copy(gripL.localL);
          rightHandPosTarget.copy(gripR.localR);
          leftHandRotTarget.set(-0.60 + wobbleY * 0.2, 0.45, -0.55 + torqueZ * 0.4);
          rightHandRotTarget.set(-0.60 + wobbleY * 0.2, -0.45, 0.55 + torqueZ * 0.4);

          // 3. Kiro acompaña la fuerza del temblor con el cuerpo manteniendo su pose y encanto 3/4
          posTarget.set(
            wobbleX * 0.85,
            2.75 + wobbleY * 0.85,
            -0.45
          );
          rotTarget.set(0.04, -0.18 + wobbleX * 0.12, 0.04 + torqueZ * 0.35);

          if (onEarthquakeShake) {
            onEarthquakeShake(shakeDamp * 1.5);
          }

          shockwaveRings.forEach((ring, idx) => {
            ring.visible = true;
            const rScale = 1.0 + (shakeElapsed * 2.5 + idx * 0.8) % 3.0;
            ring.scale.set(rScale, rScale, rScale);
            (ring.material as THREE.MeshBasicMaterial).opacity =
              Math.max(0, 0.7 - rScale * 0.25);
            ring.rotation.z += 0.04;
          });

        } else if (attackElapsed < 3.5) {
          // Desvanecer globo y deslizarse suavemente a la esquina superior derecha
          earthGroup.visible = false;

          const zoomProgress = (attackElapsed - 2.5) / 1.0;
          const trPos = getTopRightPos(camera.aspect);
          posTarget.lerpVectors(PEEK_HIGH_POS, trPos, zoomProgress);
          scaleTarget.lerpVectors(PEEK_SCALE, getTopRightScale(), zoomProgress);
          rotTarget.set(0.1, -0.2, 0);

          const idleL = new THREE.Vector3(-1.90, -0.45, 0.15);
          const idleR = new THREE.Vector3(1.90, -0.45, 0.15);
          leftHandPosTarget.lerpVectors(leftHand.position, idleL, zoomProgress);
          rightHandPosTarget.lerpVectors(rightHand.position, idleR, zoomProgress);
          leftHandRotTarget.set(0.15, 0.1, 0.35);
          rightHandRotTarget.set(0.15, -0.1, -0.35);

          shockwaveRings.forEach((ring) => {
            (ring.material as THREE.MeshBasicMaterial).opacity *= 0.85;
          });

        } else {
          earthGroup.visible = false;
          shockwaveRings.forEach((r) => (r.visible = false));
          if (onAttackComplete) {
            onAttackComplete();
          }
        }

      } else {
        // IDLE: 3D Earth sphere is hidden (MapLibre vector globe is visible and interactive)
        earthGroup.visible = false;

        // Pequeñito al lado superior derecho con ojitos y cabecita siguiendo interactivamente el cursor
        const trPos = getTopRightPos(camera.aspect);
        const idleBob = Math.sin(elapsed * 2.2) * 0.08;

        posTarget.set(trPos.x, trPos.y + idleBob, trPos.z);
        scaleTarget.copy(getTopRightScale());

        // 1. Raycast unproject mouse in 3D world space onto Kiro's focal plane
        const mouse3D = new THREE.Vector3(mouseNormX, mouseNormY, 0.5).unproject(camera);
        const rayDir = mouse3D.sub(camera.position).normalize();
        const planeDist = (rootKiro.position.z - camera.position.z) / rayDir.z;
        const mouseWorld = camera.position.clone().add(rayDir.multiplyScalar(planeDist));

        const dx = mouseWorld.x - rootKiro.position.x;
        const dy = mouseWorld.y - rootKiro.position.y;
        const distToTarget = Math.hypot(dx, dy);

        // 2. Bold responsive head and body turn (amplified so looking left swivels up to ~80°)
        const targetHeadYaw = THREE.MathUtils.clamp(
          Math.atan2(dx * 1.85, 9.0),
          -1.45,
          0.45
        );
        const targetHeadPitch = THREE.MathUtils.clamp(
          -Math.atan2(dy * 1.5, 9.0),
          -0.65,
          0.65
        );
        // Cute inquisitive cartoon head tilt leaning into the gaze
        const headRoll = targetHeadYaw * 0.12 + Math.sin(elapsed * 2.0) * 0.04;
        rotTarget.set(targetHeadPitch, targetHeadYaw, headRoll);

        // 3. Dynamic expressive eye shift across the face (up to 0.35 in X and 0.24 in Y)
        const gazeAngle = Math.atan2(dy, dx);
        const gazeDist = Math.min(1.0, distToTarget / 4.0);
        const eyeShiftX = Math.cos(gazeAngle) * 0.35 * gazeDist;
        const eyeShiftY = Math.sin(gazeAngle) * 0.24 * gazeDist;

        leftEye.position.set(
          baseLeftEyePos.x + eyeShiftX,
          baseLeftEyePos.y + eyeShiftY,
          baseLeftEyePos.z
        );
        rightEye.position.set(
          baseRightEyePos.x + eyeShiftX,
          baseRightEyePos.y + eyeShiftY,
          baseRightEyePos.z
        );

        // 4. Smooth white ghost paws glued to his flanks, fluttering naturally like soft flippers
        const handBobL = Math.sin(elapsed * 2.8) * 0.08;
        const handBobR = Math.sin(elapsed * 2.8 + 1.4) * 0.08;
        const handWaveL = Math.sin(elapsed * 2.4) * 0.16;
        const handWaveR = Math.sin(elapsed * 2.4 + 1.4) * 0.16;

        leftHandPosTarget.set(-1.90, -0.45 + handBobL, 0.15);
        rightHandPosTarget.set(1.90, -0.45 + handBobR, 0.15);

        leftHandRotTarget.set(0.15 + handWaveL * 0.3, 0.1, 0.35 + handWaveL);
        rightHandRotTarget.set(0.15 + handWaveR * 0.3, -0.1, -0.35 - handWaveR);

        shockwaveRings.forEach((r) => (r.visible = false));
      }

      // Apply natural blinking vertical scale to vertical pill eyes
      if (currentState === 'EARTHSHAKER_ATTACK') {
        const attackElapsed = elapsed - attackStartTime;
        const tremorY = attackElapsed >= 0.6 && attackElapsed < 2.5
          ? Math.sin((attackElapsed - 0.6) * 36) * 0.10
          : 0;
        leftEye.scale.set(1.0, Math.max(0.05, eyeScaleY * 0.92 + tremorY), 1.0);
        rightEye.scale.set(1.0, Math.max(0.05, eyeScaleY * 0.92 - tremorY), 1.0);
      } else {
        leftEye.scale.set(1.0, eyeScaleY, 1.0);
        rightEye.scale.set(1.0, eyeScaleY, 1.0);
      }

      // Smooth Lerp
      const lerpFactor = 0.12;
      rootKiro.position.lerp(posTarget, lerpFactor);
      rootKiro.scale.lerp(scaleTarget, lerpFactor);
      rootKiro.rotation.x = THREE.MathUtils.lerp(rootKiro.rotation.x, rotTarget.x, lerpFactor);
      rootKiro.rotation.y = THREE.MathUtils.lerp(rootKiro.rotation.y, rotTarget.y, lerpFactor);
      rootKiro.rotation.z = THREE.MathUtils.lerp(rootKiro.rotation.z, rotTarget.z, lerpFactor);

      leftHand.position.lerp(leftHandPosTarget, lerpFactor);
      leftHand.rotation.x = THREE.MathUtils.lerp(leftHand.rotation.x, leftHandRotTarget.x, lerpFactor);
      leftHand.rotation.y = THREE.MathUtils.lerp(leftHand.rotation.y, leftHandRotTarget.y, lerpFactor);
      leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, leftHandRotTarget.z, lerpFactor);

      rightHand.position.lerp(rightHandPosTarget, lerpFactor);
      rightHand.rotation.x = THREE.MathUtils.lerp(rightHand.rotation.x, rightHandRotTarget.x, lerpFactor);
      rightHand.rotation.y = THREE.MathUtils.lerp(rightHand.rotation.y, rightHandRotTarget.y, lerpFactor);
      rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, rightHandRotTarget.z, lerpFactor);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointermove', handlePointerMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10 overflow-hidden"
      style={{
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
      }}
    />
  );
};
