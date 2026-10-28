import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  loadChallengerModel,
  CarModelInstance,
  PaintPresetId,
} from './carModel';

export interface CarSceneCallbacks {
  onLoadProgress?: (percent: number) => void;
  onLoadComplete?: (isExternalModel: boolean) => void;
  onWebGLError?: (reason: string) => void;
}

export interface CarSceneController {
  mount: (container: HTMLElement, callbacks?: CarSceneCallbacks) => void;
  unmount: () => void;
  setProgress: (progress: number) => void;
  setPointerNormalized: (nx: number, ny: number) => void;
  setPaintPreset: (presetId: PaintPresetId) => void;
  setReducedMotion: (reduced: boolean) => void;
  resize: () => void;
}

interface KeyframePose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / Math.max(0.0001, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function createCarScene(): CarSceneController {
  let containerEl: HTMLElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let envTexture: THREE.Texture | null = null;
  let carInstance: CarModelInstance | null = null;
  let shadowMesh: THREE.Mesh | null = null;
  let shadowTex: THREE.CanvasTexture | null = null;
  let shadowGeo: THREE.BufferGeometry | null = null;
  let shadowMat: THREE.MeshBasicMaterial | null = null;

  let animFrameId = 0;
  let isUnmounted = false;
  let isContextLost = false;
  let reducedMotion = false;

  let scrollProgress = 0;
  const pointerNorm = new THREE.Vector2(0, 0);
  const smoothedPointer = new THREE.Vector2(0, 0);

  const currentCamPos = new THREE.Vector3(2.45, 1.08, 3.85);
  const targetCamPos = new THREE.Vector3(2.45, 1.08, 3.85);
  const currentLookAt = new THREE.Vector3(0.0, 0.62, -1.65);
  const targetLookAt = new THREE.Vector3(0.0, 0.62, -1.65);

  let sceneCallbacks: CarSceneCallbacks = {};

  // Software WebGL fallback detector
  const isSoftwareGl = (() => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  })();

  const updateCameraAspect = () => {
    if (!containerEl || !camera) return;
    const width = containerEl.clientWidth || window.innerWidth;
    const height = containerEl.clientHeight || window.innerHeight;
    const aspect = width / height;
    camera.aspect = aspect;

    // Responsive FOV tuned for mobile portrait (360x800, 390x844, 430x932), tablet, and desktop
    if (aspect < 0.65) {
      camera.fov = 50;
    } else if (aspect < 1.0) {
      camera.fov = 44;
    } else {
      camera.fov = 36;
    }
    camera.updateProjectionMatrix();
  };

  /**
   * 11 precision keyframes spanning the 7 continuous cinematic scroll scenes:
   * - Scene 01 (0.00 - 0.12): Prologue — Challenger in dark volumetric studio depth
   * - Scene 02 (0.12 - 0.28): Car physically drives forward toward the viewer with rotating wheels
   * - Scene 03 (0.28 - 0.40): Camera flies directly through the front radiator grille opening
   * - Scene 04 (0.40 - 0.55): Heart of the Machine — close-up orbit around working Supercharged V8
   * - Scene 05 (0.55 - 0.71): Engine explodes into 28 recognizable mechanical components & shards
   * - Scene 06 (0.71 - 0.85): Engine reassembles from shards back into the solid unit
   * - Scene 07 (0.85 - 1.00): Camera flies back out through the grille to a dramatic 3/4 exterior stance
   */
  const keyframes: {
    at: number;
    pos: [number, number, number];
    look: [number, number, number];
    interiorWeight: number;
  }[] = [
    // Scene 01: Prologue (Car at Z = -2.35m)
    { at: 0.00, pos: [2.35, 1.08, 3.75], look: [0.0, 0.58, -1.65], interiorWeight: 0.0 },
    { at: 0.12, pos: [1.52, 0.92, 3.42], look: [0.0, 0.60, -0.85], interiorWeight: 0.0 },

    // Scene 02: Car drives forward toward viewer (Car moves from Z = -1.90m to +0.65m)
    { at: 0.21, pos: [0.38, 0.74, 3.68], look: [0.0, 0.64, 1.45], interiorWeight: 0.15 },
    { at: 0.28, pos: [0.0, 0.65, 3.76], look: [0.0, 0.64, 1.83], interiorWeight: 0.85 },

    // Scene 03: Flight straight through the front radiator grille portal (at Z = 2.91m) into engine bay
    { at: 0.34, pos: [0.0, 0.65, 2.96], look: [0.0, 0.64, 1.83], interiorWeight: 1.0 },
    { at: 0.40, pos: [0.16, 0.72, 2.48], look: [0.0, 0.64, 1.83], interiorWeight: 1.0 },

    // Scene 04: Heart of the Machine — orbiting the working Supercharged V8 (center at Z = 1.83m)
    { at: 0.48, pos: [-0.44, 0.80, 2.38], look: [0.0, 0.64, 1.83], interiorWeight: 1.0 },
    { at: 0.55, pos: [-0.28, 0.85, 2.54], look: [0.0, 0.65, 1.83], interiorWeight: 1.0 },

    // Scene 05: Engine Explodes Into Components — camera pulls back and glides among suspended parts
    { at: 0.63, pos: [0.56, 0.95, 2.78], look: [0.0, 0.67, 1.80], interiorWeight: 1.0 },
    { at: 0.71, pos: [0.38, 0.86, 2.66], look: [0.0, 0.65, 1.82], interiorWeight: 1.0 },

    // Scene 06: Engine Reassembles From Shards — components lock back together
    { at: 0.79, pos: [-0.20, 0.73, 2.50], look: [0.0, 0.64, 1.83], interiorWeight: 1.0 },
    { at: 0.85, pos: [0.0, 0.65, 2.72], look: [0.0, 0.64, 1.83], interiorWeight: 1.0 },

    // Scene 07: Return Outside — camera exits back through radiator grille to studio 3/4 stance
    { at: 0.91, pos: [0.32, 0.76, 3.82], look: [0.0, 0.62, 0.85], interiorWeight: 0.2 },
    { at: 1.00, pos: [-2.95, 1.15, 3.85], look: [0.0, 0.54, 0.0], interiorWeight: 0.0 },
  ];

  const sampleChoreography = (p: number): KeyframePose => {
    const clamped = Math.max(0, Math.min(1, p));
    const width = containerEl?.clientWidth || window.innerWidth;
    const height = containerEl?.clientHeight || window.innerHeight;
    const aspect = width / height;
    const isMobile = aspect < 1.0;

    let idx = 0;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (clamped >= keyframes[i].at && clamped <= keyframes[i + 1].at) {
        idx = i;
        break;
      }
    }

    const k0 = keyframes[idx];
    const k1 = keyframes[idx + 1];
    const span = Math.max(0.0001, k1.at - k0.at);
    const localT = (clamped - k0.at) / span;
    const smoothT = localT * localT * (3 - 2 * localT);

    const interiorW = THREE.MathUtils.lerp(k0.interiorWeight, k1.interiorWeight, smoothT);

    const basePos = new THREE.Vector3(
      THREE.MathUtils.lerp(k0.pos[0], k1.pos[0], smoothT),
      THREE.MathUtils.lerp(k0.pos[1], k1.pos[1], smoothT),
      THREE.MathUtils.lerp(k0.pos[2], k1.pos[2], smoothT)
    );

    const baseLook = new THREE.Vector3(
      THREE.MathUtils.lerp(k0.look[0], k1.look[0], smoothT),
      THREE.MathUtils.lerp(k0.look[1], k1.look[1], smoothT),
      THREE.MathUtils.lerp(k0.look[2], k1.look[2], smoothT)
    );

    if (isMobile) {
      // Dedicated mobile camera framing:
      // 1. In exterior scenes (interiorW ~ 0), pull camera back along view ray so the full 5m Challenger
      //    never clips horizontally on 360px/390px/430px portrait screens.
      // 2. In interior engine scenes (interiorW ~ 1), pull back slightly (1.22x) from the engine center
      //    so the exploded V8 components stay completely inside the portrait frame without clipping the grille.
      const exteriorScale = Math.min(1.48, 1.0 + (1.0 - aspect) * 0.72);
      const interiorScale = Math.min(1.24, 1.0 + (1.0 - aspect) * 0.36);
      const effectiveScale = THREE.MathUtils.lerp(exteriorScale, interiorScale, interiorW);

      const viewOffset = basePos.clone().sub(baseLook).multiplyScalar(effectiveScale);
      basePos.copy(baseLook).add(viewOffset);

      // Keep grille passage strictly centered in X during Scene 03 & early Scene 07
      const grillePassMask =
        smoothstep(0.25, 0.31, clamped) * (1 - smoothstep(0.36, 0.41, clamped)) +
        smoothstep(0.83, 0.87, clamped) * (1 - smoothstep(0.90, 0.94, clamped));
      basePos.x *= 1 - Math.min(1, grillePassMask);
    }

    return { pos: basePos, look: baseLook };
  };

  const initScene = async () => {
    if (!containerEl) return;
    const width = containerEl.clientWidth || window.innerWidth;
    const height = containerEl.clientHeight || window.innerHeight;
    const isMobileViewport = width < 768;

    scene = new THREE.Scene();
    scene.background = null;

    // Small near plane (0.04m) ensures zero near-clipping when flying through the radiator grille
    camera = new THREE.PerspectiveCamera(36, width / height, 0.04, 45);
    updateCameraAspect();
    camera.position.copy(currentCamPos);

    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    const maxDpr = isSoftwareGl ? 1 : isMobileViewport ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl && !isMobileViewport;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      isContextLost = true;
      sceneCallbacks.onWebGLError?.('WebGL context lost');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      isContextLost = false;
    });

    containerEl.appendChild(canvas);

    // Studio IBL Reflection Environment
    const pmremGen = new THREE.PMREMGenerator(renderer);
    envTexture = pmremGen.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGen.dispose();

    // 1. Overhead Warm Studio Key Light
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.1);
    keyLight.position.set(4.5, 6.4, 4.8);
    keyLight.castShadow = !isSoftwareGl && !isMobileViewport;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.camera.near = 1.0;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -3.5;
      keyLight.shadow.camera.right = 3.5;
      keyLight.shadow.camera.top = 3.5;
      keyLight.shadow.camera.bottom = -3.5;
    }
    scene.add(keyLight);

    // 2. Cool Architectural Fill Light (Sculpts Challenger side character lines)
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.55);
    fillLight.position.set(-5.2, 3.8, 2.8);
    scene.add(fillLight);

    // 3. Warm Rim / Backlight (Separates fastback roofline from dark studio void)
    const rimLight = new THREE.DirectionalLight(0xe04f26, 2.8);
    rimLight.position.set(-3.5, 3.4, -5.2);
    scene.add(rimLight);

    // 4. Front Grille & Engine Bay Key Spotlight
    const frontSpot = new THREE.SpotLight(0xffffff, 3.6, 15, Math.PI / 3, 0.6, 1.4);
    frontSpot.position.set(0, 3.2, 5.4);
    scene.add(frontSpot);

    // 5. Ambient Studio Hemisphere
    const hemiLight = new THREE.HemisphereLight(0x2d3748, 0x08090c, 1.25);
    scene.add(hemiLight);

    // 6. Calibrated Ground Contact Shadow that tracks the Challenger's Z travel
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 512;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 256, 20, 128, 256, 235);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.90)');
      grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.54)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 512);
    }

    shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowGeo = new THREE.PlaneGeometry(3.1, 6.1);
    shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.004, -2.35);
    scene.add(shadowMesh);

    // Load the real Dodge Challenger 3D model + internal V8 assembly
    carInstance = await loadChallengerModel((pct) => {
      if (!isUnmounted) {
        sceneCallbacks.onLoadProgress?.(pct);
      }
    });

    if (isUnmounted) {
      carInstance.dispose();
      return;
    }

    scene.add(carInstance.rootGroup);
    sceneCallbacks.onLoadComplete?.(carInstance.isExternalModel);

    startLoop();
  };

  const startLoop = () => {
    const startTime = performance.now();
    let lastTime = startTime;

    const tick = (now: number) => {
      if (isUnmounted) return;
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      if (!isContextLost && renderer && scene && camera && carInstance) {
        const pose = sampleChoreography(scrollProgress);

        // Subtle desktop mouse parallax (disabled during exact grille passage so camera stays centered)
        const width = containerEl?.clientWidth || window.innerWidth;
        const allowParallax = !reducedMotion && width >= 768;
        const grilleLock =
          smoothstep(0.24, 0.30, scrollProgress) *
          (1 - smoothstep(0.36, 0.42, scrollProgress));
        const parallaxWeight = allowParallax ? 0.14 * (1 - grilleLock) : 0;

        smoothedPointer.lerp(pointerNorm, Math.min(1, delta * 5.0));

        targetCamPos.set(
          pose.pos.x + smoothedPointer.x * parallaxWeight,
          pose.pos.y - smoothedPointer.y * 0.05 * (1 - grilleLock),
          pose.pos.z
        );
        targetLookAt.copy(pose.look);

        if (reducedMotion) {
          currentCamPos.copy(targetCamPos);
          currentLookAt.copy(targetLookAt);
        } else {
          const damp = Math.min(1, delta * 6.5);
          currentCamPos.lerp(targetCamPos, damp);
          currentLookAt.lerp(targetLookAt, damp);
        }

        camera.position.copy(currentCamPos);
        camera.lookAt(currentLookAt);

        const currentCarZ = carInstance.updateScrollState(
          scrollProgress,
          elapsed,
          reducedMotion
        );
        if (shadowMesh) {
          shadowMesh.position.z = currentCarZ;
        }

        renderer.render(scene, camera);
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
  };

  return {
    mount: (container: HTMLElement, callbacks?: CarSceneCallbacks) => {
      containerEl = container;
      sceneCallbacks = callbacks || {};
      isUnmounted = false;
      initScene().catch((err) => {
        console.warn('3D scene initialization error:', err);
        sceneCallbacks.onWebGLError?.(String(err));
      });
    },
    unmount: () => {
      isUnmounted = true;
      cancelAnimationFrame(animFrameId);
      if (carInstance) {
        carInstance.dispose();
        carInstance = null;
      }
      if (shadowGeo) shadowGeo.dispose();
      if (shadowMat) shadowMat.dispose();
      if (shadowTex) shadowTex.dispose();
      if (envTexture) envTexture.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentElement) {
          renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
        renderer = null;
      }
      scene = null;
      camera = null;
    },
    setProgress: (progress: number) => {
      scrollProgress = Math.max(0, Math.min(1, progress));
    },
    setPointerNormalized: (nx: number, ny: number) => {
      pointerNorm.set(
        Math.max(-1, Math.min(1, nx)),
        Math.max(-1, Math.min(1, ny))
      );
    },
    setPaintPreset: (presetId: PaintPresetId) => {
      carInstance?.setPaintPreset(presetId);
    },
    setReducedMotion: (reduced: boolean) => {
      reducedMotion = reduced;
    },
    resize: () => {
      if (!containerEl || !renderer || !camera) return;
      const width = containerEl.clientWidth || window.innerWidth;
      const height = containerEl.clientHeight || window.innerHeight;
      updateCameraAspect();
      renderer.setSize(width, height);
    },
  };
}
