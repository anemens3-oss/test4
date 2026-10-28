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

/**
 * Generates a realistic, minimalist black asphalt road texture with crisp white edge lines
 * and a dashed center lane marking that converges toward the central vanishing point.
 */
function createRoadTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, 1024, 2048);

    // Asphalt road body (occupies center 86% of width with clean anti-aliased shoulders)
    const roadLeft = 72;
    const roadRight = 952;
    const roadWidth = roadRight - roadLeft;

    ctx.fillStyle = '#111318';
    ctx.fillRect(roadLeft, 0, roadWidth, 2048);

    // Subtle asphalt micro-grain along the surface
    ctx.fillStyle = 'rgba(255, 255, 255, 0.022)';
    for (let i = 0; i < 3200; i++) {
      const gx = roadLeft + ((i * 269) % roadWidth);
      const gy = (i * 613) % 2048;
      ctx.fillRect(gx, gy, 2, 3);
    }

    // Subtle tire track sheen in left and right lanes
    const leftLaneGrad = ctx.createLinearGradient(roadLeft, 0, roadRight, 0);
    leftLaneGrad.addColorStop(0, 'rgba(0,0,0,0.35)');
    leftLaneGrad.addColorStop(0.25, 'rgba(255,255,255,0.03)');
    leftLaneGrad.addColorStop(0.5, 'rgba(0,0,0,0.18)');
    leftLaneGrad.addColorStop(0.75, 'rgba(255,255,255,0.03)');
    leftLaneGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = leftLaneGrad;
    ctx.fillRect(roadLeft, 0, roadWidth, 2048);

    // Crisp continuous white outer shoulder markings
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(roadLeft + 26, 0, 14, 2048);
    ctx.fillRect(roadRight - 40, 0, 14, 2048);

    // Crisp dashed center dividing line along X = 0
    const centerX = 512 - 7;
    const dashPeriod = 128;
    const dashLen = 68;
    for (let y = 0; y < 2048; y += dashPeriod) {
      ctx.fillRect(centerX, y + 16, 14, dashLen);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 5);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createCarScene(): CarSceneController {
  let containerEl: HTMLElement | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let envTexture: THREE.Texture | null = null;
  let carInstance: CarModelInstance | null = null;

  let roadMesh: THREE.Mesh | null = null;
  let roadGeo: THREE.BufferGeometry | null = null;
  let roadMat: THREE.MeshStandardMaterial | null = null;
  let roadTex: THREE.CanvasTexture | null = null;

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

  const currentCamPos = new THREE.Vector3(2.15, 1.12, -0.45);
  const targetCamPos = new THREE.Vector3(2.15, 1.12, -0.45);
  const currentLookAt = new THREE.Vector3(0.0, 0.58, -5.45);
  const targetLookAt = new THREE.Vector3(0.0, 0.58, -5.45);

  const darkStudioColor = new THREE.Color(0x08090c);
  const whiteRoadSceneColor = new THREE.Color(0xf4f5f7);
  const engineBayDarkColor = new THREE.Color(0x07090e);
  const workingBgColor = new THREE.Color(0x08090c);

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

    // Dedicated FOV for mobile portrait (360px, 390px, 430px), tablet (768px), and desktop
    if (aspect < 0.62) {
      camera.fov = 52;
    } else if (aspect < 1.0) {
      camera.fov = 45;
    } else {
      camera.fov = 36;
    }
    camera.updateProjectionMatrix();
  };

  /**
   * Accelerated Desktop Keyframes across the 0.00 -> 1.00 scroll timeline:
   * - 0.00 -> 0.03: Instant transition to white scene with black perspective road
   * - 0.005 -> 0.19 (~18%): Fast, energetic Challenger approach along the black road (Z = -5.80m -> +1.00m)
   * - 0.19 -> 0.28 (~9%): Rapid camera flight straight through the radiator grille into engine bay
   * - 0.28 -> 0.34 (~6%): Immediate engine reveal & escalating mechanical vibration
   * - 0.34 -> 0.56 (~22%): Fast, dramatic 3D engine disassembly into recognizable parts
   * - 0.62 -> 0.78 (~16%): Rapid reverse reassembly of all engine components
   * - 0.78 -> 0.86 (~8%): Fast fly-out through grille back onto the road
   * - 0.86 -> 1.00 (~14%): Smooth handoff to Dark Studio & subsequent page sections
   */
  const desktopKeyframes: {
    at: number;
    pos: [number, number, number];
    look: [number, number, number];
  }[] = [
    { at: 0.00, pos: [2.15, 1.12, -0.45], look: [0.0, 0.58, -5.45] },
    { at: 0.03, pos: [0.0, 1.12, 4.10], look: [0.0, 0.62, -6.20] },
    { at: 0.11, pos: [0.0, 0.82, 4.04], look: [0.0, 0.63, -1.20] },
    { at: 0.19, pos: [0.0, 0.64, 3.96], look: [0.0, 0.64, 2.18] },
    { at: 0.24, pos: [0.0, 0.64, 3.24], look: [0.0, 0.64, 2.18] },
    { at: 0.28, pos: [0.0, 0.68, 2.84], look: [0.0, 0.64, 2.18] },
    { at: 0.34, pos: [0.08, 0.72, 2.88], look: [0.0, 0.64, 2.18] },
    { at: 0.45, pos: [0.26, 0.80, 3.12], look: [0.0, 0.64, 2.16] },
    { at: 0.56, pos: [-0.22, 0.78, 3.16], look: [0.0, 0.63, 2.16] },
    { at: 0.78, pos: [0.0, 0.65, 2.88], look: [0.0, 0.64, 2.18] },
    { at: 0.86, pos: [0.0, 0.76, 4.10], look: [0.0, 0.60, 0.40] },
    { at: 1.00, pos: [-2.35, 1.12, 3.35], look: [0.0, 0.54, -1.20] },
  ];

  /**
   * Accelerated Mobile Portrait Keyframes (360px, 390px, 430px, 768px):
   * - Even snappier phase timings so the entire story completes effortlessly in 1.5–2 screens of touch scroll.
   * - 0.005 -> 0.17: Fast road approach
   * - 0.17 -> 0.26: Rapid flight through radiator grille
   * - 0.26 -> 0.31: Engine reveal & punchy vibration
   * - 0.31 -> 0.52: Energetic V8 disassembly
   * - 0.58 -> 0.75: Fast reassembly
   * - 0.75 -> 1.00: Rapid exit through grille & handoff to content sections
   */
  const mobileKeyframes: {
    at: number;
    pos: [number, number, number];
    look: [number, number, number];
  }[] = [
    { at: 0.00, pos: [1.75, 1.32, 1.25], look: [0.0, 0.52, -5.60] },
    { at: 0.03, pos: [0.0, 1.28, 4.80], look: [0.0, 0.56, -6.20] },
    { at: 0.10, pos: [0.0, 0.94, 4.62], look: [0.0, 0.60, -1.20] },
    { at: 0.17, pos: [0.0, 0.64, 4.22], look: [0.0, 0.64, 2.18] },
    { at: 0.22, pos: [0.0, 0.64, 3.24], look: [0.0, 0.64, 2.18] },
    { at: 0.26, pos: [0.0, 0.70, 3.04], look: [0.0, 0.64, 2.18] },
    { at: 0.31, pos: [0.06, 0.74, 3.10], look: [0.0, 0.64, 2.18] },
    { at: 0.42, pos: [0.18, 0.82, 3.44], look: [0.0, 0.64, 2.16] },
    { at: 0.52, pos: [-0.16, 0.80, 3.48], look: [0.0, 0.63, 2.16] },
    { at: 0.75, pos: [0.0, 0.65, 3.04], look: [0.0, 0.64, 2.18] },
    { at: 0.85, pos: [0.0, 0.86, 4.58], look: [0.0, 0.58, 0.40] },
    { at: 1.00, pos: [-1.80, 1.26, 4.45], look: [0.0, 0.50, -1.20] },
  ];

  const sampleChoreography = (p: number): KeyframePose => {
    const clamped = Math.max(0, Math.min(1, p));
    const width = containerEl?.clientWidth || window.innerWidth;
    const height = containerEl?.clientHeight || window.innerHeight;
    const aspect = width / height;
    const isMobile = aspect < 1.0;

    const activeFrames = isMobile ? mobileKeyframes : desktopKeyframes;

    let idx = 0;
    for (let i = 0; i < activeFrames.length - 1; i++) {
      if (clamped >= activeFrames[i].at && clamped <= activeFrames[i + 1].at) {
        idx = i;
        break;
      }
    }

    const k0 = activeFrames[idx];
    const k1 = activeFrames[idx + 1];
    const span = Math.max(0.0001, k1.at - k0.at);
    const localT = (clamped - k0.at) / span;
    const smoothT = localT * localT * (3 - 2 * localT);

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

    // Extra aspect compensation for ultra-narrow phones (e.g. 360x800, aspect = 0.45)
    if (isMobile && aspect < 0.55) {
      const narrowPullback = 1.0 + (0.55 - aspect) * 0.65;
      const grillePassLock =
        smoothstep(0.16, 0.20, clamped) * (1 - smoothstep(0.24, 0.28, clamped));
      const effectivePull = THREE.MathUtils.lerp(narrowPullback, 1.0, grillePassLock);
      const offset = basePos.clone().sub(baseLook).multiplyScalar(effectivePull);
      basePos.copy(baseLook).add(offset);
    }

    return { pos: basePos, look: baseLook };
  };

  /**
   * Smoothly updates the intentional background color, fog, and black road visibility:
   * - 0.005 -> 0.035: Dark Studio (#08090c) rapidly transitions to Pure White Road Scene (#f4f5f7)
   * - 0.035 -> 0.19: White scene with minimalist black perspective road
   * - 0.19 -> 0.265: As camera flies through radiator grille, scene transitions to Dark Engine Bay (#07090e)
   * - 0.265 -> 0.78: Dark Engine Bay for high-contrast mechanical disassembly & reassembly
   * - 0.78 -> 0.85: Camera exits back through grille onto the road
   * - 0.89 -> 0.97: Smooth return to Dark Studio (#08090c) before regular website sections
   */
  const updateEnvironmentAndRoad = (p: number) => {
    if (!scene || !roadMat || !roadMesh || !shadowMat) return;

    const toWhiteRoad = smoothstep(0.005, 0.035, p);
    const toEngineBay = smoothstep(0.185, 0.26, p);
    const exitToRoad = smoothstep(0.78, 0.85, p);
    const backToDarkStudio = smoothstep(0.89, 0.97, p);

    // Compute current background color without any sudden flashes
    workingBgColor.copy(darkStudioColor);
    workingBgColor.lerp(whiteRoadSceneColor, toWhiteRoad);
    workingBgColor.lerp(engineBayDarkColor, toEngineBay);
    workingBgColor.lerp(whiteRoadSceneColor, exitToRoad);
    workingBgColor.lerp(darkStudioColor, backToDarkStudio);

    scene.background = workingBgColor;
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(workingBgColor);
    }

    // Road visibility: emerges with the white scene, hides while inside the engine bay, reappears on exit
    const roadAppear = smoothstep(0.005, 0.035, p);
    const roadHideInBay = 1 - smoothstep(0.19, 0.255, p);
    const roadReappearOut = smoothstep(0.785, 0.85, p);
    const roadFadeEnd = 1 - smoothstep(0.90, 0.975, p);

    const roadAlpha = Math.max(
      roadAppear * roadHideInBay,
      roadReappearOut * roadFadeEnd
    );

    roadMesh.visible = roadAlpha > 0.005;
    roadMat.opacity = roadAlpha;

    // Ground contact shadow under the Challenger (visible whenever exterior car is visible)
    const carShadowAlpha = Math.max(1 - toEngineBay, exitToRoad);
    shadowMat.opacity = 0.88 * carShadowAlpha;
  };

  const initScene = async () => {
    if (!containerEl) return;
    const width = containerEl.clientWidth || window.innerWidth;
    const height = containerEl.clientHeight || window.innerHeight;
    const isMobileViewport = width < 768;

    scene = new THREE.Scene();
    scene.background = darkStudioColor.clone();
    scene.fog = new THREE.Fog(0x08090c, 16, 44);

    // Near plane 0.04m prevents any polygon clipping during the radiator grille flight
    camera = new THREE.PerspectiveCamera(36, width / height, 0.04, 55);
    updateCameraAspect();

    const initialPose = sampleChoreography(scrollProgress);
    currentCamPos.copy(initialPose.pos);
    targetCamPos.copy(initialPose.pos);
    currentLookAt.copy(initialPose.look);
    targetLookAt.copy(initialPose.look);
    camera.position.copy(currentCamPos);
    camera.lookAt(currentLookAt);

    renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    const maxDpr = isSoftwareGl ? 1 : isMobileViewport ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
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
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.0);
    keyLight.position.set(4.5, 6.4, 4.8);
    keyLight.castShadow = !isSoftwareGl && !isMobileViewport;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0004;
      keyLight.shadow.camera.near = 1.0;
      keyLight.shadow.camera.far = 20;
      keyLight.shadow.camera.left = -3.5;
      keyLight.shadow.camera.right = 3.5;
      keyLight.shadow.camera.top = 3.5;
      keyLight.shadow.camera.bottom = -3.5;
    }
    scene.add(keyLight);

    // 2. Cool Architectural Fill Light
    const fillLight = new THREE.DirectionalLight(0x93c5fd, 1.5);
    fillLight.position.set(-5.2, 3.8, 2.8);
    scene.add(fillLight);

    // 3. Warm Rim / Backlight
    const rimLight = new THREE.DirectionalLight(0xe04f26, 2.6);
    rimLight.position.set(-3.5, 3.4, -6.0);
    scene.add(rimLight);

    // 4. Front Grille & Engine Bay Key Spotlight
    const frontSpot = new THREE.SpotLight(0xffffff, 3.5, 16, Math.PI / 3, 0.6, 1.4);
    frontSpot.position.set(0, 3.2, 5.5);
    scene.add(frontSpot);

    // 5. Ambient Studio Hemisphere
    const hemiLight = new THREE.HemisphereLight(0x334155, 0x08090c, 1.25);
    scene.add(hemiLight);

    // 6. Minimalist Realistic Black Asphalt Road on the White Background
    roadTex = createRoadTexture(renderer.capabilities.getMaxAnisotropy());
    roadGeo = new THREE.PlaneGeometry(4.5, 58);
    roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.86,
      metalness: 0.06,
      transparent: true,
      opacity: 0.0,
      depthWrite: true,
    });
    roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0.0005, -18.0);
    roadMesh.receiveShadow = !isSoftwareGl && !isMobileViewport;
    roadMesh.visible = false;
    scene.add(roadMesh);

    // 7. Ground Contact Shadow under the Challenger (tracks carZ)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 512;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(128, 256, 20, 128, 256, 235);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
      grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.48)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 256, 512);
    }

    shadowTex = new THREE.CanvasTexture(shadowCanvas);
    shadowGeo = new THREE.PlaneGeometry(3.0, 5.9);
    shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.88,
    });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.0015, -5.80);
    scene.add(shadowMesh);

    // Load the real Dodge Challenger 3D model + internal V8 assembly (cached across resizes)
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
        const width = containerEl?.clientWidth || window.innerWidth;
        const height = containerEl?.clientHeight || window.innerHeight;
        const isMobile = width < 768 || width / height < 1.0;

        const pose = sampleChoreography(scrollProgress);

        // Subtle desktop mouse parallax ONLY in the initial studio stance (p < 0.015)
        // so road perspective and radiator grille entry stay 100% locked on axis.
        const allowParallax = !reducedMotion && !isMobile && scrollProgress < 0.015;
        const parallaxWeight = allowParallax ? 0.12 * (1 - scrollProgress / 0.015) : 0;

        smoothedPointer.lerp(pointerNorm, Math.min(1, delta * 6.0));

        targetCamPos.set(
          pose.pos.x + smoothedPointer.x * parallaxWeight,
          pose.pos.y - smoothedPointer.y * 0.04 * parallaxWeight,
          pose.pos.z
        );
        targetLookAt.copy(pose.look);

        if (reducedMotion) {
          currentCamPos.copy(targetCamPos);
          currentLookAt.copy(targetLookAt);
        } else {
          const damp = Math.min(1, delta * 15.0);
          currentCamPos.lerp(targetCamPos, damp);
          currentLookAt.lerp(targetLookAt, damp);
        }

        camera.position.copy(currentCamPos);
        camera.lookAt(currentLookAt);

        updateEnvironmentAndRoad(scrollProgress);

        const currentCarZ = carInstance.updateScrollState(
          scrollProgress,
          elapsed,
          reducedMotion,
          isMobile
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
      if (roadGeo) roadGeo.dispose();
      if (roadMat) roadMat.dispose();
      if (roadTex) roadTex.dispose();
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
