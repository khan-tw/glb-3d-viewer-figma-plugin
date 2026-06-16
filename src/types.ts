export type ViewerSettings = {
  fileName: string | null;
  fov: number;
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  };
  model: {
    scale: number;
    rotation: { x: number; y: number; z: number };
  };
  light: {
    type: "directional";
    intensity: number;
    color: string;
    position: { x: number; y: number; z: number };
  };
  ambientLight: {
    intensity: number;
  };
  hemisphereLight: {
    enabled: boolean;
    intensity: number;
    skyColor: string;
    groundColor: string;
  };
  fillLight: {
    enabled: boolean;
    intensity: number;
    color: string;
    position: { x: number; y: number; z: number };
  };
  rimLight: {
    enabled: boolean;
    intensity: number;
    color: string;
    position: { x: number; y: number; z: number };
  };
  environment: {
    mode: "none" | "studio";
    intensity: number;
  };
  material: {
    mode: "original" | "clay" | "normal" | "wireframe";
  };
  fog: {
    enabled: boolean;
    color: string;
    near: number;
    far: number;
  };
  renderer: {
    toneMapping: "ACESFilmicToneMapping";
    toneMappingExposure: number;
    outputColorSpace: "srgb";
    backgroundMode: "transparent" | "dark" | "light" | "figma" | "warm";
    background: string;
    showFloor: boolean;
    shadows: boolean;
  };
};
