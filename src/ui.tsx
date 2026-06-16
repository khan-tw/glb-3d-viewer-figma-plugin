import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { CloudFog, Download, FileJson, FolderOpen, Image, Layers, Palette, RotateCcw, Sun } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import dracoDecoderSource from "three/examples/jsm/libs/draco/gltf/draco_decoder.js?raw";
import type { ViewerSettings } from "./types";
import "./styles.css";

type WindowPreset = "compact" | "default" | "wide" | "custom";

const DEFAULT_SETTINGS: ViewerSettings = {
  fileName: null,
  fov: 45,
  camera: {
    position: { x: 0, y: 0, z: 4 },
    target: { x: 0, y: 0, z: 0 }
  },
  model: {
    scale: 1,
    rotation: { x: 0, y: 0, z: 0 }
  },
  light: {
    type: "directional",
    intensity: 3,
    color: "#ffffff",
    position: { x: 3, y: 4, z: 5 }
  },
  ambientLight: {
    intensity: 1.2
  },
  hemisphereLight: {
    enabled: true,
    intensity: 0.8,
    skyColor: "#ffffff",
    groundColor: "#59616b"
  },
  fillLight: {
    enabled: true,
    intensity: 1.4,
    color: "#dcecff",
    position: { x: -4, y: 2, z: 3 }
  },
  rimLight: {
    enabled: true,
    intensity: 1,
    color: "#ffffff",
    position: { x: 0, y: 3, z: -5 }
  },
  environment: {
    mode: "studio",
    intensity: 0.9
  },
  material: {
    mode: "original"
  },
  fog: {
    enabled: false,
    color: "#111315",
    near: 6,
    far: 14
  },
  renderer: {
    toneMapping: "ACESFilmicToneMapping",
    toneMappingExposure: 1.25,
    outputColorSpace: "srgb",
    backgroundMode: "transparent",
    background: "transparent",
    showFloor: true,
    shadows: false
  }
};

type LoadState = "idle" | "loading" | "ready" | "error";
type BackgroundMode = ViewerSettings["renderer"]["backgroundMode"];

const BACKGROUNDS: Array<{ mode: BackgroundMode; label: string; color: string | null }> = [
  { mode: "transparent", label: "Empty", color: null },
  { mode: "dark", label: "Dark", color: "#111315" },
  { mode: "light", label: "Light", color: "#f4f6f8" },
  { mode: "figma", label: "Figma", color: "#e5e5e5" },
  { mode: "warm", label: "Warm", color: "#f3eee5" }
];

const MATERIAL_MODES: Array<{ mode: ViewerSettings["material"]["mode"]; label: string }> = [
  { mode: "original", label: "Original" },
  { mode: "clay", label: "Clay" },
  { mode: "normal", label: "Normal" },
  { mode: "wireframe", label: "Wireframe" }
];

const WINDOW_PRESETS: Array<{ mode: Exclude<WindowPreset, "custom">; label: string; width: number; height: number }> = [
  { mode: "compact", label: "Compact", width: 760, height: 620 },
  { mode: "default", label: "Default", width: 920, height: 680 },
  { mode: "wide", label: "Wide", width: 1240, height: 820 }
];

class InlineDRACOLoader extends DRACOLoader {
  _loadLibrary(url: string, responseType: string) {
    if (url === "draco_decoder.js" && responseType === "text") {
      return Promise.resolve(dracoDecoderSource);
    }

    return Promise.reject(new Error(`Unsupported embedded Draco decoder asset: ${url}`));
  }
}

function postPluginMessage(type: string, payload?: unknown) {
  parent.postMessage({ pluginMessage: { type, payload } }, "*");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function normalizeAngle(value: number) {
  let angle = value;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return Math.round(angle);
}

function blobToBytes(blob: Blob) {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function getMaterialNames(material: THREE.Material | THREE.Material[] | undefined) {
  if (!material) return "";
  const materials = Array.isArray(material) ? material : [material];
  return materials.map((item) => item.name).join(" ");
}

function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const exportRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const normalizedScaleRef = useRef(1);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemisphereLightRef = useRef<THREE.HemisphereLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const environmentRef = useRef<THREE.Texture | null>(null);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const modelFloorRefs = useRef<Array<{ object: THREE.Object3D; visible: boolean }>>([]);
  const frameRef = useRef<number | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const syncInFlightRef = useRef(false);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    x: number;
    y: number;
    rotation: { x: number; y: number; z: number };
  }>({
    active: false,
    pointerId: null,
    x: 0,
    y: 0,
    rotation: { x: 0, y: 0, z: 0 }
  });
  const resizeDragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  });

  const [settings, setSettings] = useState<ViewerSettings>(DEFAULT_SETTINGS);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [syncPreview, setSyncPreview] = useState(true);
  const [targetFrame, setTargetFrame] = useState<{ name: string; width: number; height: number } | null>(null);
  const [windowPreset, setWindowPreset] = useState<WindowPreset>("default");

  const exportJson = useMemo(() => JSON.stringify(settings, null, 2), [settings]);
  const previewAspectRatio = targetFrame
    ? `${Math.max(1, targetFrame.width)} / ${Math.max(1, targetFrame.height)}`
    : "16 / 9";

  useEffect(() => {
    const receiveMessage = (event: MessageEvent) => {
      const message = event.data?.pluginMessage;
      if (message?.type === "target-frame") {
        setTargetFrame(message.frame);
      }
    };

    window.addEventListener("message", receiveMessage);
    postPluginMessage("request-target-frame");
    return () => window.removeEventListener("message", receiveMessage);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(DEFAULT_SETTINGS.fov, 1, 0.01, 1000);
    camera.position.set(
      DEFAULT_SETTINGS.camera.position.x,
      DEFAULT_SETTINGS.camera.position.y,
      DEFAULT_SETTINGS.camera.position.z
    );
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearAlpha(0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = DEFAULT_SETTINGS.renderer.toneMappingExposure;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const exportRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    exportRenderer.setPixelRatio(1);
    exportRenderer.setClearAlpha(0);
    exportRenderer.outputColorSpace = THREE.SRGBColorSpace;
    exportRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    exportRenderer.toneMappingExposure = DEFAULT_SETTINGS.renderer.toneMappingExposure;
    exportRendererRef.current = exportRenderer;

    const ambient = new THREE.AmbientLight(0xffffff, DEFAULT_SETTINGS.ambientLight.intensity);
    scene.add(ambient);
    ambientLightRef.current = ambient;

    const hemisphere = new THREE.HemisphereLight(
      DEFAULT_SETTINGS.hemisphereLight.skyColor,
      DEFAULT_SETTINGS.hemisphereLight.groundColor,
      DEFAULT_SETTINGS.hemisphereLight.intensity
    );
    hemisphere.visible = DEFAULT_SETTINGS.hemisphereLight.enabled;
    scene.add(hemisphere);
    hemisphereLightRef.current = hemisphere;

    const light = new THREE.DirectionalLight(DEFAULT_SETTINGS.light.color, DEFAULT_SETTINGS.light.intensity);
    light.position.set(
      DEFAULT_SETTINGS.light.position.x,
      DEFAULT_SETTINGS.light.position.y,
      DEFAULT_SETTINGS.light.position.z
    );
    scene.add(light);
    lightRef.current = light;

    const fillLight = new THREE.DirectionalLight(DEFAULT_SETTINGS.fillLight.color, DEFAULT_SETTINGS.fillLight.intensity);
    fillLight.position.set(
      DEFAULT_SETTINGS.fillLight.position.x,
      DEFAULT_SETTINGS.fillLight.position.y,
      DEFAULT_SETTINGS.fillLight.position.z
    );
    fillLight.visible = DEFAULT_SETTINGS.fillLight.enabled;
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(DEFAULT_SETTINGS.rimLight.color, DEFAULT_SETTINGS.rimLight.intensity);
    rimLight.position.set(
      DEFAULT_SETTINGS.rimLight.position.x,
      DEFAULT_SETTINGS.rimLight.position.y,
      DEFAULT_SETTINGS.rimLight.position.z
    );
    rimLight.visible = DEFAULT_SETTINGS.rimLight.enabled;
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    environmentRef.current = environment;
    scene.environment = DEFAULT_SETTINGS.environment.mode === "studio" ? environment : null;
    scene.environmentIntensity = DEFAULT_SETTINGS.environment.intensity;
    pmremGenerator.dispose();

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const animate = () => {
      renderer.render(scene, camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    resize();
    animate();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      resizeObserver.disconnect();
      exportRenderer.dispose();
      renderer.dispose();
      environmentRef.current?.dispose();
      renderer.domElement.remove();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.fov = settings.fov;
    camera.updateProjectionMatrix();
  }, [settings.fov]);

  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    light.intensity = settings.light.intensity;
    light.color.set(settings.light.color);
    light.position.set(settings.light.position.x, settings.light.position.y, settings.light.position.z);
  }, [settings.light]);

  useEffect(() => {
    const ambient = ambientLightRef.current;
    if (!ambient) return;
    ambient.intensity = settings.ambientLight.intensity;
  }, [settings.ambientLight.intensity]);

  useEffect(() => {
    const hemisphere = hemisphereLightRef.current;
    if (!hemisphere) return;
    hemisphere.visible = settings.hemisphereLight.enabled;
    hemisphere.intensity = settings.hemisphereLight.intensity;
    hemisphere.color.set(settings.hemisphereLight.skyColor);
    hemisphere.groundColor.set(settings.hemisphereLight.groundColor);
  }, [settings.hemisphereLight]);

  useEffect(() => {
    const fill = fillLightRef.current;
    if (!fill) return;
    fill.visible = settings.fillLight.enabled;
    fill.intensity = settings.fillLight.intensity;
    fill.color.set(settings.fillLight.color);
    fill.position.set(settings.fillLight.position.x, settings.fillLight.position.y, settings.fillLight.position.z);
  }, [settings.fillLight]);

  useEffect(() => {
    const rim = rimLightRef.current;
    if (!rim) return;
    rim.visible = settings.rimLight.enabled;
    rim.intensity = settings.rimLight.intensity;
    rim.color.set(settings.rimLight.color);
    rim.position.set(settings.rimLight.position.x, settings.rimLight.position.y, settings.rimLight.position.z);
  }, [settings.rimLight]);

  useEffect(() => {
    applyModelTransform(settings);
  }, [settings.model]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.environment = settings.environment.mode === "studio" ? environmentRef.current : null;
    scene.environmentIntensity = settings.environment.intensity;
  }, [settings.environment]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.fog = settings.fog.enabled
      ? new THREE.Fog(settings.fog.color, settings.fog.near, settings.fog.far)
      : null;
  }, [settings.fog]);

  useEffect(() => {
    applyMaterialMode(settings.material.mode);
  }, [settings.material.mode]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const exportRenderer = exportRendererRef.current;
    if (!renderer || !exportRenderer) return;
    renderer.toneMappingExposure = settings.renderer.toneMappingExposure;
    exportRenderer.toneMappingExposure = settings.renderer.toneMappingExposure;
    renderer.shadowMap.enabled = settings.renderer.shadows;
    exportRenderer.shadowMap.enabled = settings.renderer.shadows;
    applyShadowSettings(settings.renderer.shadows);
  }, [settings.renderer.toneMappingExposure, settings.renderer.shadows]);

  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const exportRenderer = exportRendererRef.current;
    if (!scene || !renderer) return;

    const background = BACKGROUNDS.find((item) => item.mode === settings.renderer.backgroundMode);
    if (background?.color) {
      scene.background = new THREE.Color(background.color);
      renderer.setClearAlpha(1);
      exportRenderer?.setClearAlpha(1);
    } else {
      scene.background = null;
      renderer.setClearAlpha(0);
      exportRenderer?.setClearAlpha(0);
    }

    applyModelFloorVisibility(settings.renderer.showFloor);
  }, [settings.renderer.backgroundMode, settings.renderer.showFloor]);

  useEffect(() => {
    if (!syncPreview || loadState !== "ready") return;

    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      void syncCanvasToFigmaFrame();
    }, 180);
  }, [settings, syncPreview, loadState]);

  async function handleFile(file: File) {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera) return;

    setLoadState("loading");
    setError(null);

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);

    if (modelRef.current) {
      applyMaterialMode("original");
      scene.remove(modelRef.current);
      disposeObject(modelRef.current);
      modelRef.current = null;
      originalMaterialsRef.current.clear();
      modelFloorRefs.current = [];
    }

    try {
      const loader = new GLTFLoader();
      const dracoLoader = new InlineDRACOLoader();
      dracoLoader.setDecoderConfig({ type: "js" });
      dracoLoader.setWorkerLimit(2);
      loader.setDRACOLoader(dracoLoader);
      const gltf = await loader.loadAsync(objectUrlRef.current);
      const model = new THREE.Group();
      originalMaterialsRef.current.clear();
      captureOriginalMaterials(gltf.scene);
      modelFloorRefs.current = detectModelFloorMeshes(gltf.scene);
      applyModelFloorVisibility(settings.renderer.showFloor);
      normalizeModel(gltf.scene);
      model.add(gltf.scene);
      scene.add(model);
      modelRef.current = model;
      applyModelTransform(settings);
      applyMaterialMode(settings.material.mode);
      applyShadowSettings(settings.renderer.shadows);

      camera.position.set(0, 0, 4);
      camera.lookAt(0, 0, 0);

      setSettings((current) => ({
        ...current,
        fileName: file.name,
        camera: {
          position: { x: 0, y: 0, z: 4 },
          target: { x: 0, y: 0, z: 0 }
        }
      }));
      setLoadState("ready");
      postPluginMessage("notify", { text: `Loaded ${file.name}` });
      dracoLoader.dispose();
      window.setTimeout(() => void syncCanvasToFigmaFrame(), 120);
      window.setTimeout(() => void syncCanvasToFigmaFrame(), 700);
    } catch (loadError) {
      setLoadState("error");
      setError(loadError instanceof Error ? loadError.message : "Unable to load this GLB file.");
    }
  }

  function normalizeModel(model: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxAxis = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.4 / maxAxis;
    normalizedScaleRef.current = 1;
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  }

  function detectModelFloorMeshes(model: THREE.Object3D) {
    model.updateWorldMatrix(true, true);
    const modelBox = new THREE.Box3().setFromObject(model);
    const modelSize = new THREE.Vector3();
    const modelCenter = new THREE.Vector3();
    modelBox.getSize(modelSize);
    modelBox.getCenter(modelCenter);
    const modelFootprint = Math.max(modelSize.x * modelSize.z, 1);
    const floorPattern = /(floor|ground|plane|shadow|catcher|backdrop|base)/i;
    const candidates: Array<{ object: THREE.Object3D; visible: boolean }> = [];

    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;

      const materialNames = getMaterialNames(mesh.material);
      const label = `${mesh.name} ${materialNames}`;
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const footprint = size.x * size.z;
      const namedLikeFloor = floorPattern.test(label);
      const looksLikeLargeFlatFloor =
        size.y <= Math.max(modelSize.y * 0.08, 0.02) &&
        footprint >= modelFootprint * 0.28 &&
        center.y <= modelCenter.y - modelSize.y * 0.18;

      if (namedLikeFloor || looksLikeLargeFlatFloor) {
        candidates.push({ object: mesh, visible: mesh.visible });
      }
    });

    return candidates;
  }

  function applyModelFloorVisibility(showFloor: boolean) {
    modelFloorRefs.current.forEach(({ object, visible }) => {
      object.visible = showFloor ? visible : false;
    });
  }

  function applyModelTransform(nextSettings: ViewerSettings) {
    const model = modelRef.current;
    if (!model) return;

    model.scale.setScalar(normalizedScaleRef.current * nextSettings.model.scale);
    model.rotation.set(
      toRadians(nextSettings.model.rotation.x),
      toRadians(nextSettings.model.rotation.y),
      toRadians(nextSettings.model.rotation.z)
    );
  }

  function captureOriginalMaterials(object: THREE.Object3D) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      originalMaterialsRef.current.set(mesh, mesh.material);
    });
  }

  function applyMaterialMode(mode: ViewerSettings["material"]["mode"]) {
    originalMaterialsRef.current.forEach((originalMaterial, mesh) => {
      const previousMaterial = mesh.material;
      if (previousMaterial !== originalMaterial) disposeMaterial(previousMaterial);

      if (mode === "original") {
        mesh.material = originalMaterial;
        return;
      }

      if (mode === "normal") {
        mesh.material = new THREE.MeshNormalMaterial({ flatShading: false });
        return;
      }

      if (mode === "wireframe") {
        mesh.material = new THREE.MeshBasicMaterial({ color: 0xd8dde2, wireframe: true });
        return;
      }

      mesh.material = new THREE.MeshStandardMaterial({
        color: 0xb8bdc3,
        roughness: 0.76,
        metalness: 0.05
      });
    });
  }

  function applyShadowSettings(enabled: boolean) {
    if (lightRef.current) lightRef.current.castShadow = enabled;
    if (fillLightRef.current) fillLightRef.current.castShadow = false;
    if (rimLightRef.current) rimLightRef.current.castShadow = false;

    modelRef.current?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = enabled;
      mesh.receiveShadow = enabled;
    });
  }

  function disposeMaterial(material: THREE.Material | THREE.Material[]) {
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
      return;
    }

    material.dispose();
  }

  function disposeObject(object: THREE.Object3D) {
    object.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const material = mesh.material;
      if (material) disposeMaterial(material);
    });
  }

  function updateLightAxis(axis: "x" | "y" | "z", value: number) {
    setSettings((current) => ({
      ...current,
      light: {
        ...current.light,
        position: {
          ...current.light.position,
          [axis]: value
        }
      }
    }));
  }

  function updateFillLightAxis(axis: "x" | "y" | "z", value: number) {
    setSettings((current) => ({
      ...current,
      fillLight: {
        ...current.fillLight,
        position: {
          ...current.fillLight.position,
          [axis]: value
        }
      }
    }));
  }

  function updateRimLightAxis(axis: "x" | "y" | "z", value: number) {
    setSettings((current) => ({
      ...current,
      rimLight: {
        ...current.rimLight,
        position: {
          ...current.rimLight.position,
          [axis]: value
        }
      }
    }));
  }

  function updateModelScale(value: number) {
    const scale = clamp(value, 0, 50);
    setSettings((current) => ({ ...current, model: { ...current.model, scale } }));
  }

  function updateModelRotation(axis: "x" | "y" | "z", value: number) {
    setSettings((current) => ({
      ...current,
      model: {
        ...current.model,
        rotation: {
          ...current.model.rotation,
          [axis]: normalizeAngle(value)
        }
      }
    }));
  }

  function handlePreviewPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (loadState !== "ready") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rotation: { ...settings.model.rotation }
    };
  }

  function handlePreviewPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    setSettings((current) => ({
      ...current,
      model: {
        ...current.model,
        rotation: {
          ...current.model.rotation,
          x: normalizeAngle(drag.rotation.x + dy * 0.5),
          y: normalizeAngle(drag.rotation.y + dx * 0.5)
        }
      }
    }));
  }

  function handlePreviewPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current.pointerId === event.pointerId) {
      dragRef.current.active = false;
      dragRef.current.pointerId = null;
    }
  }

  function handlePreviewWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (loadState !== "ready") return;
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    updateModelScale(Number((settings.model.scale * factor).toFixed(3)));
  }

  async function syncCanvasToFigmaFrame() {
    if (syncInFlightRef.current) return;
    const renderer = exportRendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera || !modelRef.current) return;

    syncInFlightRef.current = true;
    const frameWidth = Math.max(1, targetFrame?.width ?? 720);
    const frameHeight = Math.max(1, targetFrame?.height ?? 480);
    const longestSide = Math.max(frameWidth, frameHeight);
    const scale = Math.min(2, 1600 / longestSide);
    const renderWidth = Math.max(1, Math.round(frameWidth * scale));
    const renderHeight = Math.max(1, Math.round(frameHeight * scale));
    const exportCamera = camera.clone();
    exportCamera.aspect = renderWidth / renderHeight;
    exportCamera.updateProjectionMatrix();
    renderer.setSize(renderWidth, renderHeight, false);
    renderer.render(scene, exportCamera);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        renderer.domElement.toBlob(resolve, "image/png");
      });
      if (!blob) return;
      const bytes = await blobToBytes(blob);
      postPluginMessage("render-preview", {
        bytes: bytes.buffer,
        width: renderWidth,
        height: renderHeight,
        settings
      });
    } finally {
      syncInFlightRef.current = false;
    }
  }

  function updateBackground(mode: BackgroundMode) {
    const background = BACKGROUNDS.find((item) => item.mode === mode);
    setSettings((current) => ({
      ...current,
      renderer: {
        ...current.renderer,
        backgroundMode: mode,
        background: background?.color ?? "transparent"
      }
    }));
  }

  function updateFloorVisibility(showFloor: boolean) {
    setSettings((current) => ({
      ...current,
      renderer: {
        ...current.renderer,
        showFloor
      }
    }));
  }

  function resizeWindow(mode: Exclude<WindowPreset, "custom">) {
    const preset = WINDOW_PRESETS.find((item) => item.mode === mode);
    if (!preset) return;
    setWindowPreset(mode);
    postPluginMessage("resize-ui", { width: preset.width, height: preset.height });
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeDragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: window.innerWidth,
      startHeight: window.innerHeight
    };
    setWindowPreset("custom");
  }

  function handleResizePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = resizeDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;

    const width = Math.round(drag.startWidth + (event.clientX - drag.startX));
    const height = Math.round(drag.startHeight + (event.clientY - drag.startY));
    postPluginMessage("resize-ui", { width, height });
  }

  function handleResizePointerEnd(event: React.PointerEvent<HTMLButtonElement>) {
    if (resizeDragRef.current.pointerId !== event.pointerId) return;
    resizeDragRef.current.active = false;
    resizeDragRef.current.pointerId = null;
  }

  async function copyJson() {
    await navigator.clipboard.writeText(exportJson);
    postPluginMessage("export-settings", settings);
    postPluginMessage("notify", { text: "Parameters copied as JSON." });
  }

  function downloadJson() {
    const blob = new Blob([exportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${settings.fileName?.replace(/\.glb$/i, "") || "glb-viewer"}-settings.json`;
    link.click();
    URL.revokeObjectURL(url);
    postPluginMessage("export-settings", settings);
  }

  function resetSettings() {
    const camera = cameraRef.current;
    if (camera) {
      camera.position.set(
        DEFAULT_SETTINGS.camera.position.x,
        DEFAULT_SETTINGS.camera.position.y,
        DEFAULT_SETTINGS.camera.position.z
      );
      camera.lookAt(0, 0, 0);
    }
    applyModelTransform(DEFAULT_SETTINGS);
    setSettings((current) => ({
      ...DEFAULT_SETTINGS,
      fileName: current.fileName
    }));
  }

  return (
    <main className="shell">
      <section className="preview-pane">
        <div className="section preview-section">
          <div className="section-title">
            <span>Preview</span>
          </div>
          <div
            className="render-host"
            ref={mountRef}
            style={{ "--preview-aspect-ratio": previewAspectRatio } as React.CSSProperties}
            onPointerDown={handlePreviewPointerDown}
            onPointerMove={handlePreviewPointerMove}
            onPointerUp={handlePreviewPointerEnd}
            onPointerCancel={handlePreviewPointerEnd}
            onWheel={handlePreviewWheel}
          >
            {loadState !== "ready" && (
              <div className="preview-empty">
                {loadState === "loading" ? "Loading GLB..." : "Import a GLB to preview"}
              </div>
            )}
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Target Frame</span>
            <Image size={16} />
          </div>
          <div className="target-frame">
            <strong>{targetFrame?.name ?? "No frame selected"}</strong>
            <span>
              {targetFrame ? `${Math.round(targetFrame.width)} x ${Math.round(targetFrame.height)}` : "Select one frame, then run the plugin."}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,model/gltf-binary"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen size={16} />
            Import GLB
          </button>
          <div className={loadState === "error" ? "status error" : "status"}>
            {loadState === "idle" && (settings.fileName || "No GLB loaded")}
            {loadState === "loading" && "Loading GLB..."}
            {loadState === "ready" && `${settings.fileName} is synced to the target frame.`}
            {loadState === "error" && (error || "Unable to load this GLB file.")}
          </div>
          <button
            type="button"
            onClick={() => {
              postPluginMessage("use-selected-frame");
              window.setTimeout(() => void syncCanvasToFigmaFrame(), 120);
            }}
          >
            <Image size={16} />
            Use Selected Frame
          </button>
          <button type="button" onClick={() => void syncCanvasToFigmaFrame()}>
            <Image size={16} />
            Sync Frame
          </button>
          <label className="check-row">
            <span>Live sync</span>
            <input
              type="checkbox"
              checked={syncPreview}
              onChange={(event) => {
                setSyncPreview(event.target.checked);
                if (event.target.checked) window.setTimeout(() => void syncCanvasToFigmaFrame(), 120);
              }}
            />
          </label>
        </div>
      </section>

      <aside className="controls-pane">
        <div className="section">
          <div className="section-title">
            <span>Window</span>
          </div>
          <div className="segmented-control segmented-control-wide">
            {WINDOW_PRESETS.map((item) => (
              <button
                key={item.mode}
                type="button"
                className={windowPreset === item.mode ? "segment active" : "segment"}
                onClick={() => resizeWindow(item.mode)}
              >
                {item.label}
              </button>
            ))}
            <button type="button" className={windowPreset === "custom" ? "segment active" : "segment"} disabled>
              Custom
            </button>
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Background</span>
          </div>
          <div className="preset-grid">
            {BACKGROUNDS.map((item) => (
              <button
                key={item.mode}
                type="button"
                className={settings.renderer.backgroundMode === item.mode ? "preset active" : "preset"}
                onClick={() => updateBackground(item.mode)}
              >
                <span
                  className={item.mode === "transparent" ? "swatch transparent" : "swatch"}
                  style={{ backgroundColor: item.color ?? undefined }}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            <span>GLB Floor</span>
          </div>
          <label className="check-row">
            <span>Show model floor / shadow</span>
            <input
              type="checkbox"
              checked={settings.renderer.showFloor}
              onChange={(event) => updateFloorVisibility(event.target.checked)}
            />
          </label>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Renderer</span>
            <Layers size={16} />
          </div>
          <label>
            <span>Exposure</span>
            <output>{settings.renderer.toneMappingExposure.toFixed(2)}</output>
            <input
              type="range"
              min="0.2"
              max="3"
              step="0.05"
              value={settings.renderer.toneMappingExposure}
              onChange={(event) => {
                const toneMappingExposure = Number(event.target.value);
                setSettings((current) => ({
                  ...current,
                  renderer: { ...current.renderer, toneMappingExposure }
                }));
              }}
            />
          </label>
          <label className="check-row">
            <span>Shadows</span>
            <input
              type="checkbox"
              checked={settings.renderer.shadows}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  renderer: { ...current.renderer, shadows: event.target.checked }
                }));
              }}
            />
          </label>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Environment</span>
          </div>
          <div className="segmented-control">
            {(["none", "studio"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={settings.environment.mode === mode ? "segment active" : "segment"}
                onClick={() => {
                  setSettings((current) => ({
                    ...current,
                    environment: { ...current.environment, mode }
                  }));
                }}
              >
                {mode === "none" ? "None" : "Studio"}
              </button>
            ))}
          </div>
          <label>
            <span>Environment intensity</span>
            <output>{settings.environment.intensity.toFixed(2)}</output>
            <input
              type="range"
              min="0"
              max="3"
              step="0.05"
              value={settings.environment.intensity}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                setSettings((current) => ({
                  ...current,
                  environment: { ...current.environment, intensity }
                }));
              }}
            />
          </label>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Material View</span>
            <Palette size={16} />
          </div>
          <div className="preset-grid">
            {MATERIAL_MODES.map((item) => (
              <button
                key={item.mode}
                type="button"
                className={settings.material.mode === item.mode ? "preset active" : "preset"}
                onClick={() => {
                  setSettings((current) => ({
                    ...current,
                    material: { mode: item.mode }
                  }));
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Model</span>
            <button className="icon-button" type="button" title="Reset settings" onClick={resetSettings}>
              <RotateCcw size={16} />
            </button>
          </div>
          <label>
            <span>Scale</span>
            <output>{settings.model.scale.toFixed(2)}x</output>
            <input
              type="range"
              min="0"
              max="50"
              step="0.1"
              value={settings.model.scale}
              onChange={(event) => {
                updateModelScale(Number(event.target.value));
              }}
            />
          </label>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              <span>Rotate {axis.toUpperCase()}</span>
              <output>{settings.model.rotation[axis]} deg</output>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={settings.model.rotation[axis]}
                onChange={(event) => {
                  updateModelRotation(axis, Number(event.target.value));
                }}
              />
            </label>
          ))}
        </div>

        <div className="section">
          <div className="section-title">
            <span>Camera</span>
          </div>
          <label>
            <span>FOV</span>
            <output>{settings.fov} deg</output>
            <input
              type="range"
              min="15"
              max="90"
              step="1"
              value={settings.fov}
              onChange={(event) => {
                const fov = clamp(Number(event.target.value), 15, 90);
                setSettings((current) => ({ ...current, fov }));
              }}
            />
          </label>
          <div className="vector-readout">
            <span>Position</span>
            <code>
              {settings.camera.position.x}, {settings.camera.position.y}, {settings.camera.position.z}
            </code>
          </div>
          <div className="vector-readout">
            <span>Target</span>
            <code>
              {settings.camera.target.x}, {settings.camera.target.y}, {settings.camera.target.z}
            </code>
          </div>
        </div>

        <div className="section">
          <div className="section-title">
            <span>Light</span>
            <Sun size={16} />
          </div>
          <label>
            <span>Key intensity</span>
            <output>{settings.light.intensity.toFixed(1)}</output>
            <input
              type="range"
              min="0"
              max="8"
              step="0.1"
              value={settings.light.intensity}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                setSettings((current) => ({ ...current, light: { ...current.light, intensity } }));
              }}
            />
          </label>
          <label className="color-row">
            <span>Key color</span>
            <input
              type="color"
              value={settings.light.color}
              onChange={(event) => {
                setSettings((current) => ({ ...current, light: { ...current.light, color: event.target.value } }));
              }}
            />
          </label>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={axis}>
              <span>Key {axis.toUpperCase()}</span>
              <output>{settings.light.position[axis].toFixed(1)}</output>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={settings.light.position[axis]}
                onChange={(event) => updateLightAxis(axis, Number(event.target.value))}
              />
            </label>
          ))}
          <label>
            <span>Ambient intensity</span>
            <output>{settings.ambientLight.intensity.toFixed(1)}</output>
            <input
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={settings.ambientLight.intensity}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                setSettings((current) => ({ ...current, ambientLight: { intensity } }));
              }}
            />
          </label>
          <label className="check-row">
            <span>Hemisphere light</span>
            <input
              type="checkbox"
              checked={settings.hemisphereLight.enabled}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  hemisphereLight: { ...current.hemisphereLight, enabled: event.target.checked }
                }));
              }}
            />
          </label>
          <label>
            <span>Hemisphere intensity</span>
            <output>{settings.hemisphereLight.intensity.toFixed(1)}</output>
            <input
              type="range"
              min="0"
              max="4"
              step="0.1"
              value={settings.hemisphereLight.intensity}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                setSettings((current) => ({
                  ...current,
                  hemisphereLight: { ...current.hemisphereLight, intensity }
                }));
              }}
            />
          </label>
          <div className="color-grid">
            <label className="color-row">
              <span>Sky</span>
              <input
                type="color"
                value={settings.hemisphereLight.skyColor}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    hemisphereLight: { ...current.hemisphereLight, skyColor: event.target.value }
                  }));
                }}
              />
            </label>
            <label className="color-row">
              <span>Ground</span>
              <input
                type="color"
                value={settings.hemisphereLight.groundColor}
                onChange={(event) => {
                  setSettings((current) => ({
                    ...current,
                    hemisphereLight: { ...current.hemisphereLight, groundColor: event.target.value }
                  }));
                }}
              />
            </label>
          </div>
          <label className="check-row">
            <span>Fill light</span>
            <input
              type="checkbox"
              checked={settings.fillLight.enabled}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  fillLight: { ...current.fillLight, enabled: event.target.checked }
                }));
              }}
            />
          </label>
          <label>
            <span>Fill intensity</span>
            <output>{settings.fillLight.intensity.toFixed(1)}</output>
            <input
              type="range"
              min="0"
              max="6"
              step="0.1"
              value={settings.fillLight.intensity}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                setSettings((current) => ({ ...current, fillLight: { ...current.fillLight, intensity } }));
              }}
            />
          </label>
          <label className="color-row">
            <span>Fill color</span>
            <input
              type="color"
              value={settings.fillLight.color}
              onChange={(event) => {
                setSettings((current) => ({ ...current, fillLight: { ...current.fillLight, color: event.target.value } }));
              }}
            />
          </label>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={`fill-${axis}`}>
              <span>Fill {axis.toUpperCase()}</span>
              <output>{settings.fillLight.position[axis].toFixed(1)}</output>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={settings.fillLight.position[axis]}
                onChange={(event) => updateFillLightAxis(axis, Number(event.target.value))}
              />
            </label>
          ))}
          <label className="check-row">
            <span>Rim light</span>
            <input
              type="checkbox"
              checked={settings.rimLight.enabled}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  rimLight: { ...current.rimLight, enabled: event.target.checked }
                }));
              }}
            />
          </label>
          <label>
            <span>Rim intensity</span>
            <output>{settings.rimLight.intensity.toFixed(1)}</output>
            <input
              type="range"
              min="0"
              max="6"
              step="0.1"
              value={settings.rimLight.intensity}
              onChange={(event) => {
                const intensity = Number(event.target.value);
                setSettings((current) => ({ ...current, rimLight: { ...current.rimLight, intensity } }));
              }}
            />
          </label>
          <label className="color-row">
            <span>Rim color</span>
            <input
              type="color"
              value={settings.rimLight.color}
              onChange={(event) => {
                setSettings((current) => ({ ...current, rimLight: { ...current.rimLight, color: event.target.value } }));
              }}
            />
          </label>
          {(["x", "y", "z"] as const).map((axis) => (
            <label key={`rim-${axis}`}>
              <span>Rim {axis.toUpperCase()}</span>
              <output>{settings.rimLight.position[axis].toFixed(1)}</output>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
                value={settings.rimLight.position[axis]}
                onChange={(event) => updateRimLightAxis(axis, Number(event.target.value))}
              />
            </label>
          ))}
        </div>

        <div className="section">
          <div className="section-title">
            <span>Atmosphere</span>
            <CloudFog size={16} />
          </div>
          <label className="check-row">
            <span>Fog</span>
            <input
              type="checkbox"
              checked={settings.fog.enabled}
              onChange={(event) => {
                setSettings((current) => ({
                  ...current,
                  fog: { ...current.fog, enabled: event.target.checked }
                }));
              }}
            />
          </label>
          <label className="color-row">
            <span>Fog color</span>
            <input
              type="color"
              value={settings.fog.color}
              onChange={(event) => {
                setSettings((current) => ({ ...current, fog: { ...current.fog, color: event.target.value } }));
              }}
            />
          </label>
          <label>
            <span>Fog near</span>
            <output>{settings.fog.near.toFixed(1)}</output>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={settings.fog.near}
              onChange={(event) => {
                const near = Number(event.target.value);
                setSettings((current) => ({
                  ...current,
                  fog: { ...current.fog, near: Math.min(near, current.fog.far - 0.1) }
                }));
              }}
            />
          </label>
          <label>
            <span>Fog far</span>
            <output>{settings.fog.far.toFixed(1)}</output>
            <input
              type="range"
              min="0.1"
              max="40"
              step="0.1"
              value={settings.fog.far}
              onChange={(event) => {
                const far = Number(event.target.value);
                setSettings((current) => ({
                  ...current,
                  fog: { ...current.fog, far: Math.max(far, current.fog.near + 0.1) }
                }));
              }}
            />
          </label>
        </div>

        <div className="section export-section">
          <div className="section-title">
            <span>Export</span>
            <FileJson size={16} />
          </div>
          <textarea readOnly value={exportJson} />
          <div className="export-actions">
            <button type="button" onClick={copyJson}>
              <FileJson size={16} />
              Copy JSON
            </button>
            <button type="button" onClick={downloadJson}>
              <Download size={16} />
              Download
            </button>
          </div>
        </div>
      </aside>
      <button
        type="button"
        className="window-resize-handle"
        aria-label="Resize window"
        title="Drag to resize"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerEnd}
        onPointerCancel={handleResizePointerEnd}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
