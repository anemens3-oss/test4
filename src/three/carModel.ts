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
  updateScrollState: (
    progress: number,
    elapsedTime: number,
    reducedMotion: boolean,
    isMobile: boolean
  ) => number;
  dispose: () => void;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Module-level cache so the GLB is only fetched and parsed once per session (never reloaded on resize)
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
  // Relative URL works both at root (/) and on GitHub Pages subfolder (/test4/)
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
 * so all 4 wheels rotate in exact sync with the vehicle's forward motion along the road.
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

    const childrenToMove = [...wheelNode.children];
    childrenToMove.forEach((ch) => {
      spinGroup.add(ch);
    });
    wheelNode.add(spinGroup);

    const initialQuat = wheelNode.quaternion.clone();
    // Counter-rotate the initial ~18 deg show steering angle so front wheels roll straight along the road
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

function upgradeChallengerMaterials(root: THREE.Object3D): {
  bodyMaterial: THREE.MeshPhysicalMaterial;
  grillMaterials: THREE.MeshStandardMaterial[];
  exteriorShellMeshes: THREE.Mesh[];
  haloOuterMat: THREE.MeshStandardMaterial;
  haloInnerMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  disposableMaterials: THREE.Material[];
} {
  const disposableMaterials: THREE.Material[] = [];
  const grillMaterials: THREE.MeshStandardMaterial[] = [];
  const exteriorShellMeshes: THREE.Mesh[] = [];

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
    exteriorShellMeshes.push(child);

    const origMat = child.material as THREE.MeshStandardMaterial | undefined;
    const matName = origMat?.name || '';

    switch (matName) {
      case 'Material.011':
        child.material = bodyMaterial;
        break;
      case 'Material.014':
        child.material = glassMaterial;
        break;
      case 'material':
        child.material = rimMaterial;
        break;
      case 'Material.003':
        child.material = rotorMaterial;
        break;
      case 'Material.010':
        child.material = caliperMaterial;
        break;
      case 'Material.021':
        child.material = haloOuterMat;
        break;
      case 'Material.020':
        child.material = haloInnerMat;
        break;
      case 'Material.015':
      case 'Material.004':
        child.material = tailLightMat;
        break;
      case 'Material.005':
        child.material = exhaustMaterial;
        break;
      case 'Material.017':
        child.material = mirrorLensMaterial;
        break;
      case 'Material.013':
        child.material = interiorMaterial;
        break;
      case 'Material.009':
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
        child.material = satinTrimMaterial;
        break;
    }
  });

  return {
    bodyMaterial,
    grillMaterials,
    exteriorShellMeshes,
    haloOuterMat,
    haloInnerMat,
    tailLightMat,
    disposableMaterials,
  };
}

function createFallbackChallenger(): {
  group: THREE.Group;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  exteriorShellMeshes: THREE.Mesh[];
  haloOuterMat: THREE.MeshStandardMaterial;
  haloInnerMat: THREE.MeshStandardMaterial;
  tailLightMat: THREE.MeshStandardMaterial;
  disposableMaterials: THREE.Material[];
} {
  const group = new THREE.Group();
  group.name = 'FallbackChallenger';
  const exteriorShellMeshes: THREE.Mesh[] = [];

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

  const hull = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.56, 4.92), bodyMaterial);
  hull.position.set(0, 0.58, 0);
  group.add(hull);
  exteriorShellMeshes.push(hull);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.42, 2.35), glassMat);
  cabin.position.set(0, 1.04, -0.22);
  group.add(cabin);
  exteriorShellMeshes.push(cabin);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.06, 0.28), trimMat);
  splitter.position.set(0, 0.26, 2.42);
  group.add(splitter);
  exteriorShellMeshes.push(splitter);

  return {
    group,
    bodyMaterial,
    exteriorShellMeshes,
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
  let exteriorShellMeshes: THREE.Mesh[] = [];
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

    // Center X/Z and place tires at y = 0.002m so they rest cleanly on top of the road surface
    const box = new THREE.Box3().setFromObject(gltfScene);
    const center = box.getCenter(new THREE.Vector3());

    gltfScene.position.x -= center.x;
    gltfScene.position.z -= center.z;
    gltfScene.position.y = -box.min.y + 0.002;
    gltfScene.updateMatrixWorld(true);

    const upgraded = upgradeChallengerMaterials(gltfScene);
    bodyMaterial = upgraded.bodyMaterial;
    grillMaterials = upgraded.grillMaterials;
    exteriorShellMeshes = upgraded.exteriorShellMeshes;
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
    exteriorShellMeshes = fallback.exteriorShellMeshes;
    haloOuterMat = fallback.haloOuterMat;
    haloInnerMat = fallback.haloInnerMat;
    tailLightMat = fallback.tailLightMat;
    disposableMaterials = fallback.disposableMaterials;
    rootGroup.add(fallback.group);
  }

  // Mount the 3D Supercharged V8 Engine Assembly & Grille Aperture Louvers
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

  const updateScrollState = (
    progress: number,
    elapsedTime: number,
    reducedMotion: boolean,
    isMobile: boolean
  ): number => {
    const p = Math.max(0, Math.min(1, progress));

    // ==========================================================================
    // PRIORITY 2 & 6: FAST, ENERGETIC FORWARD MOTION ALONG ROAD & WHEEL ROTATION
    // ==========================================================================
    // - At p = 0.00 (Dark Studio Prologue), car starts at Z = -5.80m.
    // - Immediately on scroll (p = 0.005 -> 0.19 desktop / 0.17 mobile), car surges
    //   forward (+Z) along the black road to Z = +1.00m (6.80m travel, X = 0.0)
    //   using an energetic ease-out curve with zero slow ramp-up.
    // - From p = 0.85 -> 0.98 (Final Return), car settles back to Z = -1.20m.
    const driveEnd = isMobile ? 0.17 : 0.19;
    const tDrive = Math.max(0, Math.min(1, (p - 0.005) / (driveEnd - 0.005)));
    const driveEase = 1 - Math.pow(1 - tDrive, 1.65);
    const driveForward = driveEase * 6.80;
    const returnSettle = smoothstep(0.85, 0.98, p) * 2.20;

    const netDisplacement = driveForward - returnSettle;
    const carZ = -5.80 + netDisplacement;
    rootGroup.position.set(0, 0, carZ);

    // Wheel radius is 0.387m -> angular rotation theta = distance / radius
    const wheelRadius = 0.387;
    const wheelSpinAngle = netDisplacement / wheelRadius;

    // Straighten front wheels immediately as the car launches (p: 0.005 -> 0.045)
    const steerStraightFactor =
      smoothstep(0.005, 0.045, p) * (1 - smoothstep(0.90, 0.97, p));

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
    // PRIORITY 3: RAPID GRILLE PASSAGE & EXTERIOR SHELL TRANSITION
    // ==========================================================================
    // As camera rapidly flies through the front radiator grille (0.19 -> 0.28 desktop,
    // 0.17 -> 0.26 mobile), open the front grille mesh and hide the outer car shell
    // once inside so the camera never clips solid body polygons.
    const grilleOpenStart = isMobile ? 0.165 : 0.185;
    const grilleOpenEnd = isMobile ? 0.225 : 0.245;
    const grilleCloseStart = isMobile ? 0.765 : 0.785;
    const grilleCloseEnd = isMobile ? 0.825 : 0.845;

    const grilleOpenFactor =
      smoothstep(grilleOpenStart, grilleOpenEnd, p) *
      (1 - smoothstep(grilleCloseStart, grilleCloseEnd, p));

    grillMaterials.forEach((gMat) => {
      if (grilleOpenFactor > 0.01) {
        gMat.transparent = true;
        gMat.opacity = Math.max(0, 1 - grilleOpenFactor * 1.15);
        gMat.depthWrite = gMat.opacity > 0.5;
      } else {
        gMat.transparent = false;
        gMat.opacity = 1.0;
        gMat.depthWrite = true;
      }
    });

    // Hide solid exterior car shell while camera is inside the engine bay
    const bayEnter = isMobile ? 0.245 : 0.265;
    const bayExit = isMobile ? 0.785 : 0.805;
    const insideEngineBay = p >= bayEnter && p <= bayExit;
    for (let i = 0; i < exteriorShellMeshes.length; i++) {
      exteriorShellMeshes[i].visible = !insideEngineBay;
    }

    // Update internal Supercharged V8 Engine & Grille Louvers
    engineAssembly.updateState(p, elapsedTime, reducedMotion, isMobile);

    // Dynamic Headlight Intensity
    const frontOpticsBoost =
      p > 0.01 && p < 0.26 ? 1.55 : 1.0 + Math.sin(elapsedTime * 1.8) * 0.05;
    haloOuterMat.emissiveIntensity = 3.4 * frontOpticsBoost;
    haloInnerMat.emissiveIntensity = 3.0 * frontOpticsBoost;
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
