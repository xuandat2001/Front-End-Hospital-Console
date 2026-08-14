import * as THREE from "three";
import {
  isExteriorMesh,
  isMeshSelectedForSystem,
} from "./patientBodyModelConfig";

const MAX_DEVICE_PIXEL_RATIO = 2;

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

export function disposeObject3D(root) {
  if (!root) return;
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  const disposedTextures = new Set();

  root.traverse((object) => {
    if (object.geometry && !disposedGeometries.has(object.geometry)) {
      disposedGeometries.add(object.geometry);
      object.geometry.dispose();
    }

    materialList(object.material).forEach((material) => {
      if (!material || disposedMaterials.has(material)) return;
      disposedMaterials.add(material);
      Object.values(material).forEach((value) => {
        if (value?.isTexture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      });
      material.dispose();
    });
  });
}

export function getAggregateMeshBounds(model, predicate) {
  if (!model) return null;
  const aggregateBounds = new THREE.Box3();
  let matchCount = 0;

  model.updateWorldMatrix(true, true);
  model.traverse((object) => {
    if (!object.isMesh || !predicate(object)) return;
    aggregateBounds.expandByObject(object);
    matchCount += 1;
  });

  return matchCount > 0 ? aggregateBounds : null;
}

export function getExteriorBodyBounds(model, manifest) {
  return (
    getAggregateMeshBounds(model, (object) =>
      isExteriorMesh(object.name, manifest),
    ) || new THREE.Box3().setFromObject(model)
  );
}

export function getSystemFocusBounds(model, manifest, systemId) {
  if (systemId === "overview" || !manifest.systems[systemId]?.length) {
    return getExteriorBodyBounds(model, manifest);
  }

  return (
    getAggregateMeshBounds(model, (object) =>
      isMeshSelectedForSystem(object.name, systemId, manifest),
    ) || getExteriorBodyBounds(model, manifest)
  );
}

export function getCameraDistanceForBounds(camera, bounds, padding = 1.2) {
  if (!bounds || bounds.isEmpty()) return 0;
  const size = bounds.getSize(new THREE.Vector3());
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov =
    2 * Math.atan(Math.tan(verticalFov / 2) * Math.max(camera.aspect, 0.01));
  const verticalDistance = size.y / 2 / Math.tan(verticalFov / 2);
  const horizontalDistance = size.x / 2 / Math.tan(horizontalFov / 2);

  return (
    Math.max(verticalDistance, horizontalDistance) * padding + size.z / 2
  );
}

export function syncRendererSize(
  renderer,
  camera,
  mount,
  devicePixelRatio = 1,
) {
  const width = Math.max(mount.clientWidth, 1);
  const height = Math.max(mount.clientHeight, 1);
  renderer.setPixelRatio(
    Math.min(Math.max(devicePixelRatio || 1, 1), MAX_DEVICE_PIXEL_RATIO),
  );
  // `updateStyle=true` keeps the CSS canvas footprint equal to the observed
  // container while Three.js independently scales the drawing buffer for DPR.
  renderer.setSize(width, height, true);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  return { width, height };
}

export function getViewerMotionSettings(prefersReducedMotion) {
  return {
    autoRotate: !prefersReducedMotion,
    pulseHighlights: !prefersReducedMotion,
  };
}
