# 3D Asset Credits & Licensing — APEX MOTORWORKS V2

This document records the origin, authorship, and license terms of the 3D vehicle asset and mechanical engine assembly integrated into the **APEX MOTORWORKS** website (`anemens3-oss/service4`).

---

## 1. Primary 3D Vehicle Model

- **Model Title:** Dodge Challenger (SRT Hellcat Body Configuration)
- **Original Author:** [OneSteven (Steven007)](https://sketchfab.com/Steven007)
- **Original Source URL:** [https://sketchfab.com/3d-models/dodge-challenger-ef40662c84eb4beb85acdfce5ac4f40e](https://sketchfab.com/3d-models/dodge-challenger-ef40662c84eb4beb85acdfce5ac4f40e)
- **Open Repository Mirror Used:** [https://github.com/fewwwww/hellcat.co/tree/master/public/dodge_challenger](https://github.com/fewwwww/hellcat.co/tree/master/public/dodge_challenger)
- **License:** [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](http://creativecommons.org/licenses/by-nc/4.0/)
- **Local Project Path:** `public/models/dodge_challenger.glb`

---

## 2. Under-Hood 6.2L Supercharged HEMI V8 Assembly & Grille Portal

- **Module Path:** `src/three/engineAssembly.ts`
- **License:** Original procedural Three.js engineering geometry created specifically for this project (MIT / Public Domain).
- **Components Included (28 separate 3D mechanical nodes + 260 instanced metallic shards):**
  - Front radiator grille aperture & structural engine bay shroud (`GrillePortalFrame`)
  - Deep-skirt V8 cast cylinder block with 8 machined cylinder bore sleeves
  - Forged crankshaft with counterweights, lower oil pan sump, and front timing chain cover
  - Left & Right machined aluminum cylinder heads with dual-color valve springs
  - Left & Right SRT anodized valve covers (`#c82514`) with coil pack rails
  - 8 individual forged pistons with wrist pins and H-beam connecting rods arranged at 90° V8 bank angles
  - 2.7L Twin-Screw Supercharger housing with internal twin rotors, finned intercooler lid, and front drive snout
  - Left & Right billet fuel rails, high-flow throttle body with conical intake filter, and Left & Right 4-into-1 tubular exhaust headers
  - 5 rotating billet pulleys (crank harmonic balancer, supercharger drive pulley, water pump, alternator, belt tensioner) + serpentine belt loop

---

## 3. Technical Processing & PBR Calibration Notes

1. **Format Optimization (`.gltf` + `.bin` + PNG textures → `.glb`):**
   - Packed lossless into a single self-contained binary glTF file (`public/models/dodge_challenger.glb`, ~1.99 MB) so that it loads in a single HTTP request and works reliably under GitHub Pages project subdirectories (`/service4/`).
2. **Coordinate & Wheel Kinematics Calibration (`src/three/carModel.ts`):**
   - Normalized to meter scale (`0.01`) and grounded flush onto the studio floor (`y = 0`).
   - All 4 wheel assemblies (`wheel`, `wheel.001`, `wheel.002`, `wheel.003`) are rigged around their local `X` axle (`radius = 0.387m`) so that forward vehicle displacement in Scene 02 rotates all four tires, rims, and brake discs in exact physical synchronization.
3. **Automotive Paint Calibration:**
   - Configured with `MeshPhysicalMaterial` (`metalness: 0.34–0.48`, `roughness: 0.18–0.24`, `clearcoat: 1.0`, `clearcoatRoughness: 0.05`) so diffuse body pigments remain rich and saturated under studio IBL lighting.
   - Includes 3 factory paint presets affecting exclusively `Material.011` (body shell):
     - **Заводской ярко-красный (`#c81d11`)** — Default
     - **Глубокий графитовый (`#363e4a`)**
     - **Насыщенный чёрный (`#0d0f14`)**

---

## Required Attribution Text

> "Dodge Challenger" (https://sketchfab.com/3d-models/dodge-challenger-ef40662c84eb4beb85acdfce5ac4f40e) by OneSteven (https://sketchfab.com/Steven007) is licensed under Creative Commons Attribution-NonCommercial 4.0 (http://creativecommons.org/licenses/by-nc/4.0/).
