import * as THREE from 'three';

export interface EnginePartRecord {
  mesh: THREE.Object3D;
  homePos: THREE.Vector3;
  homeRot: THREE.Euler;
  explodeOffset: THREE.Vector3;
  explodeRot: THREE.Euler;
  stagger: number;
}

export interface EngineAssemblyInstance {
  group: THREE.Group;
  grillePortalGroup: THREE.Group;
  updateState: (
    scrollProgress: number,
    elapsedTime: number,
    reducedMotion: boolean,
    isMobile: boolean
  ) => void;
  dispose: () => void;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Constructs the multi-part 6.2L Supercharged HEMI V8 mechanical assembly
 * and the internal radiator grille louver frame inside the Dodge Challenger.
 *
 * All ring/cylinder helper geometries have been completely removed.
 * Local coordinates are in car-space (meters):
 * - Front grille aperture sits at Z = +2.24m, Y = 0.64m
 * - Engine assembly center sits at Z = +1.18m, Y = 0.64m, X = 0.0m
 */
export function createEngineAssembly(): EngineAssemblyInstance {
  const group = new THREE.Group();
  group.name = 'SuperchargedV8Assembly';
  group.position.set(0, 0.64, 1.18);

  const grillePortalGroup = new THREE.Group();
  grillePortalGroup.name = 'GrilleApertureLouvers';
  grillePortalGroup.position.set(0, 0.64, 2.24);

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
      color: 0x22262e,
      metalness: 0.78,
      roughness: 0.48,
      envMapIntensity: 1.45,
    })
  );

  const machinedAluminumMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd8dee9,
      metalness: 0.92,
      roughness: 0.18,
      clearcoat: 0.35,
      clearcoatRoughness: 0.14,
      envMapIntensity: 1.9,
    })
  );

  const forgedSteelMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xb8c2cc,
      metalness: 0.95,
      roughness: 0.22,
      clearcoat: 0.25,
      envMapIntensity: 1.85,
    })
  );

  const superchargerAlloyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x363d4a,
      metalness: 0.86,
      roughness: 0.26,
      clearcoat: 0.4,
      envMapIntensity: 1.65,
    })
  );

  const hemiValveCoverMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd12615,
      metalness: 0.48,
      roughness: 0.22,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.6,
    })
  );

  const billetPulleyMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xe5e9f0,
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
      roughness: 0.20,
      envMapIntensity: 1.7,
    })
  );

  const beltRubberMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101217,
      metalness: 0.12,
      roughness: 0.82,
    })
  );

  const headerSteelMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x9ca3af,
      metalness: 0.92,
      roughness: 0.25,
      iridescence: 0.32,
      iridescenceIOR: 1.4,
      envMapIntensity: 1.65,
    })
  );

  const darkGrilleSlatMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0c0e12,
      metalness: 0.65,
      roughness: 0.38,
    })
  );

  const shardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 1.5,
      metalness: 0.9,
      roughness: 0.18,
    })
  );

  // ============================================================================
  // 1. STRICTLY FITTED RADIATOR GRILLE APERTURE LOUVERS (No protruding rings/tunnels)
  // ============================================================================
  const upperBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.12, 0.018, 0.09)),
    darkGrilleSlatMat
  );
  upperBar.position.set(0, 0.075, 0);
  grillePortalGroup.add(upperBar);

  const lowerBar = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.12, 0.018, 0.09)),
    darkGrilleSlatMat
  );
  lowerBar.position.set(0, -0.075, 0);
  grillePortalGroup.add(lowerBar);

  // Side grille slats leaving the center 0.48m wide passage clear for the camera flight
  const slatGeo = trackGeo(new THREE.BoxGeometry(0.008, 0.13, 0.08));
  [-0.50, -0.42, -0.34, -0.26, 0.26, 0.34, 0.42, 0.50].forEach((lx) => {
    const slat = new THREE.Mesh(slatGeo, darkGrilleSlatMat);
    slat.position.set(lx, 0, 0);
    grillePortalGroup.add(slat);
  });

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
    trackGeo(new THREE.BoxGeometry(0.36, 0.24, 0.56)),
    castIronMat
  );
  blockGroup.add(blockCore);

  // 8 Honed Cylinder Bores arranged in 90-degree V8 banks
  const boreGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.048, 0.19, 24));
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const bore = new THREE.Mesh(boreGeo, machinedAluminumMat);
      const zOff = -0.195 + i * 0.13;
      bore.position.set(side * 0.115, 0.085, zOff);
      bore.rotation.z = -side * (Math.PI / 4);
      blockGroup.add(bore);
    }
  }
  registerPart(
    blockGroup,
    [0, -0.02, 0],
    [0, 0, 0],
    [0, 0.02, -0.14],
    [0.05, -0.08, 0.02],
    0.08
  );

  // --- Component 2: Forged Steel Crankshaft (Counterweights, Journals & Crankpins) ---
  const crankGroup = new THREE.Group();
  const crankSpine = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.64, 20)),
    forgedSteelMat
  );
  crankSpine.rotation.x = Math.PI / 2;
  crankGroup.add(crankSpine);

  const webGeo = trackGeo(new THREE.CylinderGeometry(0.082, 0.068, 0.022, 20));
  const pinGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.055, 16));
  pinGeo.rotateX(Math.PI / 2);

  for (let i = 0; i < 8; i++) {
    const zPos = -0.24 + i * 0.068;
    const angle = i * (Math.PI / 2);
    const web = new THREE.Mesh(webGeo, forgedSteelMat);
    web.rotation.x = Math.PI / 2;
    web.position.set(Math.cos(angle) * 0.022, Math.sin(angle) * 0.022, zPos);
    crankGroup.add(web);

    if (i % 2 === 0) {
      const pin = new THREE.Mesh(pinGeo, anodizedGoldMat);
      pin.position.set(Math.cos(angle) * 0.042, Math.sin(angle) * 0.042, zPos + 0.034);
      crankGroup.add(pin);
    }
  }
  // Crankshaft separates clearly downward and slightly forward so its journals & webs are unmistakable
  registerPart(
    crankGroup,
    [0, -0.13, 0],
    [0, 0, 0],
    [0, -0.26, 0.10],
    [0.12, 0.28, -0.14],
    0.06
  );

  // --- Component 3: Lower Oil Pan Sump ---
  const oilPanGroup = new THREE.Group();
  const panMain = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.35, 0.085, 0.54)),
    castIronMat
  );
  oilPanGroup.add(panMain);
  registerPart(
    oilPanGroup,
    [0, -0.23, 0],
    [0, 0, 0],
    [0, -0.48, 0.04],
    [-0.14, 0.08, 0.10],
    0.02
  );

  // --- Component 4: Front Timing Chain Cover ---
  const timingCover = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.35, 0.26, 0.042)),
    machinedAluminumMat
  );
  registerPart(
    timingCover,
    [0, -0.03, 0.30],
    [0, 0, 0],
    [0, -0.02, 0.30],
    [-0.18, 0.14, 0.06],
    0.04
  );

  // --- Components 5 & 6: Left & Right Machined Aluminum Cylinder Heads ---
  for (let side = -1; side <= 1; side += 2) {
    const headGroup = new THREE.Group();
    const headSlab = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.15, 0.105, 0.54)),
      machinedAluminumMat
    );
    headGroup.add(headSlab);

    const springGeo = trackGeo(new THREE.CylinderGeometry(0.017, 0.017, 0.045, 12));
    for (let i = 0; i < 4; i++) {
      const sp1 = new THREE.Mesh(springGeo, anodizedGoldMat);
      sp1.position.set(-0.025, 0.068, -0.195 + i * 0.13);
      headGroup.add(sp1);
      const sp2 = new THREE.Mesh(springGeo, billetPulleyMat);
      sp2.position.set(0.025, 0.068, -0.195 + i * 0.13);
      headGroup.add(sp2);
    }

    const baseRotZ = -side * (Math.PI / 5.2);
    registerPart(
      headGroup,
      [side * 0.19, 0.08, 0],
      [0, 0, baseRotZ],
      [side * 0.40, 0.14, -0.04],
      [0.14 * side, 0.20 * side, baseRotZ - side * 0.32],
      0.05
    );
  }

  // --- Components 7 & 8: Left & Right HEMI Anodized Valve Covers ---
  for (let side = -1; side <= 1; side += 2) {
    const vcGroup = new THREE.Group();
    const vcBody = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.135, 0.062, 0.52)),
      hemiValveCoverMat
    );
    vcGroup.add(vcBody);

    const strip = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.048, 0.070, 0.48)),
      machinedAluminumMat
    );
    vcGroup.add(strip);

    const baseRotZ = -side * (Math.PI / 5.2);
    registerPart(
      vcGroup,
      [side * 0.25, 0.14, 0],
      [0, 0, baseRotZ],
      [side * 0.60, 0.28, 0.05],
      [-0.22 * side, 0.26 * side, baseRotZ - side * 0.46],
      0.01
    );
  }

  // --- Components 9..16: 8 Forged Pistons & H-Beam Connecting Rods ---
  const pistonCrownGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.048, 24));
  const pistonRingGeo = trackGeo(new THREE.CylinderGeometry(0.0465, 0.0465, 0.006, 24));
  const wristPinGeo = trackGeo(new THREE.CylinderGeometry(0.013, 0.013, 0.078, 14));
  wristPinGeo.rotateZ(Math.PI / 2);
  const rodBeamGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.145, 0.028));
  const bigEndGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.026, 16));
  bigEndGeo.rotateX(Math.PI / 2);

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 4; i++) {
      const pGroup = new THREE.Group();

      // Piston crown
      const crown = new THREE.Mesh(pistonCrownGeo, billetPulleyMat);
      crown.position.y = 0.065;
      pGroup.add(crown);

      // Gold compression ring band
      const ring = new THREE.Mesh(pistonRingGeo, anodizedGoldMat);
      ring.position.y = 0.078;
      pGroup.add(ring);

      // Wrist pin (gudgeon pin)
      const pin = new THREE.Mesh(wristPinGeo, anodizedGoldMat);
      pin.position.y = 0.052;
      pGroup.add(pin);

      // Forged H-beam connecting rod
      const rod = new THREE.Mesh(rodBeamGeo, forgedSteelMat);
      rod.position.y = -0.015;
      pGroup.add(rod);

      // Rod big-end journal cap
      const bigEnd = new THREE.Mesh(bigEndGeo, machinedAluminumMat);
      bigEnd.position.y = -0.088;
      pGroup.add(bigEnd);

      const zPos = -0.195 + i * 0.13 + (side > 0 ? 0.016 : -0.016);
      const bankAngle = -side * (Math.PI / 4.6);

      // Pistons & rods rise prominently out of the block so all 8 are clearly visible
      registerPart(
        pGroup,
        [side * 0.105, 0.02, zPos],
        [0, 0, bankAngle],
        [
          side * (0.24 + (i % 2) * 0.08),
          0.22 + (i % 2) * 0.11,
          (i - 1.5) * 0.14,
        ],
        [(i - 1.5) * 0.28, side * 0.35, bankAngle - side * 0.32],
        0.06 + i * 0.018
      );
    }
  }

  // --- Component 17: 2.7L Twin-Screw Supercharger Main Housing & Internal Rotors ---
  const blowerGroup = new THREE.Group();
  const blowerBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.27, 0.135, 0.48)),
    superchargerAlloyMat
  );
  blowerGroup.add(blowerBody);

  const rotorGeo = trackGeo(new THREE.CylinderGeometry(0.046, 0.046, 0.42, 16));
  rotorGeo.rotateX(Math.PI / 2);
  const rotorL = new THREE.Mesh(rotorGeo, anodizedGoldMat);
  rotorL.position.set(-0.052, 0.02, 0);
  blowerGroup.add(rotorL);
  const rotorR = new THREE.Mesh(rotorGeo, anodizedGoldMat);
  rotorR.position.set(0.052, 0.02, 0);
  blowerGroup.add(rotorR);

  registerPart(
    blowerGroup,
    [0, 0.16, -0.02],
    [0, 0, 0],
    [0, 0.36, -0.06],
    [0.16, -0.18, 0.08],
    0.03
  );

  // --- Component 18: Supercharger Finned Intercooler Lid ---
  const lidGroup = new THREE.Group();
  const lidPlate = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.29, 0.035, 0.49)),
    machinedAluminumMat
  );
  lidGroup.add(lidPlate);

  const finGeo = trackGeo(new THREE.BoxGeometry(0.012, 0.018, 0.44));
  for (let f = -3; f <= 3; f++) {
    const fin = new THREE.Mesh(
      finGeo,
      f === 0 ? hemiValveCoverMat : superchargerAlloyMat
    );
    fin.position.set(f * 0.035, 0.022, 0);
    lidGroup.add(fin);
  }
  registerPart(
    lidGroup,
    [0, 0.25, -0.02],
    [0, 0, 0],
    [0, 0.56, -0.04],
    [-0.20, 0.16, -0.12],
    0.0
  );

  // --- Component 19: Supercharger Front Drive Snout ---
  const snoutGroup = new THREE.Group();
  const snoutCyl = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.040, 0.054, 0.18, 20)),
    machinedAluminumMat
  );
  snoutCyl.rotation.x = Math.PI / 2;
  snoutGroup.add(snoutCyl);
  registerPart(
    snoutGroup,
    [0, 0.17, 0.28],
    [0, 0, 0],
    [-0.06, 0.38, 0.32],
    [-0.26, -0.20, 0.16],
    0.02
  );

  // --- Components 20 & 21: Left & Right Billet Fuel Rails ---
  const railGeo = trackGeo(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 12));
  railGeo.rotateX(Math.PI / 2);
  for (let side = -1; side <= 1; side += 2) {
    const railGroup = new THREE.Group();
    const rail = new THREE.Mesh(railGeo, anodizedGoldMat);
    railGroup.add(rail);
    registerPart(
      railGroup,
      [side * 0.16, 0.20, 0],
      [0, 0, 0],
      [side * 0.44, 0.42, 0.06],
      [0.22, side * 0.30, -side * 0.35],
      0.04
    );
  }

  // --- Component 22: High-Flow Throttle Body & Conical Air Filter ---
  const intakeGroup = new THREE.Group();
  const elbow = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.050, 0.056, 0.22, 20)),
    castIronMat
  );
  elbow.rotation.z = Math.PI / 3;
  intakeGroup.add(elbow);

  const filterCone = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.046, 0.078, 0.17, 20)),
    hemiValveCoverMat
  );
  filterCone.rotation.z = Math.PI / 2.2;
  filterCone.position.set(0.15, -0.05, 0.05);
  intakeGroup.add(filterCone);

  registerPart(
    intakeGroup,
    [0.14, 0.22, -0.29],
    [0, 0, 0],
    [0.38, 0.38, -0.34],
    [0.28, 0.36, -0.24],
    0.05
  );

  // --- Components 23 & 24: Left & Right 4-into-1 Tubular Exhaust Headers ---
  for (let side = -1; side <= 1; side += 2) {
    const headerGroup = new THREE.Group();
    const collector = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.034, 0.030, 0.52, 16)),
      headerSteelMat
    );
    collector.rotation.x = Math.PI / 2;
    headerGroup.add(collector);

    const runnerGeo = trackGeo(new THREE.CylinderGeometry(0.017, 0.017, 0.14, 12));
    for (let i = 0; i < 4; i++) {
      const runner = new THREE.Mesh(runnerGeo, headerSteelMat);
      runner.position.set(-side * 0.044, 0.04, -0.195 + i * 0.13);
      runner.rotation.z = side * (Math.PI / 3);
      headerGroup.add(runner);
    }

    registerPart(
      headerGroup,
      [side * 0.27, -0.01, -0.02],
      [0, 0, 0],
      [side * 0.58, -0.10, -0.14],
      [0.18 * side, -0.32 * side, side * 0.42],
      0.03
    );
  }

  // --- Components 25..29: 5 Rotating Billet Pulleys + Serpentine Belt Drive ---
  const createBilletPulley = (radius: number, thickness: number) => {
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

    const spokeGeo = trackGeo(new THREE.BoxGeometry(radius * 1.65, radius * 0.14, thickness * 1.1));
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(spokeGeo, castIronMat);
      spoke.rotation.z = (s * Math.PI) / 3;
      pGroup.add(spoke);
    }
    return pGroup;
  };

  const pulleyConfigs: {
    pos: [number, number, number];
    explode: [number, number, number];
    radius: number;
    ratio: number;
  }[] = [
    { pos: [0, -0.13, 0.35], explode: [0, -0.28, 0.46], radius: 0.076, ratio: 1.0 },
    { pos: [0, 0.17, 0.38], explode: [0, 0.38, 0.52], radius: 0.045, ratio: 2.35 },
    { pos: [0.09, 0.01, 0.35], explode: [0.24, 0.05, 0.44], radius: 0.052, ratio: -1.4 },
    { pos: [-0.15, -0.05, 0.35], explode: [-0.36, -0.10, 0.42], radius: 0.042, ratio: 1.85 },
    { pos: [-0.11, 0.08, 0.36], explode: [-0.28, 0.22, 0.46], radius: 0.036, ratio: -2.0 },
  ];

  pulleyConfigs.forEach((cfg, idx) => {
    const pMesh = createBilletPulley(cfg.radius, 0.034);
    pulleys.push({ mesh: pMesh, speedRatio: cfg.ratio });
    registerPart(
      pMesh,
      cfg.pos,
      [0, 0, 0],
      cfg.explode,
      [0.24 * (idx - 2), -0.32, 0.65],
      0.01 + idx * 0.015
    );
  });

  // Serpentine Drive Belt Loop
  const beltGroup = new THREE.Group();
  const beltSegments: [number, number, number, number, number][] = [
    [-0.075, 0.01, 0.30, -0.46, 0.35],
    [0.055, 0.01, 0.30, 0.46, 0.35],
    [-0.08, -0.09, 0.17, 0.52, 0.35],
  ];
  beltSegments.forEach(([bx, by, len, ang, bz]) => {
    const seg = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.012, len, 0.030)),
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
    [0, 0.06, 0.58],
    [0.12, -0.18, 0.28],
    0.0
  );

  // ============================================================================
  // 3. SUBTLE METALLIC FRAGMENTS (Complement real parts without replacing them)
  // ============================================================================
  const MAX_SHARDS = 160;
  const shardGeo = trackGeo(new THREE.OctahedronGeometry(0.0065, 0));
  const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, MAX_SHARDS);
  shardInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(shardInstanced);

  const shardData = Array.from({ length: MAX_SHARDS }, (_, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / MAX_SHARDS);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const radius = 0.26 + (((i * 37) % 100) / 100) * 0.48;
    const dir = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta) * 0.82 + 0.05,
      Math.cos(phi) * 0.85
    );
    return {
      origin: dir.clone().multiplyScalar(0.06),
      target: dir.clone().multiplyScalar(radius),
      rotSpeed: new THREE.Vector3(
        ((i * 13) % 7) - 3,
        ((i * 29) % 7) - 3,
        ((i * 41) % 7) - 3
      ),
      scale: 0.4 + ((i * 19) % 10) * 0.09,
    };
  });

  // ============================================================================
  // 4. DEDICATED ENGINE BAY ILLUMINATION LIGHTS
  // ============================================================================
  const engineCoreLight = new THREE.PointLight(0xff6b35, 0, 2.6, 1.5);
  engineCoreLight.position.set(0, 0.06, 0.08);
  group.add(engineCoreLight);

  const engineTopLight = new THREE.PointLight(0xf8fafc, 0, 3.2, 1.4);
  engineTopLight.position.set(0, 0.55, 0.38);
  group.add(engineTopLight);

  const dummy = new THREE.Object3D();

  // ============================================================================
  // 5. DETERMINISTIC SCROLL CHOREOGRAPHY UPDATE (FORWARD & REVERSE)
  // ============================================================================
  const updateState = (
    scrollProgress: number,
    elapsedTime: number,
    reducedMotion: boolean,
    isMobile: boolean
  ) => {
    const p = Math.max(0, Math.min(1, scrollProgress));

    // Show grille louvers ONLY when camera is approaching/passing the grille (0.20 -> 0.90)
    grillePortalGroup.visible = p >= 0.20 && p <= 0.90;

    // Show and illuminate engine assembly from approach through exit (0.18 -> 0.92)
    const bayLightEnvelope =
      smoothstep(0.22, 0.34, p) * (1 - smoothstep(0.84, 0.92, p));

    // Priority 4, 5 & 6 Timeline Mapping:
    // - 0.35 -> 0.44: Camera inside engine bay; vibration starts and intensifies
    // - 0.44 -> 0.68: Engine disassembles into recognizable components (Crankshaft, Pistons, Rods, Block, Heads, Covers, Blower, Pulleys, Belt)
    // - 0.68 -> 0.84: Reverse scroll / continuation reassembles components back to 0.000 tolerance
    const explodeUp = smoothstep(0.43, 0.66, p);
    const reassembleDown = smoothstep(0.69, 0.84, p);
    const explosionFactor = Math.max(0, explodeUp - reassembleDown);

    // Escalating mechanical vibration in 0.35 -> 0.46 before parts separate
    const vibRampUp = smoothstep(0.35, 0.44, p);
    const vibFadeOut = 1 - smoothstep(0.44, 0.50, p);
    const tremorIntensity = !reducedMotion ? vibRampUp * vibFadeOut : 0;

    engineCoreLight.intensity = bayLightEnvelope * (2.8 + explosionFactor * 3.6);
    engineTopLight.intensity = bayLightEnvelope * 3.8;

    // Pulleys spin synchronously with engine RPM, slowing as parts separate
    const pulleySpinRate = reducedMotion ? 0.5 : 8.0 * (1 - explosionFactor * 0.85);
    const spinAngle = elapsedTime * pulleySpinRate + p * 22.0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const localExp = smoothstep(
        part.stagger * 0.45,
        1.0 - (0.24 - part.stagger) * 0.35,
        explosionFactor
      );

      const floatWave =
        !reducedMotion && localExp > 0.05
          ? Math.sin(elapsedTime * 2.0 + i * 0.8) * 0.009 * localExp
          : 0;

      // High-frequency mechanical harmonic vibration
      const vibX =
        tremorIntensity > 0
          ? Math.sin(elapsedTime * 68 + i * 1.9) * 0.0045 * tremorIntensity
          : 0;
      const vibY =
        tremorIntensity > 0
          ? Math.cos(elapsedTime * 74 + i * 2.3) * 0.0045 * tremorIntensity
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

    for (let i = 0; i < pulleys.length; i++) {
      const item = pulleys[i];
      item.mesh.rotation.z += spinAngle * item.speedRatio;
    }

    // Subtle secondary fragments (halved count on mobile for performance & clarity)
    const activeShardCount = isMobile ? 70 : MAX_SHARDS;
    shardInstanced.count = activeShardCount;
    const shardVisibility =
      smoothstep(0.44, 0.50, p) * (1 - smoothstep(0.79, 0.84, p));
    shardInstanced.visible = shardVisibility > 0.01;

    if (shardInstanced.visible) {
      shardMat.emissiveIntensity = 1.3 + shardVisibility * 2.0;
      for (let i = 0; i < activeShardCount; i++) {
        const s = shardData[i];
        const pos = dummy.position;
        pos.lerpVectors(s.origin, s.target, explosionFactor);
        dummy.rotation.set(
          elapsedTime * s.rotSpeed.x * 0.4 + explosionFactor * 2.5,
          elapsedTime * s.rotSpeed.y * 0.4 + explosionFactor * 2.5,
          elapsedTime * s.rotSpeed.z * 0.4
        );
        const currentScale = s.scale * shardVisibility * (0.35 + 0.65 * explosionFactor);
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
