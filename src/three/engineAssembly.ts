import * as THREE from 'three';

export interface EnginePartRecord {
  mesh: THREE.Object3D;
  homePos: THREE.Vector3;
  homeRot: THREE.Euler;
  explodeOffset: THREE.Vector3;
  explodeRot: THREE.Euler;
  stagger: number; // 0.0 to 0.28 stagger window
}

export interface EngineAssemblyInstance {
  group: THREE.Group;
  grillePortalGroup: THREE.Group;
  updateState: (scrollProgress: number, elapsedTime: number, reducedMotion: boolean) => void;
  dispose: () => void;
}

/**
 * Smoothstep helper for deterministic scroll scrubbing forward and backward.
 */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Constructs a multi-part 6.2L Supercharged HEMI V8 mechanical assembly
 * and the open 3D front radiator grille portal inside the Dodge Challenger engine bay.
 *
 * Local coordinates are in car-space (meters):
 * - Front grille portal sits at Z = +2.26m, Y = 0.64m
 * - Engine assembly center sits at Z = +1.18m, Y = 0.64m, X = 0.0m
 */
export function createEngineAssembly(): EngineAssemblyInstance {
  const group = new THREE.Group();
  group.name = 'SuperchargedV8Assembly';
  group.position.set(0, 0.64, 1.18);

  const grillePortalGroup = new THREE.Group();
  grillePortalGroup.name = 'GrillePortalFrame';
  grillePortalGroup.position.set(0, 0.64, 2.26);

  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(geo: T): T => {
    disposableGeometries.push(geo);
    return geo;
  };
  const trackMat = <T extends THREE.Material>(mat: T): T => {
    disposableMaterials.push(mat);
    return mat;
  };

  // --- Calibrated Mechanical PBR Materials ---
  const castIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1c2026,
      metalness: 0.78,
      roughness: 0.52,
      envMapIntensity: 1.4,
    })
  );

  const machinedAluminumMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd0d7e2,
      metalness: 0.94,
      roughness: 0.20,
      clearcoat: 0.35,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.85,
    })
  );

  const superchargerAlloyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x323844,
      metalness: 0.88,
      roughness: 0.28,
      clearcoat: 0.4,
      envMapIntensity: 1.65,
    })
  );

  const hemiValveCoverMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xc82514,
      metalness: 0.55,
      roughness: 0.24,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.6,
    })
  );

  const billetPulleyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe2e8f0,
      metalness: 0.96,
      roughness: 0.14,
      clearcoat: 0.5,
      envMapIntensity: 2.0,
    })
  );

  const anodizedGoldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.22,
      envMapIntensity: 1.7,
    })
  );

  const beltRubberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f1116,
      metalness: 0.12,
      roughness: 0.85,
    })
  );

  const headerSteelMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x9ca3af,
      metalness: 0.92,
      roughness: 0.26,
      iridescence: 0.35,
      iridescenceIOR: 1.4,
      envMapIntensity: 1.6,
    })
  );

  const darkFrameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x090b0f,
      metalness: 0.65,
      roughness: 0.42,
    })
  );

  const shardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.6,
      metalness: 0.9,
      roughness: 0.15,
    })
  );

  // ============================================================================
  // 1. FRONT RADIATOR GRILLE PORTAL & ENGINE BAY TUNNEL (For Scene 03 & 07)
  // ============================================================================
  // Surrounds the camera as it flies through the Challenger front grille opening
  const outerBezelUpper = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.42, 0.035, 0.22)),
    darkFrameMat
  );
  outerBezelUpper.position.set(0, 0.13, 0);
  grillePortalGroup.add(outerBezelUpper);

  const outerBezelLower = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.42, 0.035, 0.22)),
    darkFrameMat
  );
  outerBezelLower.position.set(0, -0.13, 0);
  grillePortalGroup.add(outerBezelLower);

  // Vertical grille divider louvers on left & right leaving a clean central camera passage
  const louverGeo = trackGeo(new THREE.BoxGeometry(0.012, 0.24, 0.14));
  [-0.64, -0.52, -0.40, -0.28, 0.28, 0.40, 0.52, 0.64].forEach((lx) => {
    const louver = new THREE.Mesh(louverGeo, superchargerAlloyMat);
    louver.position.set(lx, 0, 0);
    grillePortalGroup.add(louver);
  });

  // Structural radiator core frame & dark engine bay shroud walls so camera never sees void
  const bayTunnelGeo = trackGeo(new THREE.CylinderGeometry(0.88, 0.96, 1.35, 24, 1, true));
  bayTunnelGeo.rotateX(Math.PI / 2);
  const bayTunnelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x07090d,
      metalness: 0.5,
      roughness: 0.65,
      side: THREE.DoubleSide,
    })
  );
  const bayTunnel = new THREE.Mesh(bayTunnelGeo, bayTunnelMat);
  bayTunnel.position.set(0, 0.02, -0.55);
  grillePortalGroup.add(bayTunnel);

  // ============================================================================
  // 2. MULTI-COMPONENT 6.2L SUPERCHARGED V8 ENGINE ASSEMBLY
  // ============================================================================
  const parts: EnginePartRecord[] = [];
  const pulleys: { mesh: THREE.Object3D; speedRatio: number }[] = [];

  const registerPart = (
    mesh: THREE.Object3D,
    homePos: [number, number, number],
    homeRot: [number, number, number],
    explodeOffset: [number, number, number],
    explodeRot: [number, number, number],
    stagger: number
  ) => {
    mesh.position.set(homePos[0], homePos[1], homePos[2]);
    mesh.rotation.set(homeRot[0], homeRot[1], homeRot[2]);
    group.add(mesh);
    parts.push({
      mesh,
      homePos: new THREE.Vector3(...homePos),
      homeRot: new THREE.Euler(...homeRot),
      explodeOffset: new THREE.Vector3(...explodeOffset),
      explodeRot: new THREE.Euler(...explodeRot),
      stagger,
    });
  };

  // --- Component 1: Deep-Skirt V8 Cast Cylinder Block ---
  const blockGroup = new THREE.Group();
  const blockCore = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.38, 0.28, 0.56)),
    castIronMat
  );
  blockGroup.add(blockCore);

  // Cylinder bore sleeves visible when heads separate in Scene 05
  const boreGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.18, 20));
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const bore = new THREE.Mesh(boreGeo, machinedAluminumMat);
      const zOff = -0.18 + i * 0.12;
      bore.position.set(side * 0.12, 0.09, zOff);
      bore.rotation.z = -side * (Math.PI / 4);
      blockGroup.add(bore);
    }
  }
  registerPart(blockGroup, [0, -0.05, 0], [0, 0, 0], [0, -0.04, -0.08], [0.06, -0.08, 0.02], 0.08);

  // --- Component 2: Forged Crankshaft & Counterweights ---
  const crankGroup = new THREE.Group();
  const crankMain = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.62, 20)),
    machinedAluminumMat
  );
  crankMain.rotation.x = Math.PI / 2;
  crankGroup.add(crankMain);
  const webGeo = trackGeo(new THREE.CylinderGeometry(0.078, 0.078, 0.024, 16));
  [-0.22, -0.11, 0.0, 0.11, 0.22].forEach((zPos, i) => {
    const web = new THREE.Mesh(webGeo, castIronMat);
    web.rotation.x = Math.PI / 2;
    web.position.set((i % 2 === 0 ? 1 : -1) * 0.015, -0.01, zPos);
    crankGroup.add(web);
  });
  registerPart(crankGroup, [0, -0.14, 0], [0, 0, 0], [0, -0.26, -0.12], [0.18, 0.35, -0.15], 0.12);

  // --- Component 3: Lower Oil Pan Sump & Cooling Ribs ---
  const oilPanGroup = new THREE.Group();
  const panMain = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.36, 0.09, 0.54)),
    castIronMat
  );
  oilPanGroup.add(panMain);
  registerPart(oilPanGroup, [0, -0.24, 0], [0, 0, 0], [0, -0.46, 0.04], [-0.14, 0.08, 0.12], 0.02);

  // --- Component 4: Front Timing Chain Cover ---
  const timingCover = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.36, 0.28, 0.045)),
    machinedAluminumMat
  );
  registerPart(timingCover, [0, -0.04, 0.30], [0, 0, 0], [0, -0.02, 0.32], [-0.22, 0.15, 0.08], 0.04);

  // --- Components 5 & 6: Left & Right Machined Aluminum Cylinder Heads ---
  for (let side = -1; side <= 1; side += 2) {
    const headGroup = new THREE.Group();
    const headSlab = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.16, 0.11, 0.54)),
      machinedAluminumMat
    );
    headGroup.add(headSlab);

    // Valve springs on top of cylinder head
    const springGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.045, 12));
    for (let i = 0; i < 4; i++) {
      const sp1 = new THREE.Mesh(springGeo, anodizedGoldMat);
      sp1.position.set(-0.025, 0.07, -0.18 + i * 0.12);
      headGroup.add(sp1);
      const sp2 = new THREE.Mesh(springGeo, billetPulleyMat);
      sp2.position.set(0.025, 0.07, -0.18 + i * 0.12);
      headGroup.add(sp2);
    }

    const baseRotZ = -side * (Math.PI / 5.2);
    registerPart(
      headGroup,
      [side * 0.19, 0.07, 0],
      [0, 0, baseRotZ],
      [side * 0.38, 0.14, -0.04],
      [0.16 * side, 0.22 * side, baseRotZ - side * 0.35],
      0.06
    );
  }

  // --- Components 7 & 8: Left & Right HEMI Anodized Valve Covers ---
  for (let side = -1; side <= 1; side += 2) {
    const vcGroup = new THREE.Group();
    const vcBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.065, 0.52)),
      hemiValveCoverMat
    );
    vcGroup.add(vcBody);

    // Machined aluminum coil pack strip & oil cap
    const strip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.05, 0.072, 0.48)),
      machinedAluminumMat
    );
    vcGroup.add(strip);

    const baseRotZ = -side * (Math.PI / 5.2);
    registerPart(
      vcGroup,
      [side * 0.25, 0.13, 0],
      [0, 0, baseRotZ],
      [side * 0.58, 0.28, 0.06],
      [-0.25 * side, 0.3 * side, baseRotZ - side * 0.52],
      0.01
    );
  }

  // --- Components 9..16: 8 Forged Pistons & Connecting Rods ---
  const pistonHeadGeo = trackGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.045, 20));
  const pistonPinGeo = trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.075, 12));
  pistonPinGeo.rotateZ(Math.PI / 2);
  const rodGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.13, 0.026));

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const pGroup = new THREE.Group();
      const head = new THREE.Mesh(pistonHeadGeo, billetPulleyMat);
      head.position.y = 0.05;
      pGroup.add(head);

      const pin = new THREE.Mesh(pistonPinGeo, anodizedGoldMat);
      pin.position.y = 0.04;
      pGroup.add(pin);

      const rod = new THREE.Mesh(rodGeo, machinedAluminumMat);
      rod.position.y = -0.02;
      pGroup.add(rod);

      const zPos = -0.18 + i * 0.12 + (side > 0 ? 0.015 : -0.015);
      const bankAngle = -side * (Math.PI / 4.8);
      registerPart(
        pGroup,
        [side * 0.11, 0.02, zPos],
        [0, 0, bankAngle],
        [side * (0.28 + i * 0.04), 0.22 + (i % 2) * 0.12, (i - 1.5) * 0.14],
        [(i - 1.5) * 0.35, side * 0.45, bankAngle - side * 0.4],
        0.09 + i * 0.02
      );
    }
  }

  // --- Component 17: 2.7L Twin-Screw Supercharger Main Housing & Fins ---
  const blowerGroup = new THREE.Group();
  const blowerBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.28, 0.14, 0.48)),
    superchargerAlloyMat
  );
  blowerGroup.add(blowerBody);

  // Twin internal screw rotors (visible when lid lifts in Scene 05)
  const rotorGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.42, 16));
  rotorGeo.rotateX(Math.PI / 2);
  const rotorL = new THREE.Mesh(rotorGeo, anodizedGoldMat);
  rotorL.position.set(-0.055, 0.02, 0);
  blowerGroup.add(rotorL);
  const rotorR = new THREE.Mesh(rotorGeo, anodizedGoldMat);
  rotorR.position.set(0.055, 0.02, 0);
  blowerGroup.add(rotorR);

  registerPart(
    blowerGroup,
    [0, 0.15, -0.02],
    [0, 0, 0],
    [0, 0.34, -0.06],
    [0.18, -0.22, 0.09],
    0.03
  );

  // --- Component 18: Supercharger Finned Intercooler Lid ---
  const lidGroup = new THREE.Group();
  const lidPlate = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.30, 0.036, 0.49)),
    machinedAluminumMat
  );
  lidGroup.add(lidPlate);

  // Top cooling fins & SRT accent ribs
  const finGeo = trackGeo(new THREE.BoxGeometry(0.012, 0.018, 0.44));
  for (let f = -3; f <= 3; f++) {
    const fin = new THREE.Mesh(
      finGeo,
      f === 0 ? hemiValveCoverMat : superchargerAlloyMat
    );
    fin.position.set(f * 0.036, 0.022, 0);
    lidGroup.add(fin);
  }
  registerPart(
    lidGroup,
    [0, 0.24, -0.02],
    [0, 0, 0],
    [0, 0.56, -0.04],
    [-0.24, 0.18, -0.14],
    0.0
  );

  // --- Component 19: Supercharger Front Snout & Coupler ---
  const snoutGroup = new THREE.Group();
  const snoutCyl = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.042, 0.056, 0.18, 20)),
    machinedAluminumMat
  );
  snoutCyl.rotation.x = Math.PI / 2;
  snoutGroup.add(snoutCyl);
  registerPart(
    snoutGroup,
    [0, 0.16, 0.28],
    [0, 0, 0],
    [-0.08, 0.38, 0.34],
    [-0.32, -0.25, 0.2],
    0.02
  );

  // --- Component 20 & 21: Left & Right Billet Fuel Rails & Injectors ---
  const railGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 12));
  railGeo.rotateX(Math.PI / 2);
  for (let side = -1; side <= 1; side += 2) {
    const railGroup = new THREE.Group();
    const rail = new THREE.Mesh(railGeo, anodizedGoldMat);
    railGroup.add(rail);
    registerPart(
      railGroup,
      [side * 0.16, 0.19, 0],
      [0, 0, 0],
      [side * 0.44, 0.42, 0.08],
      [0.25, side * 0.35, -side * 0.4],
      0.04
    );
  }

  // --- Component 22: High-Flow Throttle Body & Conical Intake Filter ---
  const intakeGroup = new THREE.Group();
  const elbow = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.052, 0.058, 0.24, 20)),
    castIronMat
  );
  elbow.rotation.z = Math.PI / 3;
  intakeGroup.add(elbow);

  const filterCone = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.048, 0.082, 0.18, 20)),
    hemiValveCoverMat
  );
  filterCone.rotation.z = Math.PI / 2.2;
  filterCone.position.set(0.16, -0.05, 0.06);
  intakeGroup.add(filterCone);

  registerPart(
    intakeGroup,
    [0.14, 0.21, -0.30],
    [0, 0, 0],
    [0.42, 0.40, -0.38],
    [0.32, 0.42, -0.28],
    0.05
  );

  // --- Components 23 & 24: Left & Right 4-into-1 Tubular Exhaust Headers ---
  for (let side = -1; side <= 1; side += 2) {
    const headerGroup = new THREE.Group();
    const collector = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.036, 0.032, 0.52, 16)),
      headerSteelMat
    );
    collector.rotation.x = Math.PI / 2;
    headerGroup.add(collector);

    const runnerGeo = trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 12));
    for (let i = 0; i < 4; i++) {
      const runner = new THREE.Mesh(runnerGeo, headerSteelMat);
      runner.position.set(-side * 0.045, 0.04, -0.18 + i * 0.12);
      runner.rotation.z = side * (Math.PI / 3);
      headerGroup.add(runner);
    }

    registerPart(
      headerGroup,
      [side * 0.28, -0.02, -0.02],
      [0, 0, 0],
      [side * 0.62, -0.12, -0.16],
      [0.22 * side, -0.38 * side, side * 0.48],
      0.03
    );
  }

  // --- Components 25..29: 5 Rotating Billet Pulleys + Serpentine Belt Drive ---
  const createBilletPulley = (radius: number, thickness: number, isRibbed = true) => {
    const pGroup = new THREE.Group();
    const outerRim = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(radius, radius, thickness, 28)),
      billetPulleyMat
    );
    outerRim.rotation.x = Math.PI / 2;
    pGroup.add(outerRim);

    const hub = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, thickness * 1.18, 16)),
      anodizedGoldMat
    );
    hub.rotation.x = Math.PI / 2;
    pGroup.add(hub);

    if (isRibbed) {
      const spokeGeo = trackGeo(new THREE.BoxGeometry(radius * 1.65, radius * 0.14, thickness * 1.1));
      for (let s = 0; s < 3; s++) {
        const spoke = new THREE.Mesh(spokeGeo, castIronMat);
        spoke.rotation.z = (s * Math.PI) / 3;
        pGroup.add(spoke);
      }
    }
    return pGroup;
  };

  const pulleyConfigs: {
    pos: [number, number, number];
    explode: [number, number, number];
    radius: number;
    ratio: number;
  }[] = [
    // Crankshaft harmonic balancer (bottom center)
    { pos: [0, -0.14, 0.35], explode: [0, -0.32, 0.56], radius: 0.078, ratio: 1.0 },
    // Supercharger upper drive pulley (top center)
    { pos: [0, 0.16, 0.38], explode: [0, 0.42, 0.64], radius: 0.046, ratio: 2.35 },
    // Water pump pulley (mid center-right)
    { pos: [0.09, 0.01, 0.35], explode: [0.28, 0.05, 0.52], radius: 0.054, ratio: -1.4 },
    // Alternator pulley (lower left)
    { pos: [-0.15, -0.05, 0.35], explode: [-0.42, -0.12, 0.50], radius: 0.044, ratio: 1.85 },
    // Heavy-duty belt tensioner pulley (upper left)
    { pos: [-0.11, 0.08, 0.36], explode: [-0.34, 0.24, 0.54], radius: 0.038, ratio: -2.0 },
  ];

  pulleyConfigs.forEach((cfg, idx) => {
    const pMesh = createBilletPulley(cfg.radius, 0.036);
    pulleys.push({ mesh: pMesh, speedRatio: cfg.ratio });
    registerPart(
      pMesh,
      cfg.pos,
      [0, 0, 0],
      cfg.explode,
      [0.3 * (idx - 2), -0.4, 0.8],
      0.01 + idx * 0.015
    );
  });

  // Serpentine Drive Belt Loop
  const beltGroup = new THREE.Group();
  const beltSegments: [number, number, number, number, number][] = [
    // [x, y, length, angleZ, z]
    [-0.075, 0.01, 0.31, -0.46, 0.35],
    [0.055, 0.01, 0.31, 0.46, 0.35],
    [-0.08, -0.10, 0.18, 0.52, 0.35],
  ];
  beltSegments.forEach(([bx, by, len, ang, bz]) => {
    const seg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.012, len, 0.032)),
      beltRubberMat
    );
    seg.position.set(bx, by, bz);
    seg.rotation.z = ang;
    beltGroup.add(seg);
  });
  registerPart(
    beltGroup,
    [0, 0, 0],
    [0, 0, 0],
    [0, 0.08, 0.72],
    [0.15, -0.22, 0.35],
    0.0
  );

  // ============================================================================
  // 3. METALLIC SHARDS & MICRO-SPARKS FOR SCENE 05 (EXPLOSION) & 06 (REASSEMBLY)
  // ============================================================================
  const SHARD_COUNT = 260;
  const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.008, 0));
  const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, SHARD_COUNT);
  shardInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(shardInstanced);

  const shardData = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / SHARD_COUNT);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 0.22 + ((i * 37) % 100) / 100 * 0.58;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta) * 0.85 + 0.08,
      Math.cos(phi) * 0.9
    );
    return {
      origin: dir.clone().multiplyScalar(0.08),
      target: dir.clone().multiplyScalar(radius),
      rotSpeed: new THREE.Vector3(
        ((i * 13) % 7) - 3,
        ((i * 29) % 7) - 3,
        ((i * 41) % 7) - 3
      ),
      scale: 0.45 + ((i * 19) % 10) * 0.11,
    };
  });

  // ============================================================================
  // 4. DEDICATED ENGINE BAY ILLUMINATION LIGHTS
  // ============================================================================
  const engineCoreLight = new THREE.PointLight(0xff5a26, 0, 2.4, 1.6);
  engineCoreLight.position.set(0, 0.08, 0.05);
  group.add(engineCoreLight);

  const engineTopLight = new THREE.PointLight(0xe0f2fe, 0, 2.8, 1.5);
  engineTopLight.position.set(0, 0.52, 0.35);
  group.add(engineTopLight);

  const dummy = new THREE.Object3D();

  // ============================================================================
  // 5. DETERMINISTIC SCROLL CHOREOGRAPHY UPDATE (SCENES 01 -> 07)
  // ============================================================================
  const updateState = (
    scrollProgress: number,
    elapsedTime: number,
    reducedMotion: boolean
  ) => {
    const p = Math.max(0, Math.min(1, scrollProgress));

    // Only illuminate internal engine bay lights when camera approaches/enters grille (p: 0.22 -> 0.92)
    const bayLightEnvelope =
      smoothstep(0.20, 0.34, p) * (1 - smoothstep(0.85, 0.94, p));

    // Explosion factor:
    // Scene 05 (0.55 -> 0.71): Engine disassembles outward from 0.0 to 1.0
    // Scene 06 (0.71 -> 0.85): Engine reassembles from shards back from 1.0 to 0.0
    const explodeUp = smoothstep(0.55, 0.70, p);
    const reassembleDown = smoothstep(0.72, 0.85, p);
    const explosionFactor = Math.max(0, explodeUp - reassembleDown);

    // Pre-explosion harmonic mechanical vibration in late Scene 04 (0.46 -> 0.56)
    const preTremor =
      !reducedMotion
        ? smoothstep(0.45, 0.55, p) * (1 - smoothstep(0.55, 0.60, p))
        : 0;

    engineCoreLight.intensity = bayLightEnvelope * (2.6 + explosionFactor * 3.8);
    engineTopLight.intensity = bayLightEnvelope * 3.4;

    // 1. Spin pulleys synchronously during Scenes 02–04, slowing down as engine explodes in Scene 05
    const pulleySpinRate = reducedMotion ? 0.5 : 8.5 * (1 - explosionFactor * 0.82);
    const spinAngle = elapsedTime * pulleySpinRate + p * 28.0;

    // 2. Update each of the 28 mechanical engine components
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // Staggered local explosion progress so outer covers lift slightly before inner pistons
      const localExp = smoothstep(
        part.stagger * 0.45,
        1.0 - (0.28 - part.stagger) * 0.35,
        explosionFactor
      );

      // Subtle floating suspension at peak explosion
      const floatWave =
        !reducedMotion && localExp > 0.05
          ? Math.sin(elapsedTime * 2.2 + i * 0.9) * 0.012 * localExp
          : 0;

      // High-frequency mechanical vibration right before disassembly
      const vibX =
        preTremor > 0
          ? Math.sin(elapsedTime * 58 + i * 1.7) * 0.0035 * preTremor
          : 0;
      const vibY =
        preTremor > 0
          ? Math.cos(elapsedTime * 64 + i * 2.3) * 0.0035 * preTremor
          : 0;

      part.mesh.position.set(
        part.homePos.x + part.explodeOffset.x * localExp + vibX,
        part.homePos.y + part.explodeOffset.y * localExp + floatWave + vibY,
        part.homePos.z + part.explodeOffset.z * localExp
      );

      part.mesh.rotation.set(
        part.homeRot.x + part.explodeRot.x * localExp,
        part.homeRot.y + part.explodeRot.y * localExp,
        part.homeRot.z + part.explodeRot.z * localExp
      );
    }

    // Apply pulley axle rotation on top of their exploded orientation
    for (let i = 0; i < pulleys.length; i++) {
      const item = pulleys[i];
      item.mesh.rotation.z += spinAngle * item.speedRatio;
    }

    // 3. Update metallic shard & spark cloud during Scene 05 (Explosion) and Scene 06 (Reassembly)
    const shardVisibility = smoothstep(0.53, 0.59, p) * (1 - smoothstep(0.81, 0.86, p));
    shardInstanced.visible = shardVisibility > 0.005;

    if (shardInstanced.visible) {
      shardMat.emissiveIntensity = 1.4 + shardVisibility * 2.4;
      for (let i = 0; i < SHARD_COUNT; i++) {
        const s = shardData[i];
        const pos = dummy.position;
        pos.lerpVectors(s.origin, s.target, explosionFactor);
        if (!reducedMotion) {
          pos.y += Math.sin(elapsedTime * 3.0 + i) * 0.015 * explosionFactor;
        }
        dummy.rotation.set(
          elapsedTime * s.rotSpeed.x * 0.5 + explosionFactor * 3.0,
          elapsedTime * s.rotSpeed.y * 0.5 + explosionFactor * 3.0,
          elapsedTime * s.rotSpeed.z * 0.5
        );
        const currentScale = s.scale * shardVisibility * (0.4 + 0.6 * explosionFactor);
        dummy.scale.setScalar(currentScale);
        dummy.updateMatrix();
        shardInstanced.setMatrixAt(i, dummy.matrix);
      }
      shardInstanced.instanceMatrix.needsUpdate = true;
    }
  };

  const dispose = () => {
    disposableGeometries.forEach((g) => g.dispose());
    disposableMaterials.forEach((m) => m.dispose());
  };

  return {
    group,
    grillePortalGroup,
    updateState,
    dispose,
  };
}
