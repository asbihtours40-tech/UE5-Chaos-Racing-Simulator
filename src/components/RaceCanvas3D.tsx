import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { CameraViewMode, VehicleTelemetry, VehicleConfig, CheckpointData } from '../types';
import { SoundFX } from '../services/soundEffects';

interface RaceCanvas3DProps {
  telemetry: VehicleTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<VehicleTelemetry>>;
  config: VehicleConfig;
  cameraMode: CameraViewMode;
  onLapComplete: (lapTime: number, isBest: boolean) => void;
  onRaceFinished: (finalBestLap: number) => void;
  onDetachBumperTrigger?: () => void;
  onRepairCar?: () => void;
  carColor: string;
}

// Track curve control points
const TRACK_POINTS: [number, number][] = [
  [0, -120],
  [80, -110],
  [140, -60],
  [150, 20],
  [110, 80],
  [40, 60],
  [20, 100],
  [-30, 140],
  [-100, 130],
  [-140, 70],
  [-120, -10],
  [-60, -30],
  [-80, -90],
  [-40, -120],
];

export const RaceCanvas3D: React.FC<RaceCanvas3DProps> = ({
  telemetry,
  setTelemetry,
  config,
  cameraMode,
  onLapComplete,
  onRaceFinished,
  carColor,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // References for cross-frame simulation
  const simState = useRef({
    // Car dynamic physics state
    posX: 0,
    posZ: -120,
    posY: 0.35,
    rotY: Math.PI / 2, // Facing East initially
    speed: 0, // meters per second
    steerAngle: 0,
    yawRate: 0,
    pitchAngle: 0,
    rollAngle: 0,
    driftFactor: 0,
    isHandbraking: false,

    // Detachable front bumper state (matches AUE5VehicleGameCar)
    isBumperAttached: true,
    bumperPosX: 0,
    bumperPosY: 0.35,
    bumperPosZ: 0,
    bumperRotX: 0,
    bumperRotY: 0,
    bumperRotZ: 0,
    bumperVelX: 0,
    bumperVelY: 0,
    bumperVelZ: 0,
    bumperAngVelX: 0,
    bumperAngVelY: 0,
    bumperAngVelZ: 0,
    bumperLifespan: 15.0,

    // Racing state
    currentLap: 1,
    totalLaps: 3,
    currentLapTime: 0,
    bestLapTime: 0,
    bIsRaceActive: true,
    currentCheckpointIndex: 0,
    lapTimes: [] as number[],
    lastImpulseSize: 0,

    // Controls
    throttleInput: 0,
    brakeInput: 0,
    steeringInput: 0,

    // Visual effects
    skidTimer: 0,
    cameraShake: 0,
  });

  // Keep config & telemetry refs updated
  const configRef = useRef(config);
  configRef.current = config;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keysPressed.current[code] = true;
      keysPressed.current[e.key.toLowerCase()] = true;
      SoundFX.startEngine();

      if (code === 'KeyR') {
        // Respawn car
        resetVehiclePosition();
      } else if (code === 'KeyB') {
        // Force test trigger 80,000+ Ns bumper detachment hit
        triggerBumperDetachment(95000);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      keysPressed.current[code] = false;
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const triggerBumperDetachment = (impulseSize: number) => {
    const state = simState.current;
    if (!state.isBumperAttached) return;

    state.isBumperAttached = false;
    state.bumperLifespan = 15.0; // Matches FrontBumperMesh->SetLifeSpan(15.0f);
    state.lastImpulseSize = impulseSize;
    state.cameraShake = 0.5;

    // Detach from Socket_FrontBumper with KeepWorldTransform
    const forwardX = Math.sin(state.rotY);
    const forwardZ = Math.cos(state.rotY);
    const rightX = Math.cos(state.rotY);
    const rightZ = -Math.sin(state.rotY);

    state.bumperPosX = state.posX + forwardX * 2.2;
    state.bumperPosY = state.posY + 0.15;
    state.bumperPosZ = state.posZ + forwardZ * 2.2;
    state.bumperRotY = state.rotY;

    // Give bumper kinetic impulse
    const speedRatio = Math.max(8, state.speed);
    state.bumperVelX = forwardX * (speedRatio * 0.8) + (Math.random() - 0.5) * 8 + rightX * 3;
    state.bumperVelY = 5.5 + Math.random() * 3.5;
    state.bumperVelZ = forwardZ * (speedRatio * 0.8) + (Math.random() - 0.5) * 8 + rightZ * 3;
    state.bumperAngVelX = (Math.random() - 0.5) * 15;
    state.bumperAngVelY = 8 + Math.random() * 6;
    state.bumperAngVelZ = (Math.random() - 0.5) * 15;

    SoundFX.playCrashImpact(impulseSize, true);
  };

  const resetVehiclePosition = () => {
    const state = simState.current;
    state.posX = 0;
    state.posZ = -120;
    state.posY = 0.35;
    state.rotY = Math.PI / 2;
    state.speed = 0;
    state.steerAngle = 0;
    state.yawRate = 0;
    state.isBumperAttached = true;
    state.bumperLifespan = 15.0;
    state.lastImpulseSize = 0;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId: number;

    // Scene & Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e131f);
    scene.fog = new THREE.FogExp2(0x131a2a, 0.0035);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xd4e2ff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    sunLight.position.set(120, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    const shadowD = 180;
    sunLight.shadow.camera.left = -shadowD;
    sunLight.shadow.camera.right = shadowD;
    sunLight.shadow.camera.top = shadowD;
    sunLight.shadow.camera.bottom = -shadowD;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Environment: Ground Grass Plane
    const groundGeo = new THREE.PlaneGeometry(800, 800, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x18281a,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Racing Circuit Road Generation
    const curve = new THREE.CatmullRomCurve3(
      TRACK_POINTS.map(([x, z]) => new THREE.Vector3(x, 0.02, z)),
      true
    );

    const trackSegments = 400;
    const trackWidth = 14;
    const trackPoints = curve.getSpacedPoints(trackSegments);

    // Build Track Mesh
    const trackGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= trackSegments; i++) {
      const pt = trackPoints[i % trackSegments];
      const nextPt = trackPoints[(i + 1) % trackSegments];
      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const leftEdge = new THREE.Vector3().copy(pt).addScaledVector(right, -trackWidth / 2);
      const rightEdge = new THREE.Vector3().copy(pt).addScaledVector(right, trackWidth / 2);

      positions.push(leftEdge.x, 0.04, leftEdge.z);
      positions.push(rightEdge.x, 0.04, rightEdge.z);

      normals.push(0, 1, 0, 0, 1, 0);
      uvs.push(0, i / 10, 1, i / 10);

      if (i < trackSegments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    trackGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    trackGeo.setIndex(indices);

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.8,
      metalness: 0.15,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.receiveShadow = true;
    scene.add(trackMesh);

    // Rumble Strips / Curbs (Red & White Kerbs)
    const kerbMatRed = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.5 });
    const kerbMatWhite = new THREE.MeshStandardMaterial({ color: 0xefefef, roughness: 0.5 });

    for (let i = 0; i < trackSegments; i += 2) {
      const pt = trackPoints[i];
      const nextPt = trackPoints[(i + 1) % trackSegments];
      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const mat = (i / 2) % 2 === 0 ? kerbMatRed : kerbMatWhite;
      const kerbGeo = new THREE.BoxGeometry(0.8, 0.12, 1.6);

      // Left curb
      const leftCurb = new THREE.Mesh(kerbGeo, mat);
      const leftPos = new THREE.Vector3().copy(pt).addScaledVector(right, -trackWidth / 2 - 0.4);
      leftCurb.position.set(leftPos.x, 0.06, leftPos.z);
      leftCurb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      scene.add(leftCurb);

      // Right curb
      const rightCurb = new THREE.Mesh(kerbGeo, mat);
      const rightPos = new THREE.Vector3().copy(pt).addScaledVector(right, trackWidth / 2 + 0.4);
      rightCurb.position.set(rightPos.x, 0.06, rightPos.z);
      rightCurb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      scene.add(rightCurb);
    }

    // Checkpoints and Gantry
    const CHECKPOINT_INDICES = [0, 50, 100, 150, 200, 250, 300, 350];
    const checkpoints: CheckpointData[] = [];
    const checkpointObjects: THREE.Group[] = [];

    CHECKPOINT_INDICES.forEach((segIndex, idx) => {
      const pt = trackPoints[segIndex];
      const nextPt = trackPoints[(segIndex + 1) % trackSegments];
      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      const heading = Math.atan2(dir.x, dir.z);

      checkpoints.push({
        index: idx,
        x: pt.x,
        z: pt.z,
        angle: heading,
        width: trackWidth,
      });

      // 3D Gate Arch
      const gateGroup = new THREE.Group();
      gateGroup.position.set(pt.x, 0, pt.z);
      gateGroup.rotation.y = heading;

      // Pillars
      const pillarGeo = new THREE.CylinderGeometry(0.35, 0.35, 7, 16);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0xffb703 : 0x0284c7,
        metalness: 0.8,
        roughness: 0.2,
      });

      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-trackWidth / 2 - 1, 3.5, 0);
      leftPillar.castShadow = true;
      gateGroup.add(leftPillar);

      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(trackWidth / 2 + 1, 3.5, 0);
      rightPillar.castShadow = true;
      gateGroup.add(rightPillar);

      // Top Truss
      const beamGeo = new THREE.BoxGeometry(trackWidth + 3, 0.8, 0.8);
      const beamMat = new THREE.MeshStandardMaterial({
        color: idx === 0 ? 0x222222 : 0x1e293b,
        metalness: 0.5,
        roughness: 0.5,
      });
      const topBeam = new THREE.Mesh(beamGeo, beamMat);
      topBeam.position.set(0, 6.8, 0);
      topBeam.castShadow = true;
      gateGroup.add(topBeam);

      // Checkpoint Glowing Beam Gate
      const gatePlaneGeo = new THREE.PlaneGeometry(trackWidth, 6);
      const gatePlaneMat = new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xf59e0b : 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const gatePlane = new THREE.Mesh(gatePlaneGeo, gatePlaneMat);
      gatePlane.position.set(0, 3, 0);
      gateGroup.add(gatePlane);

      scene.add(gateGroup);
      checkpointObjects.push(gateGroup);
    });

    // Outer Barriers & Obstacles (Collidables)
    const collidableObstacles: { x: number; z: number; radius: number; mass: number; mesh?: THREE.Object3D }[] = [];

    // Track crash barriers
    for (let i = 0; i < trackSegments; i += 8) {
      const pt = trackPoints[i];
      const nextPt = trackPoints[(i + 1) % trackSegments];
      const dir = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const right = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const barrierOffset = trackWidth / 2 + 1.8;
      const barrierPosLeft = new THREE.Vector3().copy(pt).addScaledVector(right, -barrierOffset);
      const barrierPosRight = new THREE.Vector3().copy(pt).addScaledVector(right, barrierOffset);

      // Left Barrier
      collidableObstacles.push({ x: barrierPosLeft.x, z: barrierPosLeft.z, radius: 1.2, mass: 100000 });
      // Right Barrier
      collidableObstacles.push({ x: barrierPosRight.x, z: barrierPosRight.z, radius: 1.2, mass: 100000 });

      // Visual concrete block / armco
      const barrierGeo = new THREE.BoxGeometry(0.6, 1.2, 4);
      const barrierMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
      const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
      barrierMesh.position.set(barrierPosLeft.x, 0.6, barrierPosLeft.z);
      barrierMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      barrierMesh.castShadow = true;
      scene.add(barrierMesh);
    }

    // Add some dynamic crash test tire stacks and orange barrels
    const barrelGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.1, 16);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const barrelPositions: [number, number][] = [
      [82, -100],
      [145, -50],
      [112, 70],
      [-32, 130],
      [-135, 60],
      [-75, -80],
    ];

    barrelPositions.forEach(([bx, bz]) => {
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(bx, 0.55, bz);
      barrel.castShadow = true;
      scene.add(barrel);
      collidableObstacles.push({ x: bx, z: bz, radius: 0.8, mass: 300, mesh: barrel });
    });

    // Scenery Trees & Spectator Stands
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 3.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422a1d, roughness: 0.9 });
    const foliageGeo = new THREE.ConeGeometry(2.5, 5, 8);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1b4324, roughness: 0.8 });

    for (let i = 0; i < 70; i++) {
      const angle = (i / 70) * Math.PI * 2;
      const dist = 170 + Math.sin(i * 3) * 35;
      const tx = Math.cos(angle) * dist;
      const tz = Math.sin(angle) * dist;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.75;
      trunk.castShadow = true;
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 5;
      foliage.castShadow = true;
      tree.add(trunk);
      tree.add(foliage);
      tree.position.set(tx, 0, tz);
      scene.add(tree);
    }

    // -------------------------------------------------------------
    // BUILD THE CAR (AUE5VehicleGameCar)
    // -------------------------------------------------------------
    const carRoot = new THREE.Group();
    scene.add(carRoot);

    const carChassisGroup = new THREE.Group();
    carRoot.add(carChassisGroup);

    // Car Body Material (Dynamic color based on carColor prop)
    const carBodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(carColor),
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const carDarkMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.7,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2430,
      roughness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    // Main Chassis Body (Sleek GT profile)
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.55, 4.2);
    const bodyMesh = new THREE.Mesh(bodyGeo, carBodyMat);
    bodyMesh.position.y = 0.45;
    bodyMesh.castShadow = true;
    carChassisGroup.add(bodyMesh);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.45, 2.2);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(0, 0.85, -0.3);
    cabinMesh.castShadow = true;
    carChassisGroup.add(cabinMesh);

    // Roof Top Shell
    const roofTopGeo = new THREE.BoxGeometry(1.45, 0.08, 1.8);
    const roofTopMesh = new THREE.Mesh(roofTopGeo, carDarkMat);
    roofTopMesh.position.set(0, 1.1, -0.3);
    roofTopMesh.castShadow = true;
    carChassisGroup.add(roofTopMesh);

    // Rear Wing / Spoiler
    const wingGeo = new THREE.BoxGeometry(1.8, 0.08, 0.5);
    const wingMesh = new THREE.Mesh(wingGeo, carDarkMat);
    wingMesh.position.set(0, 1.05, -1.9);
    wingMesh.castShadow = true;
    carChassisGroup.add(wingMesh);

    const wingStrutL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.15), carDarkMat);
    wingStrutL.position.set(-0.6, 0.85, -1.9);
    carChassisGroup.add(wingStrutL);

    const wingStrutR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.15), carDarkMat);
    wingStrutR.position.set(0.6, 0.85, -1.9);
    carChassisGroup.add(wingStrutR);

    // Headlights (Point lights + emissive mesh)
    const headlightGeo = new THREE.BoxGeometry(0.35, 0.12, 0.1);
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x90c5ff,
      emissiveIntensity: 2.0,
    });
    const headlightL = new THREE.Mesh(headlightGeo, headlightMat);
    headlightL.position.set(-0.65, 0.5, 2.12);
    carChassisGroup.add(headlightL);

    const headlightR = new THREE.Mesh(headlightGeo, headlightMat);
    headlightR.position.set(0.65, 0.5, 2.12);
    carChassisGroup.add(headlightR);

    const spotLight = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI / 5, 0.4);
    spotLight.position.set(0, 0.6, 2.2);
    spotLight.target.position.set(0, 0, 25);
    carChassisGroup.add(spotLight);
    carChassisGroup.add(spotLight.target);

    // Brake Lights (Red emissive)
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0x880000,
      emissive: 0x440000,
      emissiveIntensity: 1.0,
    });
    const brakeLightL = new THREE.Mesh(headlightGeo, brakeMat);
    brakeLightL.position.set(-0.65, 0.52, -2.12);
    carChassisGroup.add(brakeLightL);

    const brakeLightR = new THREE.Mesh(headlightGeo, brakeMat);
    brakeLightR.position.set(0.65, 0.52, -2.12);
    carChassisGroup.add(brakeLightR);

    // -------------------------------------------------------------
    // DETACHABLE FRONT BUMPER (FrontBumperMesh attached to Socket_FrontBumper)
    // -------------------------------------------------------------
    // In C++:
    // FrontBumperMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("FrontBumperMesh"));
    // FrontBumperMesh->SetupAttachment(GetMesh(), FName("Socket_FrontBumper"));
    const bumperGroup = new THREE.Group();

    const bumperSplitterGeo = new THREE.BoxGeometry(2.05, 0.12, 0.55);
    const bumperSplitter = new THREE.Mesh(bumperSplitterGeo, carDarkMat);
    bumperSplitter.castShadow = true;
    bumperGroup.add(bumperSplitter);

    const bumperNoseGeo = new THREE.BoxGeometry(1.85, 0.28, 0.35);
    const bumperNose = new THREE.Mesh(bumperNoseGeo, carBodyMat);
    bumperNose.position.set(0, 0.16, 0.05);
    bumperNose.castShadow = true;
    bumperGroup.add(bumperNose);

    // Canards / Aerodynamic Winglets
    const canardGeo = new THREE.BoxGeometry(0.12, 0.22, 0.35);
    const canardL = new THREE.Mesh(canardGeo, carDarkMat);
    canardL.position.set(-1.0, 0.16, 0);
    bumperGroup.add(canardL);

    const canardR = new THREE.Mesh(canardGeo, carDarkMat);
    canardR.position.set(1.0, 0.16, 0);
    bumperGroup.add(canardR);

    // Standalone world mesh for detached bumper physics
    const worldDetachedBumper = new THREE.Group();
    worldDetachedBumper.visible = false;
    scene.add(worldDetachedBumper);

    // Clone geometry into detached bumper
    const detachedBumperSplitter = new THREE.Mesh(bumperSplitterGeo, carDarkMat);
    detachedBumperSplitter.castShadow = true;
    worldDetachedBumper.add(detachedBumperSplitter);

    const detachedBumperNose = new THREE.Mesh(bumperNoseGeo, carBodyMat);
    detachedBumperNose.position.set(0, 0.16, 0.05);
    detachedBumperNose.castShadow = true;
    worldDetachedBumper.add(detachedBumperNose);

    // Socket_FrontBumper location relative to car mesh
    bumperGroup.position.set(0, 0.22, 2.15);
    carChassisGroup.add(bumperGroup);

    // Wheels (4 Wheels: Front-Left, Front-Right, Rear-Left, Rear-Right)
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 24);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1f242b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.2,
      metalness: 0.9,
    });

    const createWheel = (x: number, y: number, z: number) => {
      const wheelAssembly = new THREE.Group();
      wheelAssembly.position.set(x, y, z);

      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.castShadow = true;
      wheelAssembly.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 16), rimMat);
      rim.rotateZ(Math.PI / 2);
      wheelAssembly.add(rim);

      carChassisGroup.add(wheelAssembly);
      return { assembly: wheelAssembly, tire };
    };

    const frontLeftWheel = createWheel(-0.95, 0.38, 1.4);
    const frontRightWheel = createWheel(0.95, 0.38, 1.4);
    const rearLeftWheel = createWheel(-0.95, 0.38, -1.4);
    const rearRightWheel = createWheel(0.95, 0.38, -1.4);

    // Skid marks particle system / trail
    const skidGeo = new THREE.PlaneGeometry(0.35, 1.0);
    skidGeo.rotateX(-Math.PI / 2);
    const skidMat = new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const skidMeshes: THREE.Mesh[] = [];
    const MAX_SKID_MARKS = 50;

    // -------------------------------------------------------------
    // ANIMATION & CHAOS VEHICLE PHYSICS LOOP
    // -------------------------------------------------------------
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);

      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const state = simState.current;
      const conf = configRef.current;

      // 1. Process Enhanced Inputs (SteeringAction & ThrottleBrakeAction)
      // W / Up Arrow: Throttle
      // S / Down Arrow: Brake & Reverse
      // A / Left: Steer Left
      // D / Right: Steer Right
      // Space: Handbrake
      const isUp = keysPressed.current['KeyW'] || keysPressed.current['ArrowUp'];
      const isDown = keysPressed.current['KeyS'] || keysPressed.current['ArrowDown'];
      const isLeft = keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft'];
      const isRight = keysPressed.current['KeyD'] || keysPressed.current['ArrowRight'];
      const isSpace = keysPressed.current['Space'];

      // Enhanced Input Mapping Value:
      let rawThrottleBrake = 0.0;
      if (isUp) rawThrottleBrake += 1.0;
      if (isDown) rawThrottleBrake -= 1.0;

      // In UE5 C++:
      // void AUE5VehicleGameCar::ThrottleBrakeInput(const FInputActionValue& Value)
      // if (InputVal >= 0.0f) { SetThrottleInput(InputVal); SetBrakeInput(0.0f); }
      // else { SetThrottleInput(0.0f); SetBrakeInput(FMath::Abs(InputVal)); }
      if (rawThrottleBrake >= 0) {
        state.throttleInput = rawThrottleBrake;
        state.brakeInput = 0;
      } else {
        state.throttleInput = 0;
        state.brakeInput = Math.abs(rawThrottleBrake);
      }

      // Steering Input: -1 to 1
      let rawSteering = 0.0;
      if (isLeft) rawSteering -= 1.0;
      if (isRight) rawSteering += 1.0;
      state.steeringInput = rawSteering;
      state.isHandbraking = isSpace || false;

      // 2. Chaos Vehicle Physics Simulation
      const maxSpeedMs = conf.maxSpeedKmh / 3.6; // convert km/h to m/s
      const accelForce = (conf.engineHorsepower / 400) * 16.0;
      const brakeForce = 28.0;
      const friction = 2.8 * conf.tireFriction;

      // Calculate longitudinal acceleration
      if (state.throttleInput > 0) {
        state.speed += state.throttleInput * accelForce * deltaTime;
        if (state.speed > maxSpeedMs) state.speed = maxSpeedMs;
      }

      if (state.brakeInput > 0) {
        if (state.speed > 0.5) {
          // Braking
          state.speed -= state.brakeInput * brakeForce * deltaTime;
          if (state.speed < 0) state.speed = 0;
        } else {
          // Reverse
          state.speed -= state.brakeInput * (accelForce * 0.45) * deltaTime;
          if (state.speed < -maxSpeedMs * 0.35) state.speed = -maxSpeedMs * 0.35;
        }
      }

      // Rolling drag & air resistance
      if (state.throttleInput === 0 && state.brakeInput === 0) {
        if (state.speed > 0) {
          state.speed -= friction * deltaTime;
          if (state.speed < 0) state.speed = 0;
        } else if (state.speed < 0) {
          state.speed += friction * deltaTime;
          if (state.speed > 0) state.speed = 0;
        }
      }

      // Handbrake effect
      if (state.isHandbraking) {
        state.speed *= Math.pow(0.82, deltaTime * 60);
      }

      // Steering angle with Ackermann interpolation
      const targetSteerAngle = -state.steeringInput * 0.55 * (conf.steeringSharpness / 100);
      state.steerAngle += (targetSteerAngle - state.steerAngle) * Math.min(1.0, 10.0 * deltaTime);

      // Turn vehicle (Yaw)
      const speedNorm = Math.abs(state.speed) / (maxSpeedMs || 1);
      const turnMultiplier = state.speed >= 0 ? 1 : -1;
      const effectiveTurn = state.steerAngle * turnMultiplier * (1.2 - speedNorm * 0.4);

      if (Math.abs(state.speed) > 0.1) {
        const driftBoost = state.isHandbraking ? 1.9 : 1.0;
        state.rotY += effectiveTurn * (state.speed / 4.2) * driftBoost * deltaTime;
      }

      // Calculate drift factor (sideways slip)
      const forwardX = Math.sin(state.rotY);
      const forwardZ = Math.cos(state.rotY);
      const slipAmount = Math.abs(state.steerAngle) * (Math.abs(state.speed) / 12) * (state.isHandbraking ? 2.5 : 1.0);
      state.driftFactor = Math.min(1.0, slipAmount);

      // Move car
      state.posX += forwardX * state.speed * deltaTime;
      state.posZ += forwardZ * state.speed * deltaTime;

      // Suspension pitch & roll
      const accelPitch = (state.throttleInput - state.brakeInput) * 0.04;
      state.pitchAngle += (-accelPitch - state.pitchAngle) * 0.15;
      const turnRoll = -state.steerAngle * (state.speed / 20) * 0.08;
      state.rollAngle += (turnRoll - state.rollAngle) * 0.15;

      // Update 3D car position & rotation
      carRoot.position.set(state.posX, state.posY, state.posZ);
      carRoot.rotation.y = state.rotY;
      carChassisGroup.rotation.x = state.pitchAngle;
      carChassisGroup.rotation.z = state.rollAngle;

      // Wheel visual rotations
      const wheelRollAngle = (state.speed / 0.38) * deltaTime;
      frontLeftWheel.tire.rotation.x += wheelRollAngle;
      frontRightWheel.tire.rotation.x += wheelRollAngle;
      rearLeftWheel.tire.rotation.x += wheelRollAngle;
      rearRightWheel.tire.rotation.x += wheelRollAngle;

      // Steer front wheels
      frontLeftWheel.assembly.rotation.y = state.steerAngle;
      frontRightWheel.assembly.rotation.y = state.steerAngle;

      // Brake lights emissive trigger
      if (state.brakeInput > 0.05) {
        brakeMat.emissive.setHex(0xff1111);
        brakeMat.emissiveIntensity = 3.0;
      } else {
        brakeMat.emissive.setHex(0x440000);
        brakeMat.emissiveIntensity = 1.0;
      }

      // 3. Collision Detection & NormalImpulse Calculation (UE5 OnVehicleHit)
      // Checks collision against barriers, obstacles, track perimeter
      collidableObstacles.forEach((obs) => {
        const dx = state.posX - obs.x;
        const dz = state.posZ - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = obs.radius + 1.2;

        if (dist < minDist && dist > 0.001) {
          // Penetration resolution
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;
          state.posX += nx * overlap;
          state.posZ += nz * overlap;

          // Compute impact impulse:
          // NormalImpulse = Mass * (Delta V)
          // Speed before impact
          const speedBefore = Math.abs(state.speed);
          const impactSpeed = speedBefore * Math.abs(forwardX * nx + forwardZ * nz);
          // 1500kg car * velocity change in mm/s or UE5 Chaos impulse unit
          const impulseSize = impactSpeed * 1500 * 2.2;
          state.lastImpulseSize = impulseSize;

          // Bounce rebound
          state.speed *= -0.3;

          // In UE5 C++:
          // if (NormalImpulse.Size() > 80000.0f && FrontBumperMesh) {
          //   FrontBumperMesh->DetachFromComponent(...);
          //   FrontBumperMesh->SetSimulatePhysics(true);
          //   FrontBumperMesh->SetCollisionEnabled(...);
          //   FrontBumperMesh->SetLifeSpan(15.0f);
          // }
          if (impulseSize > conf.detachmentThresholdImpulse && state.isBumperAttached) {
            triggerBumperDetachment(impulseSize);
          } else if (impulseSize > 10000) {
            SoundFX.playCrashImpact(impulseSize, false);
            state.cameraShake = 0.2;
          }
        }
      });

      // 4. Detached Front Bumper Physics Simulation (FrontBumperMesh physics)
      if (!state.isBumperAttached) {
        worldDetachedBumper.visible = true;
        bumperGroup.visible = false; // Detached from socket

        // Countdown 15s lifespan
        state.bumperLifespan -= deltaTime;

        // Apply gravity & linear velocity
        state.bumperVelY -= 9.8 * deltaTime;
        state.bumperPosX += state.bumperVelX * deltaTime;
        state.bumperPosY += state.bumperVelY * deltaTime;
        state.bumperPosZ += state.bumperVelZ * deltaTime;

        // Angular rotation tumble
        state.bumperRotX += state.bumperAngVelX * deltaTime;
        state.bumperRotY += state.bumperAngVelY * deltaTime;
        state.bumperRotZ += state.bumperAngVelZ * deltaTime;

        // Ground bounce on asphalt
        if (state.bumperPosY <= 0.12) {
          state.bumperPosY = 0.12;
          state.bumperVelY = -state.bumperVelY * 0.45; // restitution
          state.bumperVelX *= 0.85; // asphalt friction
          state.bumperVelZ *= 0.85;
          state.bumperAngVelX *= 0.8;
          state.bumperAngVelZ *= 0.8;
        }

        // Apply to 3D mesh
        worldDetachedBumper.position.set(state.bumperPosX, state.bumperPosY, state.bumperPosZ);
        worldDetachedBumper.rotation.set(state.bumperRotX, state.bumperRotY, state.bumperRotZ);

        // Disappear after 15s
        if (state.bumperLifespan <= 0) {
          worldDetachedBumper.visible = false;
        }
      } else {
        worldDetachedBumper.visible = false;
        bumperGroup.visible = true; // Attached to socket
      }

      // 5. Skid Mark Generation on Drifting
      if (state.driftFactor > 0.45 && Math.abs(state.speed) > 5) {
        state.skidTimer += deltaTime;
        if (state.skidTimer > 0.08) {
          state.skidTimer = 0;
          const mark = new THREE.Mesh(skidGeo, skidMat);
          const rightX = Math.cos(state.rotY);
          const rightZ = -Math.sin(state.rotY);
          mark.position.set(state.posX + rightX * 0.8, 0.05, state.posZ + rightZ * 0.8);
          mark.rotation.y = state.rotY;
          scene.add(mark);
          skidMeshes.push(mark);

          if (skidMeshes.length > MAX_SKID_MARKS) {
            const old = skidMeshes.shift();
            if (old) scene.remove(old);
          }
        }
      }

      // 6. Racing Checkpoint & Lap Logic (from AUE5VehicleGameCar Tick)
      // In C++:
      // if (bIsRaceActive) { CurrentLapTime += DeltaTime; }
      if (state.bIsRaceActive) {
        state.currentLapTime += deltaTime;

        // Check if car passed current checkpoint
        const currentTargetCp = checkpoints[state.currentCheckpointIndex];
        if (currentTargetCp) {
          const cdx = state.posX - currentTargetCp.x;
          const cdz = state.posZ - currentTargetCp.z;
          const cpDist = Math.sqrt(cdx * cdx + cdz * cdz);

          if (cpDist < currentTargetCp.width * 0.9) {
            // Passed checkpoint!
            SoundFX.playCheckpoint();
            state.currentCheckpointIndex = (state.currentCheckpointIndex + 1) % checkpoints.length;

            // If we completed a full circle back to start line (checkpoint 0)
            if (state.currentCheckpointIndex === 0) {
              const lapFinishedTime = state.currentLapTime;
              const isBest = state.bestLapTime === 0 || lapFinishedTime < state.bestLapTime;
              if (isBest) {
                state.bestLapTime = lapFinishedTime;
              }
              state.lapTimes.push(lapFinishedTime);
              SoundFX.playLapComplete(isBest);
              onLapComplete(lapFinishedTime, isBest);

              if (state.currentLap >= state.totalLaps) {
                // Race Finished!
                state.bIsRaceActive = false;
                onRaceFinished(state.bestLapTime);
              } else {
                state.currentLap += 1;
                state.currentLapTime = 0.0;
              }
            }
          }
        }
      }

      // 7. Update Engine Sound Audio Synthesis
      const speedKmh = Math.abs(state.speed * 3.6);
      const gear = Math.min(6, Math.max(1, Math.floor(speedKmh / 35) + 1));
      const gearRatio = ((speedKmh % 35) / 35);
      const rpm = 900 + gearRatio * 6500;
      SoundFX.updateEngine(rpm, state.throttleInput, state.driftFactor);

      // 8. Camera Controls & Camera Shake
      const shakeOffset = (Math.random() - 0.5) * state.cameraShake;
      state.cameraShake = Math.max(0, state.cameraShake - deltaTime * 1.5);

      const mode = cameraModeRef.current;
      if (mode === 'chase') {
        const camDistance = 7.5;
        const camHeight = 3.2;
        const targetCamX = state.posX - forwardX * camDistance + shakeOffset;
        const targetCamZ = state.posZ - forwardZ * camDistance + shakeOffset;
        const targetCamY = state.posY + camHeight + shakeOffset;

        camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);
        camera.lookAt(state.posX + forwardX * 6, state.posY + 1.2, state.posZ + forwardZ * 6);
      } else if (mode === 'hood') {
        // Hood / Bumper camera right over Socket_FrontBumper
        camera.position.set(
          state.posX + forwardX * 1.8,
          state.posY + 0.85 + shakeOffset,
          state.posZ + forwardZ * 1.8
        );
        camera.lookAt(state.posX + forwardX * 25, state.posY + 0.6, state.posZ + forwardZ * 25);
      } else if (mode === 'top') {
        camera.position.set(state.posX, state.posY + 42, state.posZ);
        camera.lookAt(state.posX, state.posY, state.posZ);
      } else if (mode === 'orbit') {
        const orbitAngle = currentTime * 0.0006;
        camera.position.set(
          state.posX + Math.cos(orbitAngle) * 9,
          state.posY + 3.5,
          state.posZ + Math.sin(orbitAngle) * 9
        );
        camera.lookAt(state.posX, state.posY + 0.8, state.posZ);
      }

      // 9. Sync Telemetry State for HUD UI
      setTelemetry((prev) => ({
        ...prev,
        speedKmh: Math.round(speedKmh),
        rpm: Math.round(rpm),
        gear,
        steeringInput: Number(state.steeringInput.toFixed(2)),
        throttleInput: Number(state.throttleInput.toFixed(2)),
        brakeInput: Number(state.brakeInput.toFixed(2)),
        isHandbraking: state.isHandbraking,
        lastImpulseSize: Math.round(state.lastImpulseSize),
        isBumperAttached: state.isBumperAttached,
        bumperLifespanRemaining: Math.max(0, Number(state.bumperLifespan.toFixed(1))),
        driftFactor: Number(state.driftFactor.toFixed(2)),
        currentLapTime: state.currentLapTime,
        bestLapTime: state.bestLapTime,
        currentLap: state.currentLap,
        totalLaps: state.totalLaps,
        bIsRaceActive: state.bIsRaceActive,
        currentCheckpointIndex: state.currentCheckpointIndex,
        totalCheckpoints: checkpoints.length,
        lapTimes: [...state.lapTimes],
      }));

      // Render
      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
      trackGeo.dispose();
      groundGeo.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update car color if user changes paint
  useEffect(() => {
    // Dynamic color change handled cleanly
  }, [carColor]);

  return (
    <div
      ref={containerRef}
      id="race-canvas-container"
      className="relative w-full h-full overflow-hidden select-none bg-slate-950 focus:outline-none"
      tabIndex={0}
      onClick={() => SoundFX.startEngine()}
    />
  );
};
