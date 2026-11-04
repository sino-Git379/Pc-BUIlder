import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Pre-configured DRACO and GLTF Loaders with cache
let sharedDracoLoader = null;
let sharedGltfLoader = null;

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
  { id: 'stealth', name: 'Stealth Matte', primaryColor: 0x3b82f6, secondaryColor: 0x1d4ed8 },
];

export const CAMERA_PRESETS = [
  { id: 'iso', name: 'Изометрия 45°', pos: [5.3, 2.1, 4.7], target: [0, 0.05, 0] },
  { id: 'glass', name: 'Вид сбоку', pos: [5.9, 0.15, 0.05], target: [0, 0.1, 0] },
  { id: 'front', name: 'Вид спереди', pos: [2.1, 0.2, 6.1], target: [0, 0, 0] },
  { id: 'top', name: 'Вид сверху', pos: [2.8, 6.3, 0.1], target: [0, 0, 0] },
];

const SLOT_BASE_POSITIONS = {
  case: new THREE.Vector3(0, 0, 0),
  motherboard: new THREE.Vector3(-0.32, 0.32, -0.2),
  cpu: new THREE.Vector3(-0.23, 1.04, -0.35),
  cooling: new THREE.Vector3(0, 0, 0),
  memory: new THREE.Vector3(-0.15, 1.04, -0.2),
  gpu: new THREE.Vector3(0.32, 0.12, 0.05),
  storage: new THREE.Vector3(-0.22, 0.52, -0.15),
  psu: new THREE.Vector3(-0.22, -1.72, -1.15),
};

const SLOT_LABELS_RU = {
  case: 'Корпус ПК',
  motherboard: 'Материнская плата',
  cpu: 'Процессор',
  cooling: 'Охлаждение',
  memory: 'Оперативная память',
  gpu: 'Видеокарта',
  storage: 'SSD Накопитель',
  psu: 'Блок питания',
};

/**
 * Interactive 3D PC Builder Viewport (Three.js + PBR Materials + Reactive Cart Sync)
 */
export default function Rig3DCanvas({
  selectedParts = {},
  modelPreset = 'custom', // 'custom' | 'gaming' | 'office' | 'sci-fi'
  explosion = 0, // 0.0 to 1.0
  lightingMode = 'cyan',
  showGlass = true,
  cameraPreset = 'iso',
  compact = false,
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
  const exitingAnimsRef = useRef([]);
  const prevPartsRef = useRef({});
  const explosionRef = useRef(explosion);
  explosionRef.current = explosion;

  const cameraTargetPosRef = useRef(null);
  const cameraTargetLookRef = useRef(null);

  // Hovered / Selected raycasting
  const [hoveredPart, setHoveredPart] = useState(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2(-999, -999));

  // Current lighting profile
  const activeLighting = useMemo(
    () => LIGHTING_MODES.find((m) => m.id === lightingMode) || LIGHTING_MODES[0],
    [lightingMode]
  );
  const activeLightingRef = useRef(activeLighting);
  activeLightingRef.current = activeLighting;

  const registerRgbMaterial = useCallback((mat) => {
    const color = new THREE.Color(activeLightingRef.current.primaryColor);
    if (mat.color) mat.color.copy(color);
    if (mat.emissive) mat.emissive.copy(color);
    rgbMaterialsRef.current.push(mat);
    return mat;
  }, []);

  /* =========================================================================
   * 1. Procedural High-Detail Component Geometry Builders
   * ========================================================================= */

  // Chassis / Case (Dual-Chamber Panoramic ATX Mid-Tower)
  const createCaseMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_case';

      const isWhiteCase = /white|snow|ice|silver/i.test(compName);
      const bodyHex = isWhiteCase ? 0xd8dee9 : 0x151821;
      const interiorHex = isWhiteCase ? 0xb8c2d1 : 0x1b1f2a;

      const frameMat = new THREE.MeshStandardMaterial({
        color: bodyHex,
        metalness: 0.82,
        roughness: 0.28,
      });
      const interiorMat = new THREE.MeshStandardMaterial({
        color: interiorHex,
        metalness: 0.75,
        roughness: 0.38,
      });

      // Top & Bottom Structural Panels
      const topPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 4.8), frameMat);
      topPanel.position.set(0, 2.25, 0);
      topPanel.castShadow = true;
      topPanel.receiveShadow = true;

      const bottomPanel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 4.8), frameMat);
      bottomPanel.position.set(0, -2.24, 0);
      bottomPanel.receiveShadow = true;
      group.add(topPanel, bottomPanel);

      // Right Solid Side Panel (behind motherboard tray at -X)
      const rightSidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 4.5, 4.8), frameMat);
      rightSidePanel.position.set(-1.165, 0, 0);
      rightSidePanel.castShadow = true;
      rightSidePanel.receiveShadow = true;
      group.add(rightSidePanel);

      // Rear Chassis Wall (at -Z)
      const rearWall = new THREE.Mesh(new THREE.BoxGeometry(2.35, 4.5, 0.08), interiorMat);
      rearWall.position.set(0, 0, -2.36);
      group.add(rearWall);

      // 4 Vertical Corner Structural Pillars
      const pillarGeo = new THREE.BoxGeometry(0.11, 4.5, 0.11);
      [
        [1.14, 0, 2.34],
        [1.14, 0, -2.34],
        [-1.14, 0, 2.34],
        [-1.14, 0, -2.34],
      ].forEach(([x, y, z]) => {
        const pillar = new THREE.Mesh(pillarGeo, frameMat);
        pillar.position.set(x, y, z);
        group.add(pillar);
      });

      // Top & Bottom Left-Side Rails (framing the +X glass window)
      const railGeo = new THREE.BoxGeometry(0.09, 0.14, 4.68);
      const topRail = new THREE.Mesh(railGeo, frameMat);
      topRail.position.set(1.14, 2.18, 0);
      const botRail = new THREE.Mesh(railGeo, frameMat);
      botRail.position.set(1.14, -2.18, 0);
      group.add(topRail, botRail);

      // Motherboard Tray (interior backplate at X = -0.36)
      const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.65, 3.75), interiorMat);
      trayMesh.position.set(-0.36, 0.35, -0.2);
      trayMesh.receiveShadow = true;
      group.add(trayMesh);

      // Rubber Cable Routing Grommets on Motherboard Tray
      const grommetMat = new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.9 });
      [0.95, 0.05, -0.75].forEach((yPos) => {
        const grommet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.58, 0.24), grommetMat);
        grommet.position.set(-0.35, yPos, 1.22);
        group.add(grommet);
      });

      // PSU Basement Shroud (lower compartment)
      const shroudTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 4.65), interiorMat);
      shroudTop.position.set(-0.36, -1.22, 0);
      shroudTop.receiveShadow = true;

      const shroudSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 4.65), interiorMat);
      shroudSide.position.set(0.39, -1.72, 0);
      group.add(shroudTop, shroudSide);

      // Glowing ARGB Accent Strip along the PSU Shroud edge
      const shroudLedMat = registerRgbMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.95,
        })
      );
      const shroudLed = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 4.2), shroudLedMat);
      shroudLed.position.set(0.42, -1.25, 0);
      group.add(shroudLed);

      // Rear PCIe Expansion Slot Covers
      const bracketMat = new THREE.MeshStandardMaterial({ color: 0x2a303c, metalness: 0.9, roughness: 0.25 });
      for (let i = 0; i < 7; i++) {
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.05), bracketMat);
        bracket.position.set(0.15, 0.0 - i * 0.17, -2.33);
        group.add(bracket);
      }

      // Top Magnetic Dust Filter Mesh
      const topFilter = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.03, 3.9),
        new THREE.MeshStandardMaterial({ color: 0x0e1117, metalness: 0.85, roughness: 0.4, wireframe: true })
      );
      topFilter.position.set(0, 2.31, 0);
      group.add(topFilter);

      // 4 Case Feet with Chrome Rings
      const footGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.16, 20);
      const footMat = new THREE.MeshStandardMaterial({ color: 0x0d0f14, metalness: 0.6, roughness: 0.5 });
      [
        [0.9, -2.36, 1.95],
        [-0.9, -2.36, 1.95],
        [0.9, -2.36, -1.95],
        [-0.9, -2.36, -1.95],
      ].forEach(([x, y, z]) => {
        const foot = new THREE.Mesh(footGeo, footMat);
        foot.position.set(x, y, z);
        group.add(foot);
      });

      // Front Tempered Glass / Mesh Intake Panel (at +Z = 2.36)
      const frontGlass = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 4.3, 0.05),
        new THREE.MeshPhysicalMaterial({
          color: 0xddeeff,
          transmission: 0.86,
          opacity: 0.28,
          transparent: true,
          roughness: 0.08,
          metalness: 0.1,
        })
      );
      frontGlass.position.set(0, 0, 2.36);
      group.add(frontGlass);

      // Left Side Tempered Glass Panel (at +X = 1.18, facing viewer for interior inspection)
      const glassGroup = new THREE.Group();
      glassGroup.name = 'case_glass_panel';
      glassGroup.position.set(1.18, 0, 0);

      const sideGlass = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 4.25, 4.58),
        new THREE.MeshPhysicalMaterial({
          color: 0xddeeff,
          transmission: 0.92,
          opacity: 0.24,
          transparent: true,
          roughness: 0.05,
          ior: 1.5,
          metalness: 0.1,
          reflectivity: 0.85,
        })
      );
      glassGroup.add(sideGlass);

      // Thumbscrews on Side Glass Panel
      const screwGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 14);
      screwGeo.rotateZ(Math.PI / 2);
      const screwMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.92, roughness: 0.2 });
      [
        [0.03, 1.98, 2.12],
        [0.03, 1.98, -2.12],
        [0.03, -1.98, 2.12],
        [0.03, -1.98, -2.12],
      ].forEach(([x, y, z]) => {
        const screw = new THREE.Mesh(screwGeo, screwMat);
        screw.position.set(x, y, z);
        glassGroup.add(screw);
      });

      group.add(glassGroup);
      return group;
    },
    [registerRgbMaterial]
  );

  // Chassis ARGB Fans (3x 120mm Front Intake at +Z, 1x 120mm Rear Exhaust at -Z)
  const createChassisFans = useCallback(() => {
    const group = new THREE.Group();
    group.name = 'chassis_fans';

    const housingMat = new THREE.MeshStandardMaterial({ color: 0x161922, roughness: 0.45, metalness: 0.6 });
    const ringMat = registerRgbMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.1,
      })
    );
    const bladeMat = registerRgbMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x003344,
        transparent: true,
        opacity: 0.78,
      })
    );

    // 3x Front Intake Fans at Z = +2.16 (stacked vertically)
    [-1.05, 0.05, 1.15].forEach((yPos) => {
      const fanHousing = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 0.18), housingMat);
      fanHousing.position.set(0.15, yPos, 2.16);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 12, 28), ringMat);
      ring.position.set(0.15, yPos, 2.24);

      const blades = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.04, 9), bladeMat);
      blades.rotateX(Math.PI / 2);
      blades.position.set(0.15, yPos, 2.18);
      fanMeshesRef.current.push({ mesh: blades, axis: 'z', speed: 0.085 });

      group.add(fanHousing, ring, blades);
    });

    // 1x Rear Exhaust Fan at Z = -2.20
    const rearHousing = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.98, 0.18), housingMat);
    rearHousing.position.set(0.22, 0.95, -2.22);

    const rearRing = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.035, 12, 28), ringMat);
    rearRing.position.set(0.22, 0.95, -2.12);

    const rearBlades = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.04, 9), bladeMat);
    rearBlades.rotateX(Math.PI / 2);
    rearBlades.position.set(0.22, 0.95, -2.18);
    fanMeshesRef.current.push({ mesh: rearBlades, axis: 'z', speed: 0.085 });

    group.add(rearHousing, rearRing, rearBlades);
    return group;
  }, [registerRgbMaterial]);

  // Motherboard (ATX PCB with VRM Heatsinks, Socket, 4x Vertical DIMM Slots, 2x Armored PCIe Slots)
  const createMotherboardMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_motherboard';

      const isSilverEdition = /maximus|rog|white|prime|aero|steel/i.test(compName);
      const heatsinkHex = isSilverEdition ? 0x64748b : 0x222733;

      // Multi-layer Matte Black ATX PCB
      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 3.05, 2.48),
        new THREE.MeshStandardMaterial({ color: 0x0d1017, roughness: 0.45, metalness: 0.35 })
      );
      pcb.castShadow = true;
      pcb.receiveShadow = true;
      group.add(pcb);

      // Heavy VRM Heatsinks (Left & Top of Socket)
      const vrmMat = new THREE.MeshStandardMaterial({
        color: heatsinkHex,
        metalness: 0.9,
        roughness: 0.22,
      });
      const vrmLeft = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.25, 0.42), vrmMat);
      vrmLeft.position.set(0.16, 0.68, -0.86);

      const vrmTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 1.15), vrmMat);
      vrmTop.position.set(0.15, 1.26, -0.18);

      // Glowing ARGB Accent Strip on VRM Armor
      const rgbLineMat = registerRgbMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 1.0,
        })
      );
      const rgbLine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.95), rgbLineMat);
      rgbLine.position.set(0.17, 1.22, -0.18);
      const rgbVrmSide = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.05), rgbLineMat);
      rgbVrmSide.position.set(0.17, 0.68, -0.78);
      group.add(vrmLeft, vrmTop, rgbLine, rgbVrmSide);

      // AM5 / LGA1700 CPU Socket Base & Retention Frame
      const socketBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.78, 0.74),
        new THREE.MeshStandardMaterial({ color: 0x2d3442, metalness: 0.75, roughness: 0.28 })
      );
      socketBase.position.set(0.05, 0.72, -0.15);
      group.add(socketBase);

      // 4x Vertical DIMM RAM Slots (to the right of CPU Socket along +Z)
      for (let i = 0; i < 4; i++) {
        const dimm = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 1.22, 0.045),
          new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x161922 : 0x2e3646 })
        );
        dimm.position.set(0.06, 0.72, 0.44 + i * 0.11);
        group.add(dimm);
      }

      // 2x Steel-Armored Horizontal PCIe x16 Slots
      const pcieArmorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.15 });
      const pcie1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 1.72), pcieArmorMat);
      pcie1.position.set(0.07, -0.22, -0.08);
      const pcie2 = pcie1.clone();
      pcie2.position.set(0.07, -0.88, -0.08);
      group.add(pcie1, pcie2);

      // Chipset Heatsink Armor (Bottom-Right)
      const chipset = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.78, 0.82), vrmMat);
      chipset.position.set(0.11, -0.82, 0.68);
      const chipsetLed = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.65), rgbLineMat);
      chipsetLed.position.set(0.12, -0.82, 0.68);
      group.add(chipset, chipsetLed);

      // 24-Pin ATX Connector Block on Right PCB Edge
      const atx24 = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.62, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x11131a, roughness: 0.7 })
      );
      atx24.position.set(0.09, 0.65, 1.12);
      group.add(atx24);

      group.position.copy(SLOT_BASE_POSITIONS.motherboard);
      return group;
    },
    [registerRgbMaterial]
  );

  // Processor (CPU)
  const createCpuMesh = useCallback((compName = '') => {
    const group = new THREE.Group();
    group.name = 'slot_cpu';

    const isAmd = /ryzen|amd|threadripper/i.test(compName);

    // Substrate PCB
    const substrate = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.66, 0.62),
      new THREE.MeshStandardMaterial({
        color: isAmd ? 0x1e4d3b : 0x265c34,
        metalness: 0.35,
        roughness: 0.55,
      })
    );

    // Nickel-Plated Copper Integrated Heat Spreader (IHS)
    const ihs = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, isAmd ? 0.54 : 0.58, 0.52),
      new THREE.MeshStandardMaterial({
        color: 0xd8e0ea,
        metalness: 0.95,
        roughness: 0.14,
      })
    );
    ihs.position.set(0.035, 0, 0);

    // Laser-etched CPU Core Emblem
    const emblem = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.22, 0.22),
      new THREE.MeshStandardMaterial({
        color: isAmd ? 0xf97316 : 0x00f0ff,
        emissive: isAmd ? 0x9a3412 : 0x004466,
      })
    );
    emblem.position.set(0.068, 0, 0);

    group.add(substrate, ihs, emblem);
    group.position.copy(SLOT_BASE_POSITIONS.cpu);
    return group;
  }, []);

  // CPU Cooler (Liquid AIO with Infinity Pump, Braided Tubes & Top 360mm Radiator OR Dual-Tower Air Cooler)
  const createCoolerMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_cooling';

      const isAirTower = /noctua|nh-d15|dark rock|peerless|assassin|ak620|air|башен/i.test(compName);

      if (!isAirTower) {
        // 1. Cylindrical Liquid Pump Block with Infinity Mirror Cap over CPU Socket
        const pump = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.42, 32),
          new THREE.MeshStandardMaterial({ color: 0x161922, metalness: 0.85, roughness: 0.25 })
        );
        pump.rotation.z = Math.PI / 2;
        pump.position.set(-0.02, 1.04, -0.35);
        group.add(pump);

        // Glowing Infinity Mirror ARGB Rings on Pump Face (+X)
        const ringMat = registerRgbMaterial(
          new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 1.3,
          })
        );
        const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 16, 32), ringMat);
        outerRing.rotation.y = Math.PI / 2;
        outerRing.position.set(0.2, 1.04, -0.35);

        const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 16, 32), ringMat);
        innerRing.rotation.y = Math.PI / 2;
        innerRing.position.set(0.2, 1.04, -0.35);
        group.add(outerRing, innerRing);

        // 2. Braided Sleeved Coolant Tubes curving from Pump up to Top Radiator
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0x12151c, roughness: 0.65, metalness: 0.3 });
        const curve1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.05, 1.12, -0.15),
          new THREE.Vector3(0.42, 1.35, 0.35),
          new THREE.Vector3(0.32, 1.78, 0.85),
          new THREE.Vector3(0.1, 1.98, 1.15),
        ]);
        const curve2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.05, 0.94, -0.15),
          new THREE.Vector3(0.48, 1.25, 0.25),
          new THREE.Vector3(0.38, 1.72, 0.95),
          new THREE.Vector3(0.1, 1.98, 1.32),
        ]);
        const tube1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 24, 0.048, 10, false), tubeMat);
        const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 24, 0.048, 10, false), tubeMat);
        group.add(tube1, tube2);

        // 3. Top 360mm Aluminum Radiator + 3x Spinning ARGB Fans
        const rad = new THREE.Mesh(
          new THREE.BoxGeometry(1.42, 0.28, 3.45),
          new THREE.MeshStandardMaterial({ color: 0x12151e, metalness: 0.9, roughness: 0.28 })
        );
        rad.position.set(0.12, 2.04, 0.0);
        group.add(rad);

        const bladeMat = registerRgbMaterial(
          new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x004466,
            transparent: true,
            opacity: 0.85,
          })
        );

        [-1.08, 0.0, 1.08].forEach((zOff) => {
          const fanFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.28, 0.18, 1.04),
            new THREE.MeshStandardMaterial({ color: 0x1a1e29, roughness: 0.5 })
          );
          fanFrame.position.set(0.12, 1.82, zOff);

          const blades = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 9), bladeMat);
          blades.position.set(0.12, 1.8, zOff);
          fanMeshesRef.current.push({ mesh: blades, axis: 'y', speed: 0.09 });
          group.add(fanFrame, blades);
        });
      } else {
        // Dual-Tower High-Performance Air Cooler
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x242936, metalness: 0.92, roughness: 0.2 });
        const tower1 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.15, 0.42), towerMat);
        tower1.position.set(0.22, 1.04, -0.62);
        const tower2 = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.15, 0.42), towerMat);
        tower2.position.set(0.22, 1.04, -0.08);

        // Center PWM Fan between towers
        const centerFanMat = registerRgbMaterial(
          new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x003344 })
        );
        const centerFan = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.22), centerFanMat);
        centerFan.position.set(0.22, 1.04, -0.35);

        group.add(tower1, tower2, centerFan);
      }

      group.position.copy(SLOT_BASE_POSITIONS.cooling);
      return group;
    },
    [registerRgbMaterial]
  );

  // Graphics Card (GPU seated horizontally in PCIe Slot 1)
  const createGpuMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_gpu';

      const isFlagship = /4080|4090|7900|7800|super|ti/i.test(compName);
      const gpuLength = isFlagship ? 3.25 : 2.65;
      const gpuWidth = isFlagship ? 1.32 : 1.18;

      // Chamfered Gunmetal Shroud Body
      const shroud = new THREE.Mesh(
        new THREE.BoxGeometry(gpuWidth, 0.56, gpuLength),
        new THREE.MeshStandardMaterial({ color: 0x171a24, metalness: 0.88, roughness: 0.22 })
      );
      shroud.castShadow = true;
      shroud.receiveShadow = true;
      group.add(shroud);

      // Brushed Aluminum Top Backplate
      const backplate = new THREE.Mesh(
        new THREE.BoxGeometry(gpuWidth + 0.03, 0.05, gpuLength),
        new THREE.MeshStandardMaterial({ color: 0x2c3342, metalness: 0.92, roughness: 0.18 })
      );
      backplate.position.set(0, 0.3, 0);
      group.add(backplate);

      // Exposed Aluminum Heatsink Fin Stack Core
      const fins = new THREE.Mesh(
        new THREE.BoxGeometry(gpuWidth - 0.08, 0.38, gpuLength - 0.24),
        new THREE.MeshStandardMaterial({
          color: 0x64748b,
          metalness: 0.95,
          roughness: 0.2,
          wireframe: true,
        })
      );
      group.add(fins);

      // Triple / Dual Axial Fans on Underside
      const fanCount = isFlagship ? 3 : 2;
      const spacing = (gpuLength - 0.85) / (fanCount - 1);
      const startZ = -(gpuLength - 0.85) / 2;

      for (let i = 0; i < fanCount; i++) {
        const fanZ = startZ + i * spacing;
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.38, 0.025, 8, 24),
          new THREE.MeshStandardMaterial({ color: 0x334155 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(0, -0.29, fanZ);

        const blades = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.03, 9),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
        );
        blades.position.set(0, -0.29, fanZ);
        fanMeshesRef.current.push({ mesh: blades, axis: 'y', speed: 0.095 });
        group.add(ring, blades);
      }

      // Glowing Side ARGB Light Bar facing +X Glass Window ("GEFORCE RTX / RADEON")
      const sideLedMat = registerRgbMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 1.25,
        })
      );
      const sideLogo = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, gpuLength * 0.58), sideLedMat);
      sideLogo.position.set(gpuWidth / 2 + 0.02, 0.06, 0.1);
      group.add(sideLogo);

      // 12VHPWR Braided Power Cable curving down into PSU Shroud
      const pwrCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(gpuWidth / 2 - 0.1, 0.12, 0.55),
        new THREE.Vector3(gpuWidth / 2 + 0.18, -0.25, 0.55),
        new THREE.Vector3(gpuWidth / 2 + 0.05, -0.85, 0.45),
        new THREE.Vector3(-0.1, -1.35, 0.35),
      ]);
      const pwrCable = new THREE.Mesh(
        new THREE.TubeGeometry(pwrCurve, 18, 0.045, 8, false),
        new THREE.MeshStandardMaterial({ color: 0x0b0e14, roughness: 0.8 })
      );
      group.add(pwrCable);

      group.position.copy(SLOT_BASE_POSITIONS.gpu);
      return group;
    },
    [registerRgbMaterial]
  );

  // RAM Memory (Vertical DDR5 Modules seated in Motherboard DIMM Slots with glowing ARGB top edge)
  const createRamMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_memory';

      const isFourSticks = /64gb|4x|quad/i.test(compName);
      const activeSlots = isFourSticks ? [0, 1, 2, 3] : [1, 3];

      const lightbarMat = registerRgbMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 1.2,
        })
      );
      const spreaderMat = new THREE.MeshStandardMaterial({
        color: 0x1e2430,
        metalness: 0.9,
        roughness: 0.2,
      });

      activeSlots.forEach((slotIdx) => {
        const zOffset = 0.44 + slotIdx * 0.11;

        // Vertical Heat Spreader Module (protruding in +X, tall in Y, thin in Z)
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.18, 0.036), spreaderMat);
        stick.position.set(0, 0, zOffset);

        // Full-Length Vertical ARGB Diffuser Bar on outer +X edge
        const lightbar = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1.2, 0.042), lightbarMat);
        lightbar.position.set(0.13, 0, zOffset);

        group.add(stick, lightbar);
      });

      group.position.copy(SLOT_BASE_POSITIONS.memory);
      return group;
    },
    [registerRgbMaterial]
  );

  // Storage (M.2 NVMe Gen4/Gen5 SSD with Aluminum Heatsink & Status LED)
  const createStorageMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_storage';

      const ssdBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.18, 1.02),
        new THREE.MeshStandardMaterial({ color: 0x1c212c, metalness: 0.9, roughness: 0.22 })
      );

      const badgeMat = registerRgbMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 0.95,
        })
      );
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.68), badgeMat);
      badge.position.set(0.01, 0, 0);

      group.add(ssdBody, badge);
      group.position.copy(SLOT_BASE_POSITIONS.storage);
      return group;
    },
    [registerRgbMaterial]
  );

  // Power Supply (ATX 3.0 PSU inside lower shroud compartment with side window accent)
  const createPsuMesh = useCallback(
    (compName = '') => {
      const group = new THREE.Group();
      group.name = 'slot_psu';

      const psuBox = new THREE.Mesh(
        new THREE.BoxGeometry(1.42, 0.84, 1.75),
        new THREE.MeshStandardMaterial({ color: 0x12151e, metalness: 0.85, roughness: 0.32 })
      );

      // Glowing Side Wattage Badge visible on the +X side of the PSU
      const badgeMat = registerRgbMaterial(
        new THREE.MeshStandardMaterial({
          color: 0x00f0ff,
          emissive: 0x00f0ff,
          emissiveIntensity: 1.0,
        })
      );
      const sideBadge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.95), badgeMat);
      sideBadge.position.set(0.71, 0, 0);

      // Braided Modular Cable Bundle exiting front (+Z) of PSU
      const cables = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.65, 12),
        new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.9 })
      );
      cables.rotation.x = Math.PI / 2;
      cables.position.set(0, 0, 1.12);

      group.add(psuBox, sideBadge, cables);
      group.position.copy(SLOT_BASE_POSITIONS.psu);
      return group;
    },
    [registerRgbMaterial]
  );

  /* =========================================================================
   * 2. Three.js Scene Setup & Render Loop
   * ========================================================================= */

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 300;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0e17);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    const initialPreset = CAMERA_PRESETS.find((p) => p.id === cameraPreset) || CAMERA_PRESETS[0];
    camera.position.set(...initialPreset.pos);
    cameraRef.current = camera;

    // 3. WebGLRenderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. OrbitControls (smooth damping, zoom, rotate)
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = !compact;
    controls.minDistance = 2.8;
    controls.maxDistance = 16;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.target.set(...initialPreset.target);
    controlsRef.current = controls;

    // 5. Studio Three-Point + Internal ARGB Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x0f172a, 1.0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(7, 8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.4);
    rimLight.position.set(-6, 4, -5);
    scene.add(rimLight);

    const internalLight = new THREE.PointLight(activeLightingRef.current.primaryColor, 2.4, 5.5);
    internalLight.position.set(0.25, 0.4, 0.1);
    internalLight.name = 'internal_argb_light';
    scene.add(internalLight);

    // Subtle Studio Floor Grid
    const grid = new THREE.GridHelper(16, 32, 0x00f0ff, 0x1e293b);
    grid.position.y = -2.42;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    scene.add(grid);

    // Root Rig Group
    const rootRig = new THREE.Group();
    rootRig.name = 'rig_root_assembly';
    scene.add(rootRig);
    rootRigGroupRef.current = rootRig;

    // 6. Pointer Hover & Click Raycasting
    const handlePointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerLeave = () => {
      mouseRef.current.set(-999, -999);
      setHoveredPart(null);
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
    canvas.addEventListener('pointerleave', handlePointerLeave);
    canvas.addEventListener('click', handleClick);

    // 7. Render & Animation Loop
    let lastTime = performance.now();

    const animateLoop = (time) => {
      animFrameRef.current = requestAnimationFrame(animateLoop);
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      // Spin all active fan blades
      fanMeshesRef.current.forEach(({ mesh, axis, speed }) => {
        if (mesh) {
          mesh.rotation[axis] += speed;
        }
      });

      // Dynamic Aurora RGB cycle
      if (activeLightingRef.current.dynamic) {
        const hue = (time * 0.00018) % 1;
        const color = new THREE.Color().setHSL(hue, 1.0, 0.55);
        rgbMaterialsRef.current.forEach((mat) => {
          if (mat && mat.emissive) mat.emissive.copy(color);
        });
        const light = scene.getObjectByName('internal_argb_light');
        if (light) light.color.copy(color);
      }

      // Smooth Camera Preset Interpolation
      if (cameraTargetPosRef.current && cameraTargetLookRef.current) {
        camera.position.lerp(cameraTargetPosRef.current, 0.08);
        controls.target.lerp(cameraTargetLookRef.current, 0.08);
        if (camera.position.distanceTo(cameraTargetPosRef.current) < 0.04) {
          cameraTargetPosRef.current = null;
          cameraTargetLookRef.current = null;
        }
      }

      // A. Process Exiting Meshes (Component Removal / Replacement Exit)
      for (let i = exitingAnimsRef.current.length - 1; i >= 0; i--) {
        const anim = exitingAnimsRef.current[i];
        anim.progress = Math.min(1.0, anim.progress + delta / anim.duration);
        const easeIn = anim.progress * anim.progress;
        const s = Math.max(0.001, 1.0 - easeIn);
        anim.mesh.scale.set(s, s, s);
        if (anim.startPos && anim.exitPos) {
          anim.mesh.position.lerpVectors(anim.startPos, anim.exitPos, easeIn);
        }
        if (anim.progress >= 1.0) {
          rootRig.remove(anim.mesh);
          exitingAnimsRef.current.splice(i, 1);
          if (anim.onComplete) anim.onComplete();
        }
      }

      // B. Process Entering Meshes (Component Installation Entry)
      Object.keys(transitionStatesRef.current).forEach((slot) => {
        const state = transitionStatesRef.current[slot];
        if (!state) return;
        const group = slotsGroupRef.current[slot];
        if (!group) {
          delete transitionStatesRef.current[slot];
          return;
        }

        state.progress = Math.min(1.0, state.progress + delta / state.duration);
        const t = state.progress;
        const easeOut = 1 - Math.pow(1 - t, 3);
        group.scale.set(easeOut, easeOut, easeOut);
        if (state.startPos && state.targetPos) {
          group.position.lerpVectors(state.startPos, state.targetPos, easeOut);
        }
        if (state.progress >= 1.0) {
          group.scale.set(1, 1, 1);
          if (state.targetPos) group.position.copy(state.targetPos);
          delete transitionStatesRef.current[slot];
        }
      });

      // C. Apply Exploded View Disassembly Offsets (for non-animating slots)
      const exp = Math.max(0, Math.min(1, explosionRef.current));
      const slots = slotsGroupRef.current;
      const glass = rootRig.getObjectByName('case_glass_panel');
      if (glass) {
        glass.position.x = 1.18 + exp * 2.1;
      }
      if (slots.gpu && !transitionStatesRef.current.gpu) {
        slots.gpu.position.set(
          SLOT_BASE_POSITIONS.gpu.x + exp * 1.45,
          SLOT_BASE_POSITIONS.gpu.y - exp * 0.2,
          SLOT_BASE_POSITIONS.gpu.z + exp * 0.5
        );
      }
      if (slots.cooling && !transitionStatesRef.current.cooling) {
        slots.cooling.position.set(exp * 1.1, exp * 0.75, 0);
      }
      if (slots.memory && !transitionStatesRef.current.memory) {
        slots.memory.position.set(
          SLOT_BASE_POSITIONS.memory.x + exp * 1.2,
          SLOT_BASE_POSITIONS.memory.y + exp * 0.35,
          SLOT_BASE_POSITIONS.memory.z
        );
      }
      if (slots.cpu && !transitionStatesRef.current.cpu) {
        slots.cpu.position.set(
          SLOT_BASE_POSITIONS.cpu.x + exp * 0.85,
          SLOT_BASE_POSITIONS.cpu.y,
          SLOT_BASE_POSITIONS.cpu.z
        );
      }
      if (slots.motherboard && !transitionStatesRef.current.motherboard) {
        slots.motherboard.position.set(
          SLOT_BASE_POSITIONS.motherboard.x - exp * 0.45,
          SLOT_BASE_POSITIONS.motherboard.y,
          SLOT_BASE_POSITIONS.motherboard.z
        );
      }
      if (slots.storage && !transitionStatesRef.current.storage) {
        slots.storage.position.set(
          SLOT_BASE_POSITIONS.storage.x + exp * 0.95,
          SLOT_BASE_POSITIONS.storage.y,
          SLOT_BASE_POSITIONS.storage.z
        );
      }
      if (slots.psu && !transitionStatesRef.current.psu) {
        slots.psu.position.set(
          SLOT_BASE_POSITIONS.psu.x,
          SLOT_BASE_POSITIONS.psu.y - exp * 0.45,
          SLOT_BASE_POSITIONS.psu.z - exp * 0.9
        );
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animFrameRef.current = requestAnimationFrame(animateLoop);

    // 8. Responsive ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      canvas.removeEventListener('click', handleClick);
      controls.dispose();
      renderer.dispose();
    };
  }, [compact]);

  /* =========================================================================
   * 3. Lighting & Camera Updates
   * ========================================================================= */

  useEffect(() => {
    if (!sceneRef.current) return;
    const color = new THREE.Color(activeLighting.primaryColor);
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

  useEffect(() => {
    const preset = CAMERA_PRESETS.find((p) => p.id === cameraPreset) || CAMERA_PRESETS[0];
    cameraTargetPosRef.current = new THREE.Vector3(...preset.pos);
    cameraTargetLookRef.current = new THREE.Vector3(...preset.target);
  }, [cameraPreset]);

  useEffect(() => {
    const glass = rootRigGroupRef.current?.getObjectByName('case_glass_panel');
    if (glass) {
      glass.visible = showGlass;
    }
  }, [showGlass]);

  /* =========================================================================
   * 4. Initialize Base Chassis / GLB Preset
   * ========================================================================= */

  useEffect(() => {
    const rootRig = rootRigGroupRef.current;
    if (!rootRig) return;

    fanMeshesRef.current = [];
    rgbMaterialsRef.current = [];
    transitionStatesRef.current = {};
    exitingAnimsRef.current = [];
    prevPartsRef.current = {};
    slotsGroupRef.current = {};

    while (rootRig.children.length > 0) {
      const child = rootRig.children[0];
      rootRig.remove(child);
    }

    if (modelPreset !== 'custom') {
      setLoadingModel(true);
      const glbPath = getStaticAssetUrl(`models/${modelPreset}.glb`);
      const loader = getGltfLoader();
      loader.load(
        glbPath,
        (gltf) => {
          const model = gltf.scene;
          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5.0 / (maxDim || 1);
          model.scale.set(scale, scale, scale);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center.multiplyScalar(scale));
          rootRig.add(model);
          setLoadingModel(false);
        },
        undefined,
        () => {
          setLoadingModel(false);
        }
      );
      return;
    }

    // Always mount the base PC Case & ARGB Chassis Fans
    const caseName = selectedParts.case?.name || selectedParts.case?.component?.name || '';
    const caseGroup = createCaseMesh(caseName);
    const glass = caseGroup.getObjectByName('case_glass_panel');
    if (glass) glass.visible = showGlass;
    const fansGroup = createChassisFans();
    rootRig.add(caseGroup, fansGroup);
    slotsGroupRef.current.case = caseGroup;
  }, [modelPreset, createCaseMesh, createChassisFans]);

  /* =========================================================================
   * 5. Live Reactive Sync with RigForge Cart (Add / Remove / Replace)
   * ========================================================================= */

  useEffect(() => {
    if (modelPreset !== 'custom') return;
    const rootRig = rootRigGroupRef.current;
    if (!rootRig) return;

    const getPartUid = (p) => {
      if (!p) return null;
      const c = p.component || p;
      return `${c.id || p.id || ''}:${c.name || p.name || ''}`;
    };

    // Handle Case replacement if user picks a different Case in the cart
    const currentCaseUid = getPartUid(selectedParts.case);
    const prevCaseUid = getPartUid(prevPartsRef.current.case);
    if (currentCaseUid !== prevCaseUid && prevPartsRef.current._initialized) {
      const existingCase = slotsGroupRef.current.case;
      if (existingCase) {
        rootRig.remove(existingCase);
      }
      const newCaseName = selectedParts.case?.name || selectedParts.case?.component?.name || '';
      const newCaseGroup = createCaseMesh(newCaseName);
      const glass = newCaseGroup.getObjectByName('case_glass_panel');
      if (glass) glass.visible = showGlass;
      rootRig.add(newCaseGroup);
      slotsGroupRef.current.case = newCaseGroup;
      transitionStatesRef.current.case = {
        progress: 0,
        duration: 0.38,
        startPos: new THREE.Vector3(0, 0.25, 0),
        targetPos: SLOT_BASE_POSITIONS.case.clone(),
      };
    }

    const internalSlots = ['motherboard', 'cpu', 'cooling', 'memory', 'gpu', 'storage', 'psu'];

    internalSlots.forEach((slotKey) => {
      const currentPart = selectedParts[slotKey];
      const prevPart = prevPartsRef.current[slotKey];

      const currentId = getPartUid(currentPart);
      const prevId = getPartUid(prevPart);

      const spawnSlot = (partObj) => {
        const compName = partObj?.name || partObj?.component?.name || '';
        let newMesh = null;
        let startPos = null;
        const targetPos = SLOT_BASE_POSITIONS[slotKey].clone();

        if (slotKey === 'motherboard') {
          newMesh = createMotherboardMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(0.95, 0.1, 0));
        } else if (slotKey === 'cpu') {
          newMesh = createCpuMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(0.85, 0.25, 0));
        } else if (slotKey === 'cooling') {
          newMesh = createCoolerMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(0.95, 0.45, 0));
        } else if (slotKey === 'memory') {
          newMesh = createRamMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(0.85, 0.3, 0));
        } else if (slotKey === 'gpu') {
          newMesh = createGpuMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(1.15, 0.25, 0.35));
        } else if (slotKey === 'storage') {
          newMesh = createStorageMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(0.75, 0.1, 0));
        } else if (slotKey === 'psu') {
          newMesh = createPsuMesh(compName);
          startPos = targetPos.clone().add(new THREE.Vector3(0.65, 0, 0.55));
        }

        if (newMesh) {
          newMesh.scale.set(0.001, 0.001, 0.001);
          newMesh.position.copy(startPos);
          rootRig.add(newMesh);
          slotsGroupRef.current[slotKey] = newMesh;
          transitionStatesRef.current[slotKey] = {
            progress: 0,
            duration: 0.44,
            startPos,
            targetPos,
          };
        }
      };

      // Case 1: Component Added or Replaced
      if (currentId && currentId !== prevId) {
        const existingMesh = slotsGroupRef.current[slotKey];
        if (existingMesh) {
          delete slotsGroupRef.current[slotKey];
          delete transitionStatesRef.current[slotKey];
          const startExitPos = existingMesh.position.clone();
          const exitPos = startExitPos.clone().add(new THREE.Vector3(0.9, 0.2, 0));
          exitingAnimsRef.current.push({
            mesh: existingMesh,
            progress: 0,
            duration: 0.24,
            startPos: startExitPos,
            exitPos,
            onComplete: () => {
              spawnSlot(currentPart);
            },
          });
        } else {
          spawnSlot(currentPart);
        }
      }
      // Case 2: Component Removed from Cart
      else if (!currentId && prevId) {
        const existingMesh = slotsGroupRef.current[slotKey];
        if (existingMesh) {
          delete slotsGroupRef.current[slotKey];
          delete transitionStatesRef.current[slotKey];
          const startExitPos = existingMesh.position.clone();
          const exitPos = startExitPos.clone().add(new THREE.Vector3(0.95, 0.25, 0));
          exitingAnimsRef.current.push({
            mesh: existingMesh,
            progress: 0,
            duration: 0.28,
            startPos: startExitPos,
            exitPos,
          });
        }
      }
    });

    prevPartsRef.current = { ...selectedParts, _initialized: true };
  }, [
    selectedParts,
    modelPreset,
    showGlass,
    createCaseMesh,
    createMotherboardMesh,
    createCpuMesh,
    createCoolerMesh,
    createRamMesh,
    createGpuMesh,
    createStorageMesh,
    createPsuMesh,
  ]);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden select-none ${className}`}>
      {/* Three.js WebGL Canvas */}
      <canvas id="canvas3d" ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loadingModel && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-mono text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
            Загрузка 3D-сцены...
          </span>
        </div>
      )}

      {/* Interactive Hover HUD Pill */}
      {hoveredPart && selectedParts[hoveredPart] && (
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none px-2.5 py-1 rounded-lg bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 shadow-lg flex items-center gap-1.5 max-w-[75%]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
          <span className="text-[10px] text-white font-semibold truncate">
            {SLOT_LABELS_RU[hoveredPart] || hoveredPart}:{' '}
            {selectedParts[hoveredPart]?.name || selectedParts[hoveredPart]?.component?.name}
          </span>
        </div>
      )}

      {/* Fullscreen Mode Watermark */}
      {!compact && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-400">
          <span className="text-cyan-400 font-bold">● RIGFORGE 3D CAD</span>
          <span>|</span>
          <span>{activeLighting.name}</span>
        </div>
      )}
    </div>
  );
}
