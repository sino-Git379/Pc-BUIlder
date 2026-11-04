import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Pre-configured DRACO and GLTF Loaders with cache
let sharedDracoLoader = null;
let sharedGltfLoader = null;
const modelCache = new Map();

export const getStaticAssetUrl = (path) => {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return import.meta.env.DEV ? `/${clean}` : `/static/${clean}`;
};

function getGltfLoader() {
  if (!sharedGltfLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(getStaticAssetUrl('draco/'));
    sharedDracoLoader.setDecoderConfig({ type: 'js' });
    sharedGltfLoader = new GLTFLoader();
    sharedGltfLoader.setDRACOLoader(sharedDracoLoader);
  }
  return sharedGltfLoader;
}

export const LIGHTING_MODES = [
  { id: 'cyan', name: 'Cyber Cyan', primaryColor: 0x00f0ff, secondaryColor: 0x0066ff },
  { id: 'magenta', name: 'Neon Magenta', primaryColor: 0xff007f, secondaryColor: 0x9900ff },
  { id: 'aurora', name: 'Aurora RGB', primaryColor: 0x00ffaa, secondaryColor: 0xff00aa, dynamic: true },
  { id: 'studio', name: 'Studio White', primaryColor: 0xffffff, secondaryColor: 0xddeeff },
  { id: 'stealth', name: 'Stealth Matte', primaryColor: 0x222630, secondaryColor: 0x111318 },
];

export const CAMERA_PRESETS = [
  { id: 'iso', name: 'Isometric 45°', pos: [5.2, 3.8, 6.8], target: [0, 0.1, 0] },
  { id: 'glass', name: 'Interior Glass View', pos: [0.1, 0.4, 6.4], target: [0, 0.2, 0] },
  { id: 'front', name: 'Front Intake', pos: [6.8, 0.3, 0.2], target: [0, 0, 0] },
  { id: 'top', name: 'Top-Down Hardware', pos: [0.1, 7.8, 0.2], target: [0, 0, 0] },
];

/**
 * Procedural & GLB Hybrid Interactive 3D PC Builder Viewport
 */
export default function Rig3DCanvas({
  selectedParts = {},
  modelPreset = 'custom', // 'custom' | 'gaming' | 'office' | 'sci-fi'
  explosion = 0, // 0.0 to 1.0
  lightingMode = 'cyan',
  showGlass = true,
  cameraPreset = 'iso',
  onSelectComponent = null,
  className = '',
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Three.js internal references
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const animFrameRef = useRef(null);

  // Group references
  const rootRigGroupRef = useRef(null);
  const slotsGroupRef = useRef({});
  const fanMeshesRef = useRef([]);
  const rgbMaterialsRef = useRef([]);

  // Transition / Animation states
  const transitionStatesRef = useRef({});
  const prevPartsRef = useRef({});
  const cameraTargetPosRef = useRef(null);
  const cameraTargetLookRef = useRef(null);

  // Hovered / Selected raycasting
  const [hoveredPart, setHoveredPart] = useState(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Current lighting profile
  const activeLighting = useMemo(
    () => LIGHTING_MODES.find((m) => m.id === lightingMode) || LIGHTING_MODES[0],
    [lightingMode]
  );

  /* =========================================================================
   * 1. Procedural High-Detail Component Geometry Builders
   * ========================================================================= */

  // Chassis / Case
  const createCaseMesh = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'slot_case';

    // Outer Frame (Dual-Chamber Mid-Tower ATX)
    const frameGeo = new THREE.BoxGeometry(2.4, 4.6, 4.8);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x16181f,
      metalness: 0.85,
      roughness: 0.25,
    });

    // Motherboard Tray (interior backplate)
    const trayGeo = new THREE.BoxGeometry(0.08, 4.1, 4.3);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x1c1f26,
      metalness: 0.8,
      roughness: 0.4,
    });
    const trayMesh = new THREE.Mesh(trayGeo, trayMat);
    trayMesh.position.set(-0.35, 0.1, 0);
    group.add(trayMesh);

    // Cable Grommets (silicone cable routing cutouts)
    const grommetGeo = new THREE.BoxGeometry(0.1, 0.8, 0.25);
    const grommetMat = new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.9 });
    const grommet1 = new THREE.Mesh(grommetGeo, grommetMat);
    grommet1.position.set(-0.34, 0.5, 1.2);
    const grommet2 = new THREE.Mesh(grommetGeo, grommetMat);
    grommet2.position.set(-0.34, -0.4, 1.2);
    group.add(grommet1, grommet2);

    // PSU Basement Shroud (bottom compartment)
    const shroudGeo = new THREE.BoxGeometry(2.35, 1.0, 4.7);
    const shroudMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      metalness: 0.75,
      roughness: 0.35,
    });
    const shroudMesh = new THREE.Mesh(shroudGeo, shroudMat);
    shroudMesh.position.set(0, -1.75, 0);
    group.add(shroudMesh);

    // Shroud Logo Plate
    const logoPlateGeo = new THREE.BoxGeometry(0.02, 0.25, 1.4);
    const logoPlateMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x003344 });
    rgbMaterialsRef.current.push(logoPlateMat);
    const logoPlate = new THREE.Mesh(logoPlateGeo, logoPlateMat);
    logoPlate.position.set(1.18, -1.65, 0.5);
    group.add(logoPlate);

    // Rear PCIe Expansion Brackets
    for (let i = 0; i < 7; i++) {
      const bracketGeo = new THREE.BoxGeometry(0.4, 0.14, 0.05);
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x242832, metalness: 0.9, roughness: 0.3 });
      const bracket = new THREE.Mesh(bracketGeo, bracketMat);
      bracket.position.set(0.1, -0.2 - i * 0.18, -2.36);
      group.add(bracket);
    }

    // Top Dust Filter / Radiator Mesh
    const topMeshGeo = new THREE.BoxGeometry(2.2, 0.05, 4.2);
    const topMeshMat = new THREE.MeshStandardMaterial({
      color: 0x14161c,
      metalness: 0.9,
      roughness: 0.4,
      wireframe: true,
    });
    const topMesh = new THREE.Mesh(topMeshGeo, topMeshMat);
    topMesh.position.set(0, 2.3, 0);
    group.add(topMesh);

    // Feet
    const footGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.15, 16);
    const footMat = new THREE.MeshStandardMaterial({ color: 0x0e1014, roughness: 0.8 });
    [
      [0.9, -2.35, 1.9],
      [-0.9, -2.35, 1.9],
      [0.9, -2.35, -1.9],
      [-0.9, -2.35, -1.9],
    ].forEach(([x, y, z]) => {
      const foot = new THREE.Mesh(footGeo, footMat);
      foot.position.set(x, y, z);
      group.add(foot);
    });

    // Tempered Glass Side Panel (Separate piece for exploded view & toggle)
    const glassGeo = new THREE.BoxGeometry(2.36, 4.4, 0.06);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xddeeff,
      transmission: 0.92,
      opacity: 0.35,
      transparent: true,
      roughness: 0.05,
      ior: 1.5,
      metalness: 0.1,
      reflectivity: 0.8,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(0, 0.05, 2.38);
    glassMesh.name = 'case_glass_panel';
    group.add(glassMesh);

    // Glass Thumbscrews
    const screwGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.08, 12);
    screwGeo.rotateX(Math.PI / 2);
    const screwMat = new THREE.MeshStandardMaterial({ color: 0x444b58, metalness: 0.9, roughness: 0.2 });
    [
      [1.05, 2.1, 2.42],
      [-1.05, 2.1, 2.42],
      [1.05, -1.15, 2.42],
      [-1.05, -1.15, 2.42],
    ].forEach(([x, y, z]) => {
      const screw = new THREE.Mesh(screwGeo, screwMat);
      screw.position.set(x, y, z);
      group.add(screw);
    });

    return group;
  }, []);

  // Motherboard
  const createMotherboardMesh = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'slot_motherboard';

    // ATX PCB (305mm x 244mm proportional)
    const pcbGeo = new THREE.BoxGeometry(0.04, 3.05, 2.44);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.5,
      metalness: 0.3,
    });
    const pcb = new THREE.Mesh(pcbGeo, pcbMat);
    group.add(pcb);

    // VRM Heatsinks (top & left of CPU socket)
    const vrmLeftGeo = new THREE.BoxGeometry(0.35, 1.2, 0.4);
    const vrmMat = new THREE.MeshStandardMaterial({
      color: 0x1f232b,
      metalness: 0.9,
      roughness: 0.25,
    });
    const vrmLeft = new THREE.Mesh(vrmLeftGeo, vrmMat);
    vrmLeft.position.set(0.18, 0.65, -0.85);

    const vrmTopGeo = new THREE.BoxGeometry(0.35, 0.38, 1.1);
    const vrmTop = new THREE.Mesh(vrmTopGeo, vrmMat);
    vrmTop.position.set(0.18, 1.25, -0.2);

    // RGB Accent Line on VRM Shield
    const rgbLineGeo = new THREE.BoxGeometry(0.37, 0.04, 0.9);
    const rgbLineMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
    });
    rgbMaterialsRef.current.push(rgbLineMat);
    const rgbLine = new THREE.Mesh(rgbLineGeo, rgbLineMat);
    rgbLine.position.set(0.19, 1.15, -0.2);

    group.add(vrmLeft, vrmTop, rgbLine);

    // AM5/LGA1700 Socket Base
    const socketBaseGeo = new THREE.BoxGeometry(0.08, 0.8, 0.75);
    const socketBaseMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.7, roughness: 0.3 });
    const socketBase = new THREE.Mesh(socketBaseGeo, socketBaseMat);
    socketBase.position.set(0.05, 0.6, -0.15);
    group.add(socketBase);

    // PCIe x16 Steel Armor Slot 1 (Primary GPU slot)
    const pcie1Geo = new THREE.BoxGeometry(0.12, 0.12, 1.7);
    const pcieArmorMat = new THREE.MeshStandardMaterial({ color: 0x8892a0, metalness: 0.95, roughness: 0.15 });
    const pcie1 = new THREE.Mesh(pcie1Geo, pcieArmorMat);
    pcie1.position.set(0.07, -0.35, -0.1);
    group.add(pcie1);

    // PCIe x16 Slot 2
    const pcie2 = pcie1.clone();
    pcie2.position.set(0.07, -0.95, -0.1);
    group.add(pcie2);

    // 4x DIMM RAM Slots
    for (let i = 0; i < 4; i++) {
      const dimmGeo = new THREE.BoxGeometry(0.08, 0.1, 1.45);
      const dimmMat = new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x16181f : 0x282e3c });
      const dimm = new THREE.Mesh(dimmGeo, dimmMat);
      dimm.position.set(0.05, 0.6, 0.5 + i * 0.18);
      group.add(dimm);
    }

    // Rear I/O Shield Cover (black brushed aluminum box)
    const ioShieldGeo = new THREE.BoxGeometry(0.45, 1.8, 0.45);
    const ioShieldMat = new THREE.MeshStandardMaterial({ color: 0x121418, metalness: 0.85, roughness: 0.3 });
    const ioShield = new THREE.Mesh(ioShieldGeo, ioShieldMat);
    ioShield.position.set(0.22, 0.4, -1.05);
    group.add(ioShield);

    // Chipset Heatsink with logo
    const chipsetGeo = new THREE.BoxGeometry(0.22, 0.75, 0.75);
    const chipsetMat = new THREE.MeshStandardMaterial({ color: 0x1e222a, metalness: 0.9, roughness: 0.2 });
    const chipset = new THREE.Mesh(chipsetGeo, chipsetMat);
    chipset.position.set(0.12, -0.9, 0.65);
    group.add(chipset);

    group.position.set(-0.3, 0.25, 0);
    return group;
  }, []);

  // Processor (CPU)
  const createCpuMesh = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'slot_cpu';

    // Metal Integrated Heat Spreader (IHS)
    const ihsGeo = new THREE.BoxGeometry(0.06, 0.6, 0.55);
    const ihsMat = new THREE.MeshStandardMaterial({
      color: 0xced6e0,
      metalness: 0.95,
      roughness: 0.15,
    });
    const ihs = new THREE.Mesh(ihsGeo, ihsMat);

    // Golden Substrate Board
    const substrateGeo = new THREE.BoxGeometry(0.02, 0.68, 0.63);
    const substrateMat = new THREE.MeshStandardMaterial({ color: 0x2d5a27, metalness: 0.3, roughness: 0.6 });
    const substrate = new THREE.Mesh(substrateGeo, substrateMat);
    substrate.position.set(-0.03, 0, 0);

    group.add(ihs, substrate);
    // Position inside the motherboard socket
    group.position.set(-0.21, 0.85, -0.15);
    return group;
  }, []);

  // CPU Cooler (Liquid AIO Cooler with Radiator & Fans or Tower Air Cooler)
  const createCoolerMesh = useCallback((compName = '') => {
    const group = new THREE.Group();
    group.name = 'slot_cooling';

    const isLiquid = !compName || /liquid|kraken|aio|rgb\s+360|water/i.test(compName);

    if (isLiquid) {
      // Cylindrical Liquid Pump Head with Infinity Mirror LCD
      const pumpGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.45, 32);
      pumpGeo.rotateZ(Math.PI / 2);
      const pumpMat = new THREE.MeshStandardMaterial({ color: 0x181a20, metalness: 0.8, roughness: 0.3 });
      const pump = new THREE.Mesh(pumpGeo, pumpMat);
      pump.position.set(-0.03, 0.85, -0.15);
      group.add(pump);

      // Glowing ARGB Ring on Pump face
      const ringGeo = new THREE.TorusGeometry(0.38, 0.04, 16, 32);
      ringGeo.rotateY(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.2,
      });
      rgbMaterialsRef.current.push(ringMat);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0.2, 0.85, -0.15);
      group.add(ring);

      // Coolant Tubes (curving up to top radiator)
      const curve1 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.03, 0.95, -0.05),
        new THREE.Vector3(0.3, 1.4, 0.2),
        new THREE.Vector3(0.2, 2.0, 0.6),
        new THREE.Vector3(0.0, 2.15, 0.9),
      ]);
      const tubeGeo1 = new THREE.TubeGeometry(curve1, 24, 0.055, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.7 });
      const tube1 = new THREE.Mesh(tubeGeo1, tubeMat);

      const curve2 = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.03, 0.75, -0.05),
        new THREE.Vector3(0.38, 1.35, 0.1),
        new THREE.Vector3(0.25, 1.95, 0.7),
        new THREE.Vector3(0.0, 2.15, 1.1),
      ]);
      const tubeGeo2 = new THREE.TubeGeometry(curve2, 24, 0.055, 8, false);
      const tube2 = new THREE.Mesh(tubeGeo2, tubeMat);
      group.add(tube1, tube2);

      // Top 360mm / 240mm Radiator
      const radGeo = new THREE.BoxGeometry(1.6, 0.35, 3.2);
      const radMat = new THREE.MeshStandardMaterial({ color: 0x121418, metalness: 0.9, roughness: 0.3 });
      const rad = new THREE.Mesh(radGeo, radMat);
      rad.position.set(0, 2.05, 0.2);
      group.add(rad);

      // 2x Radiator Fans mounted underneath
      [-0.6, 0.6].forEach((zOffset) => {
        const fanFrame = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.25, 1.15),
          new THREE.MeshStandardMaterial({ color: 0x1c1f26, roughness: 0.6 })
        );
        fanFrame.position.set(0, 1.75, zOffset + 0.2);

        // Spinning fan blades
        const bladeGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.05, 9);
        bladeGeo.rotateX(Math.PI / 2);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x004466,
          transparent: true,
          opacity: 0.85,
        });
        rgbMaterialsRef.current.push(bladeMat);
        const blades = new THREE.Mesh(bladeGeo, bladeMat);
        blades.position.set(0, 1.75, zOffset + 0.2);
        fanMeshesRef.current.push({ mesh: blades, axis: 'y', speed: 0.08 });
        group.add(fanFrame, blades);
      });
    } else {
      // Dual Tower Air Cooler (Dark Rock / Assassin style)
      const towerGeo = new THREE.BoxGeometry(1.1, 1.5, 1.2);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x222630, metalness: 0.9, roughness: 0.2, wireframe: false });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(0.45, 0.85, -0.15);

      // Copper Heatpipe caps
      for (let i = -2; i <= 2; i++) {
        const pipe = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8),
          new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.9 })
        );
        pipe.position.set(0.45, 1.62, -0.15 + i * 0.22);
        group.add(pipe);
      }
      group.add(tower);
    }

    return group;
  }, []);

  // Graphics Card (GPU)
  const createGpuMesh = useCallback((compName = '') => {
    const group = new THREE.Group();
    group.name = 'slot_gpu';

    // Length scales based on model tier (e.g. 4080/4090 vs 4060)
    const isHighEnd = /4080|4090|7800|7900|titan|super/i.test(compName);
    const gpuLength = isHighEnd ? 3.4 : 2.7;
    const gpuWidth = isHighEnd ? 1.45 : 1.25;

    // GPU Main Shroud (Black & gunmetal chamfered body)
    const shroudGeo = new THREE.BoxGeometry(gpuWidth, 0.65, gpuLength);
    const shroudMat = new THREE.MeshStandardMaterial({
      color: 0x181b22,
      metalness: 0.88,
      roughness: 0.22,
    });
    const shroud = new THREE.Mesh(shroudGeo, shroudMat);
    group.add(shroud);

    // Brushed Metal Backplate
    const backplateGeo = new THREE.BoxGeometry(gpuWidth + 0.04, 0.05, gpuLength);
    const backplateMat = new THREE.MeshStandardMaterial({
      color: 0x2b303a,
      metalness: 0.92,
      roughness: 0.18,
    });
    const backplate = new THREE.Mesh(backplateGeo, backplateMat);
    backplate.position.set(0, 0.35, 0);
    group.add(backplate);

    // Heatsink Fin Stack (visible aluminum fin array)
    const finsGeo = new THREE.BoxGeometry(gpuWidth - 0.1, 0.45, gpuLength - 0.3);
    const finsMat = new THREE.MeshStandardMaterial({
      color: 0x6e7888,
      metalness: 0.95,
      roughness: 0.2,
      wireframe: true,
    });
    const fins = new THREE.Mesh(finsGeo, finsMat);
    group.add(fins);

    // Triple / Dual Axial Fans on bottom face
    const fanCount = isHighEnd ? 3 : 2;
    const spacing = (gpuLength - 0.8) / (fanCount - 1);
    const startZ = -(gpuLength - 0.8) / 2;

    for (let i = 0; i < fanCount; i++) {
      const fanZ = startZ + i * spacing;
      const ringGeo = new THREE.TorusGeometry(0.42, 0.03, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({ color: 0x2e3440 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(0, -0.34, fanZ);

      // Blades
      const bladeGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.03, 9);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.3 });
      const blades = new THREE.Mesh(bladeGeo, bladeMat);
      blades.position.set(0, -0.34, fanZ);
      fanMeshesRef.current.push({ mesh: blades, axis: 'y', speed: 0.09 });

      group.add(ring, blades);
    }

    // Side Glowing Logo Strip ("GEFORCE RTX / RADEON")
    const sideLogoGeo = new THREE.BoxGeometry(0.04, 0.18, 1.3);
    const sideLogoMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.1,
    });
    rgbMaterialsRef.current.push(sideLogoMat);
    const sideLogo = new THREE.Mesh(sideLogoGeo, sideLogoMat);
    sideLogo.position.set(gpuWidth / 2 + 0.02, 0.05, 0.1);
    group.add(sideLogo);

    // 12VHPWR Power Cable connector on top edge
    const cableConnectorGeo = new THREE.BoxGeometry(0.2, 0.15, 0.35);
    const cableConnectorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.9 });
    const connector = new THREE.Mesh(cableConnectorGeo, cableConnectorMat);
    connector.position.set(gpuWidth / 2 - 0.15, 0.35, 0.8);
    group.add(connector);

    // Rear PCIe Bracket
    const bracketGeo = new THREE.BoxGeometry(0.1, 0.7, 0.06);
    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x8892a0, metalness: 0.95 });
    const bracket = new THREE.Mesh(bracketGeo, bracketMat);
    bracket.position.set(0, 0, -gpuLength / 2 - 0.03);
    group.add(bracket);

    // Position seated in PCIe Slot 1:
    // Slot is at -0.3 + 0.07 = -0.23 X, -0.1 Y, -0.1 Z
    group.position.set(0.35, -0.1, 0.2);
    return group;
  }, []);

  // RAM Memory (2x or 4x modules with top ARGB Lightbar)
  const createRamMesh = useCallback((compName = '') => {
    const group = new THREE.Group();
    group.name = 'slot_memory';

    const slotIndices = [1, 3]; // Dual-channel slots 2 and 4
    slotIndices.forEach((slotIdx) => {
      const zPos = 0.5 + slotIdx * 0.18;

      // Aluminum Heat Spreader Stick
      const stickGeo = new THREE.BoxGeometry(0.05, 0.75, 1.4);
      const stickMat = new THREE.MeshStandardMaterial({
        color: 0x1f232b,
        metalness: 0.88,
        roughness: 0.2,
      });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(0, 0, zPos);

      // Top ARGB Light Diffuser Bar
      const lightbarGeo = new THREE.BoxGeometry(0.065, 0.1, 1.42);
      const lightbarMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.0,
      });
      rgbMaterialsRef.current.push(lightbarMat);
      const lightbar = new THREE.Mesh(lightbarGeo, lightbarMat);
      lightbar.position.set(0, 0.4, zPos);

      group.add(stick, lightbar);
    });

    group.position.set(-0.25, 0.85, 0);
    return group;
  }, []);

  // Storage (M.2 NVMe SSD Heatsink)
  const createStorageMesh = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'slot_storage';

    // M.2 2280 Heatsink
    const ssdGeo = new THREE.BoxGeometry(0.12, 0.06, 0.85);
    const ssdMat = new THREE.MeshStandardMaterial({
      color: 0x20242d,
      metalness: 0.9,
      roughness: 0.25,
    });
    const ssd = new THREE.Mesh(ssdGeo, ssdMat);

    // Laser logo badge
    const badgeGeo = new THREE.BoxGeometry(0.13, 0.02, 0.4);
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x003344 });
    rgbMaterialsRef.current.push(badgeMat);
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 0.035, 0);

    group.add(ssd, badge);
    group.position.set(-0.24, 0.2, 0.2);
    return group;
  }, []);

  // Power Supply (PSU)
  const createPsuMesh = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'slot_psu';

    // ATX PSU Block
    const psuGeo = new THREE.BoxGeometry(1.6, 0.86, 1.8);
    const psuMat = new THREE.MeshStandardMaterial({
      color: 0x15181e,
      metalness: 0.8,
      roughness: 0.4,
    });
    const psu = new THREE.Mesh(psuGeo, psuMat);

    // Rear AC socket & rocker switch
    const switchGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1);
    const switchMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0e, roughness: 0.8 });
    const sw = new THREE.Mesh(switchGeo, switchMat);
    sw.position.set(0, 0.1, -0.91);

    // Modular cable bunch emerging from front
    const cableGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.6, 12);
    cableGeo.rotateX(Math.PI / 2);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 0.9 });
    const cables = new THREE.Mesh(cableGeo, cableMat);
    cables.position.set(0, 0, 1.1);

    group.add(psu, sw, cables);
    group.position.set(0, -1.75, -1.0);
    return group;
  }, []);

  // Chassis ARGB Fans (3x Front, 1x Rear)
  const createChassisFans = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'chassis_fans';

    // 3x Front Intake Fans (120mm each stacked vertically)
    for (let i = 0; i < 3; i++) {
      const y = -0.7 + i * 1.1;
      const fanHousing = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.95, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.5 })
      );
      fanHousing.position.set(1.15, y, 0);

      // ARGB Fan Ring
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.04, 12, 24),
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 1.0,
        })
      );
      ring.rotateY(Math.PI / 2);
      ring.position.set(1.18, y, 0);
      rgbMaterialsRef.current.push(ring.material);

      // Spinning blades
      const blades = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.04, 9),
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x003344,
          transparent: true,
          opacity: 0.75,
        })
      );
      blades.rotateZ(Math.PI / 2);
      blades.position.set(1.18, y, 0);
      rgbMaterialsRef.current.push(blades.material);
      fanMeshesRef.current.push({ mesh: blades, axis: 'x', speed: 0.08 });

      group.add(fanHousing, ring, blades);
    }

    // 1x Rear Exhaust Fan
    const rearHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.95, 0.95),
      new THREE.MeshStandardMaterial({ color: 0x1a1d24, roughness: 0.5 })
    );
    rearHousing.position.set(0.1, 0.8, -2.25);

    const rearBlades = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.38, 0.04, 9),
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x003344,
        transparent: true,
        opacity: 0.75,
      })
    );
    rearBlades.rotateX(Math.PI / 2);
    rearBlades.position.set(0.1, 0.8, -2.22);
    rgbMaterialsRef.current.push(rearBlades.material);
    fanMeshesRef.current.push({ mesh: rearBlades, axis: 'z', speed: 0.08 });

    group.add(rearHousing, rearBlades);
    return group;
  }, []);

  /* =========================================================================
   * 2. Three.js Scene Setup & Initialization
   * ========================================================================= */

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1014);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    const initialPreset = CAMERA_PRESETS[0];
    camera.position.set(...initialPreset.pos);
    cameraRef.current = camera;

    // 3. Renderer with PBR tone mapping & soft shadows
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.2;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.target.set(...initialPreset.target);
    controlsRef.current = controls;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x181a20, 0.9);
    scene.add(hemiLight);

    // Directional Key Light (casting soft shadow on PC)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(6, 9, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Rim / Accent Light (Cool cyber blue / cyan)
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.4);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    // Internal Chassis ARGB Glow Light
    const internalLight = new THREE.PointLight(activeLighting.primaryColor, 2.0, 5.0);
    internalLight.position.set(0.2, 0.5, 0.2);
    internalLight.name = 'internal_argb_light';
    scene.add(internalLight);

    // Ground Grid with glow reflection
    const grid = new THREE.GridHelper(16, 32, 0x00f0ff, 0x222630);
    grid.position.y = -2.4;
    grid.material.opacity = 0.45;
    grid.material.transparent = true;
    scene.add(grid);

    // Root Assembly Group
    const rootRig = new THREE.Group();
    rootRig.name = 'rig_root_assembly';
    scene.add(rootRig);
    rootRigGroupRef.current = rootRig;

    // 6. Raycasting Interaction on pointer move / click
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handleClick = () => {
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(rootRig.children, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && obj.parent && !obj.name.startsWith('slot_') && obj !== rootRig) {
          obj = obj.parent;
        }
        if (obj && obj.name.startsWith('slot_')) {
          const slotKey = obj.name.replace('slot_', '');
          if (onSelectComponent) {
            onSelectComponent(slotKey);
          }
        }
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);

    // 7. Animation Loop
    let lastTime = performance.now();

    const animateLoop = (time) => {
      animFrameRef.current = requestAnimationFrame(animateLoop);
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      // Spin fan blades
      fanMeshesRef.current.forEach(({ mesh, axis, speed }) => {
        if (mesh) {
          mesh.rotation[axis] += speed;
        }
      });

      // Dynamic Aurora RGB color cycle if active
      if (activeLighting.dynamic) {
        const hue = (time * 0.00015) % 1;
        const color = new THREE.Color().setHSL(hue, 1.0, 0.55);
        rgbMaterialsRef.current.forEach((mat) => {
          if (mat && mat.emissive) mat.emissive.copy(color);
        });
        const light = scene.getObjectByName('internal_argb_light');
        if (light) light.color.copy(color);
      }

      // Smooth camera preset interpolation
      if (cameraTargetPosRef.current) {
        camera.position.lerp(cameraTargetPosRef.current, 0.06);
        controls.target.lerp(cameraTargetLookRef.current, 0.06);
        if (camera.position.distanceTo(cameraTargetPosRef.current) < 0.05) {
          cameraTargetPosRef.current = null;
          cameraTargetLookRef.current = null;
        }
      }

      // Smooth Slot Installation Animation (Scale 0 -> 1 with Easing)
      Object.keys(transitionStatesRef.current).forEach((slot) => {
        const state = transitionStatesRef.current[slot];
        if (!state) return;

        const group = slotsGroupRef.current[slot];
        if (!group) return;

        state.progress = Math.min(1.0, state.progress + delta * (1.0 / state.duration));

        if (state.type === 'enter') {
          // Elastic / Cubic ease-out
          const t = state.progress;
          const easeOut = 1 - Math.pow(1 - t, 3);
          group.scale.set(easeOut, easeOut, easeOut);
          // Position slide in
          if (state.startPos) {
            group.position.lerpVectors(state.startPos, state.targetPos, easeOut);
          }
          if (state.progress >= 1.0) {
            group.scale.set(1, 1, 1);
            if (state.targetPos) group.position.copy(state.targetPos);
            delete transitionStatesRef.current[slot];
          }
        } else if (state.type === 'exit') {
          // Fade / scale out
          const easeIn = Math.pow(state.progress, 2);
          const s = Math.max(0.0001, 1 - easeIn);
          group.scale.set(s, s, s);
          if (state.progress >= 1.0) {
            group.visible = false;
            group.scale.set(0, 0, 0);
            delete transitionStatesRef.current[slot];
            if (state.onComplete) state.onComplete();
          }
        }
      });

      // Hover Raycast detection for interactive highlighting
      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(rootRig.children, true);
      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && obj.parent && !obj.name.startsWith('slot_') && obj !== rootRig) {
          obj = obj.parent;
        }
        if (obj && obj.name.startsWith('slot_')) {
          const slot = obj.name.replace('slot_', '');
          if (hoveredPart !== slot) setHoveredPart(slot);
        }
      } else if (hoveredPart !== null) {
        setHoveredPart(null);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animateLoop);

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  /* =========================================================================
   * 3. Lighting Color Updates
   * ========================================================================= */

  useEffect(() => {
    if (!sceneRef.current) return;
    const color = new THREE.Color(activeLighting.primaryColor);
    const secColor = new THREE.Color(activeLighting.secondaryColor);

    rgbMaterialsRef.current.forEach((mat) => {
      if (mat) {
        if (mat.color) mat.color.copy(color);
        if (mat.emissive) mat.emissive.copy(color);
      }
    });

    const internalLight = sceneRef.current.getObjectByName('internal_argb_light');
    if (internalLight) {
      internalLight.color.copy(color);
    }
  }, [activeLighting]);

  /* =========================================================================
   * 4. Camera Preset Changes
   * ========================================================================= */

  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === cameraPreset) || CAMERA_PRESETS[0];
    cameraTargetPosRef.current = new THREE.Vector3(...preset.pos);
    cameraTargetLookRef.current = new THREE.Vector3(...preset.target);
  }, [cameraPreset]);

  /* =========================================================================
   * 5. Exploded Disassembly View Calculations
   * ========================================================================= */

  useEffect(() => {
    const exp = Math.max(0, Math.min(1, explosion));
    const slots = slotsGroupRef.current;
    if (!slots) return;

    // Explode glass panel outward along +Z
    const glass = rootRigGroupRef.current?.getObjectByName('case_glass_panel');
    if (glass) {
      glass.position.z = 2.38 + exp * 2.2;
    }

    // Explode GPU outward along +Z and +X
    if (slots.gpu) {
      slots.gpu.position.z = 0.2 + exp * 1.8;
      slots.gpu.position.x = 0.35 + exp * 0.9;
    }

    // Explode CPU Cooler outward along +Z and +Y
    if (slots.cooling) {
      slots.cooling.position.z = exp * 1.6;
      slots.cooling.position.y = exp * 0.8;
    }

    // Explode RAM upward along +Y
    if (slots.memory) {
      slots.memory.position.y = 0.85 + exp * 1.4;
    }

    // Explode CPU upward along +X / +Z
    if (slots.cpu) {
      slots.cpu.position.x = -0.21 + exp * 0.9;
    }

    // Explode Motherboard backward along -X
    if (slots.motherboard) {
      slots.motherboard.position.x = -0.3 - exp * 0.7;
    }

    // Explode PSU forward / down along -Z / -Y
    if (slots.psu) {
      slots.psu.position.z = -1.0 - exp * 1.2;
    }

    // Explode Storage upward
    if (slots.storage) {
      slots.storage.position.y = 0.2 + exp * 0.9;
    }
  }, [explosion]);

  /* =========================================================================
   * 6. Glass Panel Visibility Toggle
   * ========================================================================= */

  useEffect(() => {
    const glass = rootRigGroupRef.current?.getObjectByName('case_glass_panel');
    if (glass) {
      glass.visible = showGlass;
    }
  }, [showGlass]);

  /* =========================================================================
   * 7. Component Assembly & Replacement Logic with Animations
   * ========================================================================= */

  const triggerSlotAnimation = useCallback((slotKey, type, options = {}) => {
    transitionStatesRef.current[slotKey] = {
      type,
      progress: 0,
      duration: options.duration || 0.42,
      startPos: options.startPos || null,
      targetPos: options.targetPos || null,
      onComplete: options.onComplete || null,
    };
  }, []);

  // Update or reload 3D Model Preset or Procedural Rig
  useEffect(() => {
    const rootRig = rootRigGroupRef.current;
    if (!rootRig) return;

    // Reset fan & material tracking
    fanMeshesRef.current = [];
    rgbMaterialsRef.current = [];
    transitionStatesRef.current = {};

    // Clear old children safely
    while (rootRig.children.length > 0) {
      const child = rootRig.children[0];
      rootRig.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }

    slotsGroupRef.current = {};

    // Case 1: Pre-built GLB models from maga76/drf_exam3 ('gaming', 'office', 'sci-fi')
    if (modelPreset !== 'custom') {
      setLoadingModel(true);
      const glbPath = getStaticAssetUrl(`models/${modelPreset}.glb`);

      const loader = getGltfLoader();
      loader.load(
        glbPath,
        (gltf) => {
          const model = gltf.scene;
          model.updateMatrixWorld(true);

          // Center & scale model to fit standard bounds
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5.0 / (maxDim || 1);
          model.scale.set(scale, scale, scale);

          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center.multiplyScalar(scale));

          // Enhance materials with PBR metallic & roughness
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.metalness = 0.85;
                child.material.roughness = 0.25;
              }
            }
          });

          rootRig.add(model);
          setLoadingModel(false);
        },
        undefined,
        (err) => {
          console.warn('Could not load GLB preset, fallback to procedural custom rig', err);
          setLoadingModel(false);
        }
      );
      return;
    }

    // Case 2: Procedural Rig Assembled from Live Database Parts
    const caseGroup = createCaseMesh();
    const fansGroup = createChassisFans();
    rootRig.add(caseGroup, fansGroup);
    slotsGroupRef.current['case'] = caseGroup;

    // Always include Motherboard
    const mbGroup = createMotherboardMesh();
    rootRig.add(mbGroup);
    slotsGroupRef.current['motherboard'] = mbGroup;

    // Always include PSU
    const psuGroup = createPsuMesh();
    rootRig.add(psuGroup);
    slotsGroupRef.current['psu'] = psuGroup;

    // Always include Storage
    const storageGroup = createStorageMesh();
    rootRig.add(storageGroup);
    slotsGroupRef.current['storage'] = storageGroup;

    // Add CPU if selected
    if (selectedParts.cpu) {
      const cpuGroup = createCpuMesh();
      rootRig.add(cpuGroup);
      slotsGroupRef.current['cpu'] = cpuGroup;
    }

    // Add Cooler if selected
    if (selectedParts.cooling) {
      const coolerGroup = createCoolerMesh(selectedParts.cooling?.name || '');
      rootRig.add(coolerGroup);
      slotsGroupRef.current['cooling'] = coolerGroup;
    }

    // Add GPU if selected
    if (selectedParts.gpu) {
      const gpuGroup = createGpuMesh(selectedParts.gpu?.name || '');
      rootRig.add(gpuGroup);
      slotsGroupRef.current['gpu'] = gpuGroup;
    }

    // Add RAM if selected
    if (selectedParts.memory) {
      const ramGroup = createRamMesh(selectedParts.memory?.name || '');
      rootRig.add(ramGroup);
      slotsGroupRef.current['memory'] = ramGroup;
    }
  }, [
    modelPreset,
    createCaseMesh,
    createChassisFans,
    createMotherboardMesh,
    createPsuMesh,
    createStorageMesh,
    createCpuMesh,
    createCoolerMesh,
    createGpuMesh,
    createRamMesh,
  ]);

  // Watch for component changes and trigger smooth entry / replacement animation
  useEffect(() => {
    if (modelPreset !== 'custom') return;
    const rootRig = rootRigGroupRef.current;
    if (!rootRig) return;

    const slots = ['gpu', 'cpu', 'memory', 'cooling', 'motherboard', 'case'];
    slots.forEach((slotKey) => {
      const currentPart = selectedParts[slotKey];
      const prevPart = prevPartsRef.current[slotKey];

      const currentId = currentPart ? (currentPart.id || currentPart.component?.id) : null;
      const prevId = prevPart ? (prevPart.id || prevPart.component?.id) : null;

      if (currentId && currentId !== prevId) {
        // Component was added or replaced!
        const existingMesh = slotsGroupRef.current[slotKey];

        const spawnNew = () => {
          let newMesh = null;
          let startPos = null;
          let targetPos = null;

          if (slotKey === 'gpu') {
            newMesh = createGpuMesh(currentPart.name || currentPart.component?.name || '');
            targetPos = new THREE.Vector3(0.35, -0.1, 0.2);
            startPos = new THREE.Vector3(0.35, 0.6, 0.8); // Slide down into PCIe
          } else if (slotKey === 'cpu') {
            newMesh = createCpuMesh();
            targetPos = new THREE.Vector3(-0.21, 0.85, -0.15);
            startPos = new THREE.Vector3(-0.21, 1.4, -0.15); // Drop down into socket
          } else if (slotKey === 'cooling') {
            newMesh = createCoolerMesh(currentPart.name || currentPart.component?.name || '');
            targetPos = new THREE.Vector3(0, 0, 0);
            startPos = new THREE.Vector3(0, 0.5, 0.8);
          } else if (slotKey === 'memory') {
            newMesh = createRamMesh(currentPart.name || currentPart.component?.name || '');
            targetPos = new THREE.Vector3(-0.25, 0.85, 0);
            startPos = new THREE.Vector3(-0.25, 1.6, 0); // Drop down into DIMM
          }

          if (newMesh) {
            rootRig.add(newMesh);
            slotsGroupRef.current[slotKey] = newMesh;
            triggerSlotAnimation(slotKey, 'enter', {
              duration: 0.45,
              startPos,
              targetPos,
            });
          }
        };

        if (existingMesh) {
          // Animate old component exit first
          triggerSlotAnimation(slotKey, 'exit', {
            duration: 0.25,
            onComplete: () => {
              rootRig.remove(existingMesh);
              spawnNew();
            },
          });
        } else {
          spawnNew();
        }
      }
    });

    prevPartsRef.current = { ...selectedParts };
  }, [selectedParts, modelPreset, createGpuMesh, createCpuMesh, createCoolerMesh, createRamMesh, triggerSlotAnimation]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* Three.js Canvas Element */}
      <canvas id="canvas3d" ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="font-code-sm text-xs font-semibold text-primary uppercase tracking-wider">
            Loading High-Detail 3D Mesh...
          </span>
        </div>
      )}

      {/* Interactive Hover HUD Pill */}
      {hoveredPart && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none px-3 py-1.5 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md border border-primary/40 shadow-xl flex items-center gap-2 animate-item-in">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="font-code-sm text-xs text-on-surface font-bold uppercase tracking-wider">
            {hoveredPart}: {selectedParts[hoveredPart]?.name || selectedParts[hoveredPart]?.component?.name || 'Installed'}
          </span>
          <span className="text-[10px] text-primary font-mono">[CLICK TO INSPECT]</span>
        </div>
      )}

      {/* Viewport Floating Watermark */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container-lowest/80 backdrop-blur-md border border-outline-variant/30 text-[11px] font-code-sm text-on-surface-variant">
        <span className="text-primary font-bold">● RIGFORGE 3D</span>
        <span>|</span>
        <span>PBR CAD ENGINE</span>
        <span>|</span>
        <span>{activeLighting.name}</span>
      </div>
    </div>
  );
}
