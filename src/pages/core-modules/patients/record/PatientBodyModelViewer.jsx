import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  SYSTEM_VIEWS,
  getBodyModelManifest,
  getMeshSystemState,
  resolveBodyModelVariant,
} from "./patientBodyModelConfig";
import {
  disposeObject3D,
  getCameraDistanceForBounds,
  getExteriorBodyBounds,
  getSystemFocusBounds,
  getViewerMotionSettings,
  syncRendererSize,
} from "./patientBodyModelThreeUtils";

const NORMALIZED_BODY_HEIGHT = 3;

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

function cloneMaterialsAndCaptureDefaults(model) {
  model.traverse((object) => {
    if (!object.isMesh) return;
    const clonedMaterials = materialList(object.material).map((material) => {
      const clone = material.clone();
      clone.userData = {
        ...clone.userData,
        patientBodyModelDefaults: {
          transparent: clone.transparent,
          opacity: clone.opacity,
          depthWrite: clone.depthWrite,
          side: clone.side,
          emissive: clone.emissive?.clone() || null,
          emissiveIntensity: clone.emissiveIntensity,
        },
      };
      return clone;
    });
    object.material = Array.isArray(object.material)
      ? clonedMaterials
      : clonedMaterials[0];
  });
}

function restoreMaterialDefaults(material) {
  const defaults = material.userData.patientBodyModelDefaults;
  if (!defaults) return;
  material.transparent = defaults.transparent;
  material.opacity = defaults.opacity;
  material.depthWrite = defaults.depthWrite;
  material.side = defaults.side;
  if (material.emissive && defaults.emissive) {
    material.emissive.copy(defaults.emissive);
    material.emissiveIntensity = defaults.emissiveIntensity;
  }
  material.needsUpdate = true;
}

const PatientBodyModelViewer = forwardRef(function PatientBodyModelViewer(
  { activeSystem, onLoadingChange, patientGender },
  ref,
) {
  const mountRef = useRef(null);
  const runtimeRef = useRef(null);
  const activeSystemRef = useRef(activeSystem);
  const onLoadingChangeRef = useRef(onLoadingChange);
  const [error, setError] = useState("");
  const modelResolution = resolveBodyModelVariant(patientGender);
  const manifest = getBodyModelManifest(modelResolution.variant);

  activeSystemRef.current = activeSystem;
  onLoadingChangeRef.current = onLoadingChange;

  useImperativeHandle(ref, () => ({
    zoomIn: () => runtimeRef.current?.dolly(0.82),
    zoomOut: () => runtimeRef.current?.dolly(1.22),
    fullscreen: () => mountRef.current?.requestFullscreen?.(),
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let disposed = false;
    let frameId = 0;
    let model = null;
    let selectedHighlightMaterials = [];
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    camera.position.set(0, 0.2, 6.4);

    setError("");
    onLoadingChangeRef.current?.(true);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const prefersReducedMotion = Boolean(
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    );
    const motionSettings = getViewerMotionSettings(prefersReducedMotion);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 0.55;
    controls.maxDistance = 14;
    controls.autoRotate = motionSettings.autoRotate;
    controls.autoRotateSpeed = 0.45;

    scene.add(new THREE.HemisphereLight(0xe0f2fe, 0x172554, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 2);
    rim.position.set(-3, 1, -4);
    scene.add(rim);

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);

    const frameSystem = (systemId) => {
      if (!model) return;
      const view = SYSTEM_VIEWS[systemId] || SYSTEM_VIEWS.overview;
      const resolvedSystemId = SYSTEM_VIEWS[systemId] ? systemId : "overview";
      const focusBounds = getSystemFocusBounds(
        model,
        manifest,
        resolvedSystemId,
      );
      const hasFocusBounds = focusBounds && !focusBounds.isEmpty();
      const focusTarget = hasFocusBounds
        ? focusBounds.getCenter(new THREE.Vector3())
        : new THREE.Vector3(0, view.targetY, 0);
      const isFocusedSystem = Boolean(
        resolvedSystemId !== "overview" &&
          manifest.systems[resolvedSystemId]?.length,
      );
      const manifestPadding = isFocusedSystem
        ? manifest.cameraOverrides?.focusPadding
        : manifest.cameraOverrides?.overviewPadding;
      const distance = Math.max(
        hasFocusBounds
          ? getCameraDistanceForBounds(
              camera,
              focusBounds,
              isFocusedSystem
                ? view.padding || manifestPadding || 1.2
                : manifestPadding || view.padding || 1.2,
            )
          : view.distance,
        view.minDistance || 0,
      );
      const direction = camera.position.clone().sub(controls.target);
      if (direction.lengthSq() < 0.0001) direction.set(0, 0, 1);
      direction.normalize();
      controls.target.copy(focusTarget);
      camera.position.copy(focusTarget).addScaledVector(direction, distance);
      controls.update();
    };

    const applySystem = (systemId) => {
      if (!model) return;
      const resolvedSystemId = SYSTEM_VIEWS[systemId] ? systemId : "overview";
      const view = SYSTEM_VIEWS[resolvedSystemId];
      const hasAnatomicalSelection = Boolean(
        manifest.systems[resolvedSystemId]?.length,
      );
      selectedHighlightMaterials = [];

      model.traverse((object) => {
        if (!object.isMesh) return;
        const state = getMeshSystemState(
          object.name,
          resolvedSystemId,
          manifest.id,
        );
        object.visible = state.visible;
        object.renderOrder = state.selected ? 2 : 0;

        materialList(object.material).forEach((material) => {
          if (!material) return;
          restoreMaterialDefaults(material);

          if (state.isExterior && hasAnatomicalSelection) {
            material.transparent = true;
            material.opacity = 0.18;
            material.depthWrite = false;
            material.needsUpdate = true;
          }

          if (state.selected) {
            material.transparent = false;
            material.opacity = 1;
            material.depthWrite = true;
            material.side = THREE.DoubleSide;
            if (material.emissive) {
              material.emissive.set(view.color);
              material.emissiveIntensity = 0.75;
              selectedHighlightMaterials.push(material);
            }
            material.needsUpdate = true;
          }
        });
      });

      frameSystem(resolvedSystemId);
    };

    const resize = () => {
      syncRendererSize(
        renderer,
        camera,
        mount,
        window.devicePixelRatio,
      );
      frameSystem(activeSystemRef.current);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    runtimeRef.current = {
      applySystem,
      dolly: (factor) => {
        const offset = camera.position
          .clone()
          .sub(controls.target)
          .multiplyScalar(factor);
        camera.position.copy(controls.target).add(offset);
        controls.update();
      },
    };

    new GLTFLoader().load(
      manifest.url,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        model = gltf.scene;
        model.rotation.set(...manifest.initialRotation);
        model.updateWorldMatrix(true, true);
        const exteriorBounds = getExteriorBodyBounds(model, manifest);
        const exteriorSize = exteriorBounds.getSize(new THREE.Vector3());
        const exteriorCenter = exteriorBounds.getCenter(new THREE.Vector3());
        const scale =
          NORMALIZED_BODY_HEIGHT / Math.max(exteriorSize.y, Number.EPSILON);
        model.position.copy(exteriorCenter).multiplyScalar(-scale);
        model.scale.setScalar(scale);
        cloneMaterialsAndCaptureDefaults(model);
        modelRoot.add(model);
        model.updateWorldMatrix(true, true);
        applySystem(activeSystemRef.current);
        onLoadingChangeRef.current?.(false);
      },
      undefined,
      () => {
        if (disposed) return;
        setError("The selected anatomical model could not be loaded.");
        onLoadingChangeRef.current?.(false);
      },
    );

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (
        motionSettings.pulseHighlights &&
        selectedHighlightMaterials.length > 0
      ) {
        const pulse = 0.75 + Math.sin(clock.getElapsedTime() * 2.5) * 0.12;
        selectedHighlightMaterials.forEach((material) => {
          material.emissiveIntensity = pulse;
        });
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      disposeObject3D(scene);
      renderer.renderLists?.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
      runtimeRef.current = null;
    };
  }, [manifest]);

  useEffect(() => {
    runtimeRef.current?.applySystem(activeSystem);
  }, [activeSystem]);

  return (
    <div
      ref={mountRef}
      data-model-url={manifest.url}
      data-model-variant={manifest.id}
      className="absolute inset-0 overflow-hidden"
    >
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm text-rose-600 dark:text-rose-300">
          {error}
        </div>
      )}
    </div>
  );
});

export default PatientBodyModelViewer;
