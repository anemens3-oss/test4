import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createEngineAssembly, EngineAssemblyInstance } from './engineAssembly';

export type PaintPresetId = 'crimson' | 'graphite' | 'black';

export interface PaintPreset {
  id: PaintPresetId;
  name: string;
  hex: string;
  color: number;
  metalness: number;
  roughness: number;
  clearcoat: number;
}

/**
 * Calibrated automotive basecoat + clearcoat presets.
 * Lowering metalness to 0.34–0.48 preserves rich diffuse pigment saturation
 * while clearcoat: 1.0 delivers crisp studio reflections along the Challenger body lines.
 */
export const PAINT_PRESETS: PaintPreset[] = [
  {
    id: 'crimson',
    name: 'Заводской ярко-красный',
    hex: '#c81d11',
    color: 0xc81d11,
    metalness: 0.34,
    roughness: 0.22,
    clearcoat: 1.0,
  },
  {
    id: 'graphite',
    name: 'Глубокий графитовый',
    hex: '#363e4a',
    color: 0x363e4a,
    metalness: 0.48,
    roughness: 0.24,
    clearcoat: 1.0,
  },
  {
    id: 'black',
    name: 'Насыщенный чёрный',
    hex: '#0d0f14',
    color: 0x0d0f14,
    metalness: 0.42,
    roughness: 0.18,
    clearcoat: 1.0,
  },
];

export interface CarModelInstance {
  rootGroup: THREE.Group;
  isExternalModel: boolean;
  setPaintPreset: (presetId: PaintPresetId) => void;
  updateScrollState: (progress: number, elapsedTime: number, reducedMotion: boolean) => number;
  dispose: () => void;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Module-level cache so the GLB is only fetched and parsed once per session
let cachedGltfScene: THREE.Group | null = null;
let loadingPromise: Promise<THREE.Group> | null = null;

function fetchChallengerGlb(
  onProgress?: (percent: number) => void
): Promise<THREE.Group> {
  if (cachedGltfScene) {
    onProgress?.(100);
    return Promise.resolve(cachedGltfScene.clone(true));
  }

  if (loadingPromise) {
    return loadingPromise.then((scene) => scene.clone(true));
  }

  const loader = new GLTFLoader();
  // Relative URL works both at root (/) and on GitHub Pages subfolder (/service4/)
  const modelUrl = './models/dodge_challenger.glb';

  loadingPromise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(
      modelUrl,
      (gltf) => {
        cachedGltfScene = gltf.scene;
        onProgress?.(100);
        resolve(gltf.scene.clone(true));
      },
      (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress?.(pct);
        }
      },
      (error) => {
        loadingPromise = null;
        reject(error);
      }
    );
  });

  return loadingPromise;
}

interface WheelRigItem {
  spinGroup: THREE.Group;
  directionSign: number;
  parentWheel: THREE.Object3D;
  initialQuat: THREE.Quaternion;
  straightQuat: THREE.Quaternion;
  isFront: boolean;
}

/**
 * Sets up real 3D wheel spin groups around each wheel's true axle center
 * so all 4 wheels rotate in exact sync with the vehicle's forward motion in Scene 02.
 */
function setupWheelKinematics(gltfScene: THREE.Object3D): WheelRigItem[] {
  const wheelRigs: WheelRigItem[] = [];
  const wheelNames = ['wheel', 'wheel.001', 'wheel.002', 'wheel.003'];

  wheelNames.forEach((wName) => {
    const wheelNode = gltfScene.getObjectByName(wName);
    if (!wheelNode) return;

    const isRightSide = wName === 'wheel' || wName === 'wheel.003';
    const isFront = wName === 'wheel' || wName === 'wheel.001';

    const spinGroup = new THREE.Group();
    spinGroup.name = `${wName}_spinAxle`;

    // Move mesh children (tire, rim, brake disc) into spinGroup so rotating spinGroup.rotation.x
    // spins the wheel cleanly around its local X axle without disturbing steering orientation.
    const childrenToMove = [...wheelNode.children];
    childrenToMove.forEach((ch) => {
      spinGroup.add(ch);
    });
    wheelNode.add(spinGroup);

    const initialQuat = wheelNode.quaternion.clone();
    // In the source GLTF, front wheels have an ~18 deg show-turn around world Y.
    // Counter-rotating around Y aligns them straight ahead when driving in Scene 02.
    const straightenYaw = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      -0.312
    );
    const straightQuat = straightenYaw.multiply(initialQuat.clone());

    wheelRigs.push({
      spinGroup,
      directionSign: isRightSide ? -1 : 1,
      parentWheel: wheelNode,
      initialQuat,
      straightQuat,
      isFront,
    });
  });

  return wheelRigs;
}

/**
 * Applies calibrated studio PBR materials to the loaded Dodge Challenger GLTF meshes
 * while preserving original UV-mapped tire and grille textures.
 */
function upgradeChallengerMaterials(root: THREE.Object3D): {
  bodyMaterial: THREE.MeshPhysicalMaterial;
  grillMaterials: THREE.MeshStandardMaterial[];
  shellFadeMaterials: THREE.Material[];
  haloOuterMat: THREE.MeshStandardMaterial;
  haloInnerMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  disposableMaterials: THREE.Material[];
} {
  const disposableMaterials: THREE.Material[] = [];
  const grillMaterials: THREE.MeshStandardMaterial[] = [];
  const shellFadeMaterials: THREE.Material[] = [];

  const defaultPreset = PAINT_PRESETS[0];

  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: defaultPreset.color,
    metalness: defaultPreset.metalness,
    roughness: defaultPreset.roughness,
    clearcoat: defaultPreset.clearcoat,
    clearcoatRoughness: 0.05,
    reflectivity: 0.9,
    envMapIntensity: 1.5,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x07090e,
    metalness: 0.12,
    roughness: 0.05,
    transparent: true,
    opacity: 0.84,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    envMapIntensity: 2.0,
  });

  const rimMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x262b36,
    metalness: 0.90,
    roughness: 0.22,
    clearcoat: 0.65,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.7,
  });

  const rotorMaterial = new THREE.MeshStandardMaterial({
    color: 0xcfd6e2,
    metalness: 0.94,
    roughness: 0.24,
    envMapIntensity: 1.6,
  });

  const caliperMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xd92b1c,
    metalness: 0.55,
    roughness: 0.22,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.5,
  });

  const haloOuterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 3.4,
    roughness: 0.08,
    metalness: 0.1,
  });

  const haloInnerMat = new THREE.MeshStandardMaterial({
    color: 0xffa726,
    emissive: 0xff6d00,
    emissiveIntensity: 3.0,
    roughness: 0.1,
    metalness: 0.1,
  });

  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xff2424,
    emissive: 0xe61919,
    emissiveIntensity: 2.8,
    roughness: 0.12,
    metalness: 0.2,
  });

  const exhaustMaterial = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.96,
    roughness: 0.16,
    envMapIntensity: 1.8,
  });

  const mirrorLensMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 1.0,
    roughness: 0.02,
    envMapIntensity: 2.0,
  });

  const satinTrimMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x13161d,
    metalness: 0.32,
    roughness: 0.42,
    clearcoat: 0.22,
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.2,
  });

  const interiorMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e1015,
    metalness: 0.08,
    roughness: 0.82,
  });

  shellFadeMaterials.push(bodyMaterial, satinTrimMaterial, interiorMaterial);

  disposableMaterials.push(
    bodyMaterial,
    glassMaterial,
    rimMaterial,
    rotorMaterial,
    caliperMaterial,
    haloOuterMat,
    haloInnerMat,
    tailLightMat,
    exhaustMaterial,
    mirrorLensMaterial,
    satinTrimMaterial,
    interiorMaterial
  );

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const origMat = child.material as THREE.MeshStandardMaterial | undefined;
    const matName = origMat?.name || '';

    switch (matName) {
      case 'Material.011':
        // Main Challenger Body Shell — ONLY this material changes color in paint switcher
        child.material = bodyMaterial;
        break;

      case 'Material.014':
        // Windshield & Cabin Glass
        child.material = glassMaterial;
        break;

      case 'material':
        // Forged Multi-spoke Alloy Rims
        child.material = rimMaterial;
        break;

      case 'Material.003':
        // Slotted Brake Discs
        child.material = rotorMaterial;
        break;

      case 'Material.010':
        // Brembo 6-Piston Brake Calipers
        child.material = caliperMaterial;
        break;

      case 'Material.021':
        // Outer Quad Halo LED Rings
        child.material = haloOuterMat;
        break;

      case 'Material.020':
        // Inner Amber Air-Catcher DRL Rings
        child.material = haloInnerMat;
        break;

      case 'Material.015':
      case 'Material.004':
        // Rear Racetrack LED Tail Lamp Bar
        child.material = tailLightMat;
        break;

      case 'Material.005':
        // Twin Exhaust Tips
        child.material = exhaustMaterial;
        break;

      case 'Material.017':
        // Side Mirror Reflective Glass
        child.material = mirrorLensMaterial;
        break;

      case 'Material.013':
        // Interior Cabin
        child.material = interiorMaterial;
        break;

      case 'Material.009':
        // Tire Rubber (preserve original tread normal & albedo textures)
        if (origMat) {
          const tireMat = origMat.clone();
          tireMat.roughness = 0.82;
          tireMat.metalness = 0.08;
          tireMat.envMapIntensity = 0.75;
          if (tireMat.normalMap) {
            tireMat.normalScale = new THREE.Vector2(1.25, 1.25);
          }
          child.material = tireMat;
          disposableMaterials.push(tireMat);
        }
        break;

      case 'grills':
        // Front Split Grille & Intake Mesh (preserve original normal & baseColor textures)
        if (origMat) {
          const grillMat = origMat.clone();
          grillMat.metalness = 0.58;
          grillMat.roughness = 0.36;
          grillMat.envMapIntensity = 1.25;
          child.material = grillMat;
          grillMaterials.push(grillMat);
          disposableMaterials.push(grillMat);
        }
        break;

      default:
        // Front Chin Splitter, Rear Diffuser, Side Skirts, Window Trim, Headlight Bezels
        child.material = satinTrimMaterial;
        break;
    }
  });

  return {
    bodyMaterial,
    grillMaterials,
    shellFadeMaterials,
    haloOuterMat,
    haloInnerMat,
    tailLightMat,
    disposableMaterials,
  };
}

/**
 * Fallback Challenger silhouette constructed only if GLB network loading fails.
 */
function createFallbackChallenger(): {
  group: THREE.Group;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  haloOuterMat: THREE.MeshStandardMaterial;
  haloInnerMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  disposableMaterials: THREE.Material[];
} {
  const group = new THREE.Group();
  group.name = 'FallbackChallenger';

  const defaultPreset = PAINT_PRESETS[0];
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: defaultPreset.color,
    metalness: defaultPreset.metalness,
    roughness: defaultPreset.roughness,
    clearcoat: defaultPreset.clearcoat,
    clearcoatRoughness: 0.05,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x12141a,
    metalness: 0.4,
    roughness: 0.45,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x06080c,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.82,
    clearcoat: 1.0,
  });

  const haloOuterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 3.4,
  });

  const haloInnerMat = new THREE.MeshStandardMaterial({
    color: 0xffa726,
    emissive: 0xff6d00,
    emissiveIntensity: 3.0,
  });

  const tailLightMat = new THREE.MeshStandardMaterial({
    color: 0xff2424,
    emissive: 0xe61919,
    emissiveIntensity: 2.8,
  });

  const hullGeo = new THREE.BoxGeometry(1.98, 0.56, 4.92);
  const hull = new THREE.Mesh(hullGeo, bodyMaterial);
  hull.position.set(0, 0.58, 0);
  hull.castShadow = true;
  group.add(hull);

  const cabinGeo = new THREE.BoxGeometry(1.62, 0.42, 2.35);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(0, 1.04, -0.22);
  group.add(cabin);

  const hoodBulgeGeo = new THREE.BoxGeometry(1.18, 0.09, 1.55);
  const hoodBulge = new THREE.Mesh(hoodBulgeGeo, trimMat);
  hoodBulge.position.set(0, 0.89, 1.35);
  group.add(hoodBulge);

  const splitterGeo = new THREE.BoxGeometry(2.02, 0.06, 0.28);
  const splitter = new THREE.Mesh(splitterGeo, trimMat);
  splitter.position.set(0, 0.26, 2.42);
  group.add(splitter);

  [-0.72, -0.52, 0.52, 0.72].forEach((x, idx) => {
    const ringGeo = new THREE.TorusGeometry(0.065, 0.014, 12, 24);
    const mat = idx === 1 || idx === 2 ? haloInnerMat : haloOuterMat;
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.position.set(x, 0.62, 2.47);
    group.add(ring);
  });

  const tailGeo = new THREE.BoxGeometry(1.76, 0.11, 0.04);
  const tail = new THREE.Mesh(tailGeo, tailLightMat);
  tail.position.set(0, 0.68, -2.46);
  group.add(tail);

  return {
    group,
    bodyMaterial,
    haloOuterMat,
    haloInnerMat,
    tailLightMat,
    disposableMaterials: [bodyMaterial, trimMat, glassMat, haloOuterMat, haloInnerMat, tailLightMat],
  };
}

export async function loadChallengerModel(
  onProgress?: (percent: number) => void
): Promise<CarModelInstance> {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ChallengerHellcatRoot';

  let bodyMaterial: THREE.MeshPhysicalMaterial;
  let grillMaterials: THREE.MeshStandardMaterial[] = [];
  let shellFadeMaterials: THREE.Material[] = [];
  let haloOuterMat: THREE.MeshStandardMaterial;
  let haloInnerMat: THREE.MeshStandardMaterial;
  let tailLightMat: THREE.MeshStandardMaterial;
  let disposableMaterials: THREE.Material[] = [];
  let wheelRigs: WheelRigItem[] = [];
  let isExternalModel = false;

  try {
    const gltfScene = await fetchChallengerGlb(onProgress);
    isExternalModel = true;

    // Normalize scale from centimeters to meters (1 unit = 1 meter)
    gltfScene.scale.setScalar(0.01);
    gltfScene.updateMatrixWorld(true);

    // Compute exact world-space bounding box to center X/Z and place tires flush at y = 0
    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());

    gltfScene.position.x -= center.x;
    gltfScene.position.z -= center.z;
    gltfScene.position.y -= box.min.y;
    gltfScene.updateMatrixWorld(true);

    const upgraded = upgradeChallengerMaterials(gltfScene);
    bodyMaterial = upgraded.bodyMaterial;
    grillMaterials = upgraded.grillMaterials;
    shellFadeMaterials = upgraded.shellFadeMaterials;
    haloOuterMat = upgraded.haloOuterMat;
    haloInnerMat = upgraded.haloInnerMat;
    tailLightMat = upgraded.tailLightMat;
    disposableMaterials = upgraded.disposableMaterials;

    wheelRigs = setupWheelKinematics(gltfScene);

    rootGroup.add(gltfScene);
  } catch (err) {
    console.warn('Primary Dodge Challenger GLB failed to load, using fallback model:', err);
    onProgress?.(100);
    const fallback = createFallbackChallenger();
    bodyMaterial = fallback.bodyMaterial;
    haloOuterMat = fallback.haloOuterMat;
    haloInnerMat = fallback.haloInnerMat;
    tailLightMat = fallback.tailLightMat;
    disposableMaterials = fallback.disposableMaterials;
    rootGroup.add(fallback.group);
  }

  // Mount the 3D Supercharged V8 Engine Assembly & Front Radiator Grille Portal inside the car
  const engineAssembly: EngineAssemblyInstance = createEngineAssembly();
  rootGroup.add(engineAssembly.group);
  rootGroup.add(engineAssembly.grillePortalGroup);

  const setPaintPreset = (presetId: PaintPresetId) => {
    const preset = PAINT_PRESETS.find((p) => p.id === presetId) || PAINT_PRESETS[0];
    bodyMaterial.color.setHex(preset.color);
    bodyMaterial.metalness = preset.metalness;
    bodyMaterial.roughness = preset.roughness;
    bodyMaterial.clearcoat = preset.clearcoat;
    bodyMaterial.needsUpdate = true;
  };

  /**
   * Updates the Challenger's physical forward travel, wheel spin, grille aperture passage,
   * and internal V8 engine disassembly/reassembly across Scenes 01–07.
   * Returns current car Z offset so the studio ground shadow tracks the vehicle.
   */
  const updateScrollState = (
    progress: number,
    elapsedTime: number,
    reducedMotion: boolean
  ): number => {
    const p = Math.max(0, Math.min(1, progress));

    // ==========================================================================
    // SCENE 01 & 02: PHYSICAL FORWARD CAR MOTION & WHEEL ROTATION
    // ==========================================================================
    // In Scene 01 (0.00 -> 0.12), car begins at Z = -2.35m in the studio depth and starts creeping forward.
    // In Scene 02 (0.12 -> 0.28), car accelerates toward the viewer to Z = +0.65m (total 3.00m roll).
    const creepDist = smoothstep(0.0, 0.12, p) * 0.45;
    const driveDist = smoothstep(0.12, 0.28, p) * 2.55;
    // In Scene 07 (0.86 -> 1.00), car settles cleanly at Z = 0.0m for the final studio stance
    const settleBack = smoothstep(0.86, 1.0, p) * 0.65;

    const totalForwardTravel = creepDist + driveDist;
    const carZ = -2.35 + totalForwardTravel - settleBack;
    rootGroup.position.z = carZ;

    // Subtle suspension pitch when accelerating forward in Scene 02
    const accelEnvelope =
      !reducedMotion
        ? smoothstep(0.11, 0.18, p) * (1 - smoothstep(0.23, 0.29, p))
        : 0;
    rootGroup.rotation.x = -accelEnvelope * 0.011;

    // Wheel radius is 0.387m -> angular rotation theta = distance / radius
    const wheelRadius = 0.387;
    const wheelSpinAngle = (totalForwardTravel - settleBack) / wheelRadius;

    // Straighten front wheels from parked show angle (0.00) to straight ahead as car rolls (0.14)
    const steerStraightFactor =
      smoothstep(0.05, 0.16, p) * (1 - smoothstep(0.90, 0.99, p));

    for (let i = 0; i < wheelRigs.length; i++) {
      const rig = wheelRigs[i];
      rig.spinGroup.rotation.x = wheelSpinAngle * rig.directionSign;
      if (rig.isFront) {
        rig.parentWheel.quaternion.slerpQuaternions(
          rig.initialQuat,
          rig.straightQuat,
          steerStraightFactor
        );
      }
    }

    // ==========================================================================
    // SCENE 03 -> 07: GRILLE PASSAGE & EXTERIOR SHELL CROSS-FADE
    // ==========================================================================
    // As camera flies through the front radiator grille (0.29 -> 0.36), open the solid outer grille texture
    // and fade the upper hood/shell polygons so the internal V8 assembly is unobstructed.
    // As camera exits back through the grille in Scene 07 (0.85 -> 0.91), restore 100% solid exterior.
    const interiorMask =
      smoothstep(0.28, 0.35, p) * (1 - smoothstep(0.85, 0.91, p));

    grillMaterials.forEach((gMat) => {
      if (interiorMask > 0.01) {
        gMat.transparent = true;
        gMat.opacity = Math.max(0.0, 1 - interiorMask * 1.15);
        gMat.depthWrite = gMat.opacity > 0.5;
      } else {
        gMat.transparent = false;
        gMat.opacity = 1.0;
        gMat.depthWrite = true;
      }
    });

    shellFadeMaterials.forEach((sMat) => {
      const mat = sMat as THREE.MeshStandardMaterial;
      if (interiorMask > 0.15) {
        mat.transparent = true;
        mat.opacity = Math.max(0.08, 1 - (interiorMask - 0.15) * 1.08);
        mat.depthWrite = mat.opacity > 0.65;
      } else {
        mat.transparent = false;
        mat.opacity = 1.0;
        mat.depthWrite = true;
      }
    });

    // Update internal Supercharged V8 Engine & Grille Portal
    engineAssembly.updateState(p, elapsedTime, reducedMotion);

    // ==========================================================================
    // DYNAMIC HEADLIGHT & TAILLIGHT INTENSITY
    // ==========================================================================
    const frontOpticsBoost =
      p > 0.10 && p < 0.36
        ? 1.55
        : p > 0.85
          ? 1.35
          : 1.0 + Math.sin(elapsedTime * 1.8) * 0.06;

    haloOuterMat.emissiveIntensity = 3.4 * frontOpticsBoost;
    haloInnerMat.emissiveIntensity = 3.1 * frontOpticsBoost;
    tailLightMat.emissiveIntensity = 2.8;

    return carZ;
  };

  const dispose = () => {
    engineAssembly.dispose();
    rootGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.geometry.dispose();
      }
    });
    disposableMaterials.forEach((m) => m.dispose());
  };

  return {
    rootGroup,
    isExternalModel,
    setPaintPreset,
    updateScrollState,
    dispose,
  };
}
