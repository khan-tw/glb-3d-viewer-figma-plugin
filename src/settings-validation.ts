import type { ViewerSettings } from "./types";

const choices: Record<string, string[]> = {
  "environment.mode": ["none", "studio"],
  "material.mode": ["original", "clay", "normal", "wireframe"],
  "renderer.backgroundMode": ["transparent", "dark", "light", "figma", "warm"]
};

const ranges: Record<string, [number, number]> = {
  fov: [15, 90], "model.scale": [0.1, 50],
  "light.intensity": [0, 8], "ambientLight.intensity": [0, 4],
  "hemisphereLight.intensity": [0, 4], "fillLight.intensity": [0, 6], "rimLight.intensity": [0, 6],
  "environment.intensity": [0, 3], "renderer.toneMappingExposure": [0.2, 3],
  "fog.near": [0, 20], "fog.far": [0.1, 40]
};

// Validate before changing React state, so malformed presets cannot blank the UI.
export function parseViewerSettings(text: string, template: ViewerSettings): ViewerSettings {
  const source: unknown = JSON.parse(text);
  function read(value: unknown, expected: unknown, path: string): unknown {
    if (path === "fileName") return null;
    if (typeof expected === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Invalid ${path}`);
      const range = ranges[path] ?? (path.startsWith("model.rotation.") ? [-180, 180] : undefined);
      if (range && (value < range[0] || value > range[1])) throw new Error(`Out of range: ${path}`);
      return value;
    }
    if (typeof expected === "boolean") {
      if (typeof value !== "boolean") throw new Error(`Invalid ${path}`);
      return value;
    }
    if (typeof expected === "string") {
      if (typeof value !== "string") throw new Error(`Invalid ${path}`);
      if (choices[path] && !choices[path].includes(value)) throw new Error(`Invalid ${path}`);
      if (/color$/i.test(path) && !/^#[\da-f]{6}$/i.test(value)) throw new Error(`Invalid ${path}`);
      if (!choices[path] && !/color$|background$/i.test(path) && value !== expected) throw new Error(`Invalid ${path}`);
      return value;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Missing ${path || "settings"}`);
    return Object.fromEntries(Object.entries(expected as Record<string, unknown>).map(([key, item]) => [
      key, read((value as Record<string, unknown>)[key], item, path ? `${path}.${key}` : key)
    ]));
  }
  const settings = read(source, template, "") as ViewerSettings;
  if (settings.model.scale < 0.1 || settings.model.scale > 50 || settings.fov < 15 || settings.fov > 90
    || settings.fog.near < 0 || settings.fog.far <= settings.fog.near) {
    throw new Error("Scale, camera or fog values are outside the supported range");
  }
  return settings;
}
