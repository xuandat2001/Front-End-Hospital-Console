/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const threeRuntime = vi.hoisted(() => ({
  renderers: [],
}));
const loaderRuntime = vi.hoisted(() => ({
  requests: [],
}));
const controlsRuntime = vi.hoisted(() => ({
  controls: [],
}));
const resizeRuntime = vi.hoisted(() => ({
  observers: [],
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal();

  class MockWebGLRenderer {
    constructor() {
      this.domElement = document.createElement("canvas");
      this.renderLists = { dispose: vi.fn() };
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn();
      this.render = vi.fn();
      this.dispose = vi.fn();
      this.forceContextLoss = vi.fn();
      threeRuntime.renderers.push(this);
    }
  }

  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class MockGLTFLoader {
    load(url, onLoad, onProgress, onError) {
      loaderRuntime.requests.push({ url, onLoad, onProgress, onError });
    }
  },
}));

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => ({
  OrbitControls: class MockOrbitControls {
    constructor() {
      this.target = {
        x: 0,
        y: 0,
        z: 0,
        copy(value) {
          this.x = value.x;
          this.y = value.y;
          this.z = value.z;
          return this;
        },
        set(x, y, z) {
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        },
      };
      this.update = vi.fn();
      this.dispose = vi.fn();
      controlsRuntime.controls.push(this);
    }
  },
}));

import * as THREE from "three";
import {
  getCameraDistanceForBounds,
  getExteriorBodyBounds,
  getViewerMotionSettings,
  syncRendererSize,
} from "./patientBodyModelThreeUtils";
import PatientBodyModelViewer from "./PatientBodyModelViewer";
import {
  BODY_MODEL_MANIFEST,
  getMeshSystemState,
} from "./patientBodyModelConfig";

const originalClientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth",
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientHeight",
);

function addMesh(root, name, size = [1, 1, 1], position = [0, 0, 0]) {
  const geometry = new THREE.BoxGeometry(...size);
  const material = new THREE.MeshStandardMaterial();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  root.add(mesh);
  return mesh;
}

function makeModel(variant) {
  const model = new THREE.Group();
  const manifest = BODY_MODEL_MANIFEST[variant];
  manifest.exteriorMeshMatchers.forEach((name, index) => {
    addMesh(model, name, [1.4, 3, 0.8], [index * 0.01, 1.5, 0]);
  });
  manifest.organMeshMatchers.forEach((name, index) => {
    addMesh(model, name, [0.3, 0.3, 0.3], [0, 1 + index * 0.02, 0]);
  });
  return model;
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => 640,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 720,
  });
});

beforeEach(() => {
  loaderRuntime.requests.length = 0;
  threeRuntime.renderers.length = 0;
  controlsRuntime.controls.length = 0;
  resizeRuntime.observers.length = 0;
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  globalThis.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
      resizeRuntime.observers.push(this);
    }

    observe() {
      this.callback();
    }

    disconnect() {}
  };
  globalThis.requestAnimationFrame = vi.fn(() => 1);
  globalThis.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterAll(() => {
  if (originalClientWidth) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientWidth",
      originalClientWidth,
    );
  }
  if (originalClientHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientHeight",
      originalClientHeight,
    );
  }
});

describe("aggregate exterior bounds and responsive framing", () => {
  it("unions every female exterior part and excludes internal organs", () => {
    const model = new THREE.Group();
    const exteriorParts = [
      addMesh(model, "polySurface1_Torso_0", [2, 4, 1], [0, 0, 0]),
      addMesh(model, "polySurface1_Arms_0", [6, 1, 1], [0, 1, 0]),
      addMesh(model, "polySurface1_Legs_0", [2, 5, 1], [0, -4, 0]),
      addMesh(model, "polySurface1_Face_0", [2, 2, 1], [0, 4, 0]),
      addMesh(model, "polySurface1_Ears_0", [3, 1, 1], [0, 4, 0]),
      addMesh(model, "polySurface1_Fingernails_0", [6.5, 0.2, 1], [0, 1, 0]),
      addMesh(model, "polySurface1_Toenails_0", [2.5, 0.2, 1], [0, -6.5, 0]),
      addMesh(model, "polySurface1_Lips_0", [0.5, 0.2, 1], [0, 4, 0]),
    ];
    const internalOrgan = addMesh(
      model,
      "brain1",
      [20, 20, 20],
      [100, 100, 100],
    );

    const bounds = getExteriorBodyBounds(
      model,
      BODY_MODEL_MANIFEST.female,
    );

    exteriorParts.forEach((mesh) => {
      const partBounds = new THREE.Box3().setFromObject(mesh);
      expect(bounds.containsPoint(partBounds.min)).toBe(true);
      expect(bounds.containsPoint(partBounds.max)).toBe(true);
    });
    expect(
      bounds.containsPoint(new THREE.Box3().setFromObject(internalOrgan).min),
    ).toBe(false);
    expect(bounds.max.x).toBeLessThan(10);
    expect(bounds.max.y).toBeLessThan(10);
  });

  it.each(["male", "female"])(
    "keeps %s exterior centering independent from far-away internal anatomy",
    (variant) => {
      const model = makeModel(variant);
      const organ = model.children.find((child) =>
        BODY_MODEL_MANIFEST[variant].organMeshMatchers.includes(child.name),
      );
      organ.position.set(500, 500, 500);
      const bounds = getExteriorBodyBounds(
        model,
        BODY_MODEL_MANIFEST[variant],
      );
      const center = bounds.getCenter(new THREE.Vector3());

      expect(Math.abs(center.x)).toBeLessThan(1);
      expect(Math.abs(center.y - 1.5)).toBeLessThan(0.1);
    },
  );

  it.each(["male", "female"])(
    "increases camera distance for narrow %s layouts while keeping the same center",
    (variant) => {
      const model = makeModel(variant);
      const bounds = getExteriorBodyBounds(
        model,
        BODY_MODEL_MANIFEST[variant],
      );
      const centerBefore = bounds.getCenter(new THREE.Vector3());
      const camera = new THREE.PerspectiveCamera(32, 1.6, 0.01, 100);
      const desktopDistance = getCameraDistanceForBounds(camera, bounds, 1.2);
      camera.aspect = 0.25;
      const portraitDistance = getCameraDistanceForBounds(camera, bounds, 1.2);
      const centerAfter = bounds.getCenter(new THREE.Vector3());

      expect(portraitDistance).toBeGreaterThan(desktopDistance);
      expect(centerAfter.toArray()).toEqual(centerBefore.toArray());
    },
  );

  it("keeps the CSS canvas size and high-DPI drawing buffer synchronized", () => {
    const renderer = {
      setPixelRatio: vi.fn(),
      setSize: vi.fn(),
    };
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    const mount = { clientWidth: 320, clientHeight: 480 };

    expect(syncRendererSize(renderer, camera, mount, 2.5)).toEqual({
      width: 320,
      height: 480,
    });
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);
    expect(renderer.setSize).toHaveBeenCalledWith(320, 480, true);
    expect(camera.aspect).toBeCloseTo(320 / 480);
  });

  it("keeps padded exterior bounds inside the projected viewport", () => {
    const bounds = new THREE.Box3(
      new THREE.Vector3(-1, -1.5, -0.4),
      new THREE.Vector3(1, 1.5, 0.4),
    );
    const camera = new THREE.PerspectiveCamera(32, 640 / 720, 0.01, 100);
    const distance = getCameraDistanceForBounds(camera, bounds, 1.18);
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const projectedCorners = [
      [-1, -1.5, -0.4],
      [-1, -1.5, 0.4],
      [-1, 1.5, -0.4],
      [-1, 1.5, 0.4],
      [1, -1.5, -0.4],
      [1, -1.5, 0.4],
      [1, 1.5, -0.4],
      [1, 1.5, 0.4],
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z).project(camera));

    projectedCorners.forEach((corner) => {
      expect(Math.abs(corner.x)).toBeLessThan(1);
      expect(Math.abs(corner.y)).toBeLessThan(1);
    });
    expect(distance).toBeGreaterThan(3.8);
  });
});

describe("viewer loading and switching lifecycle", () => {
  it("loads only the selected model and ignores a stale prior GLB completion", () => {
    const loadingChanges = vi.fn();
    const { rerender, container } = render(
      <PatientBodyModelViewer
        activeSystem="overview"
        onLoadingChange={loadingChanges}
        patientGender="male"
      />,
    );

    expect(loaderRuntime.requests).toHaveLength(1);
    expect(loaderRuntime.requests[0].url).toBe(
      "/models/MaleBodyHumanAnatomy.glb",
    );
    expect(loadingChanges).toHaveBeenLastCalledWith(true);

    rerender(
      <PatientBodyModelViewer
        activeSystem="overview"
        onLoadingChange={loadingChanges}
        patientGender="female"
      />,
    );

    expect(loaderRuntime.requests).toHaveLength(2);
    expect(loaderRuntime.requests[1].url).toBe(
      "/models/FemaleBodyHumanAnatomy.glb",
    );
    expect(container.firstChild).toHaveAttribute(
      "data-model-url",
      "/models/FemaleBodyHumanAnatomy.glb",
    );

    const staleModel = makeModel("male");
    const staleGeometry = staleModel.children[0].geometry;
    const staleDispose = vi.spyOn(staleGeometry, "dispose");
    act(() => {
      loaderRuntime.requests[0].onLoad({ scene: staleModel });
    });
    expect(staleDispose).toHaveBeenCalledOnce();
    expect(loadingChanges).not.toHaveBeenCalledWith(false);

    act(() => {
      loaderRuntime.requests[1].onLoad({ scene: makeModel("female") });
    });
    expect(loadingChanges).toHaveBeenLastCalledWith(false);
  });

  it("resets loading and clears an old error when the model URL changes", () => {
    const loadingChanges = vi.fn();
    const { rerender } = render(
      <PatientBodyModelViewer
        activeSystem="overview"
        onLoadingChange={loadingChanges}
        patientGender="female"
      />,
    );

    act(() => {
      loaderRuntime.requests[0].onError(new Error("load failed"));
    });
    expect(
      screen.getByText("The selected anatomical model could not be loaded."),
    ).toBeInTheDocument();
    expect(loadingChanges).toHaveBeenLastCalledWith(false);

    rerender(
      <PatientBodyModelViewer
        activeSystem="overview"
        onLoadingChange={loadingChanges}
        patientGender="male"
      />,
    );

    expect(
      screen.queryByText("The selected anatomical model could not be loaded."),
    ).not.toBeInTheDocument();
    expect(loadingChanges).toHaveBeenLastCalledWith(true);
    expect(loaderRuntime.requests[1].url).toBe(
      "/models/MaleBodyHumanAnatomy.glb",
    );
  });

  it("changes systems without reloading the model and keeps unrelated organs hidden", () => {
    const { rerender } = render(
      <PatientBodyModelViewer activeSystem="overview" patientGender="female" />,
    );
    const model = makeModel("female");

    act(() => {
      loaderRuntime.requests[0].onLoad({ scene: model });
    });
    expect(model.getObjectByName("brain1").visible).toBe(false);

    rerender(
      <PatientBodyModelViewer activeSystem="nervous" patientGender="female" />,
    );

    expect(loaderRuntime.requests).toHaveLength(1);
    expect(model.getObjectByName("brain1").visible).toBe(true);
    expect(
      getMeshSystemState(
        "hartZBrush_defualt_group_Heart_Tex_0",
        "nervous",
        "female",
      ).visible,
    ).toBe(false);
  });

  it("reframes the loaded model whenever its observed container resizes", () => {
    render(
      <PatientBodyModelViewer activeSystem="overview" patientGender="male" />,
    );
    const renderer = threeRuntime.renderers[0];
    const controls = controlsRuntime.controls[0];

    act(() => {
      loaderRuntime.requests[0].onLoad({ scene: makeModel("male") });
    });
    const sizeCallsBeforeResize = renderer.setSize.mock.calls.length;
    const controlUpdatesBeforeResize = controls.update.mock.calls.length;

    act(() => {
      resizeRuntime.observers[0].callback();
    });

    expect(renderer.setSize.mock.calls.length).toBeGreaterThan(
      sizeCallsBeforeResize,
    );
    expect(controls.update.mock.calls.length).toBeGreaterThan(
      controlUpdatesBeforeResize,
    );
  });

  it("disables auto-rotation and highlight pulsing for reduced motion", () => {
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(
      <PatientBodyModelViewer activeSystem="overview" patientGender="male" />,
    );

    expect(controlsRuntime.controls[0].autoRotate).toBe(false);
    expect(getViewerMotionSettings(true)).toEqual({
      autoRotate: false,
      pulseHighlights: false,
    });
  });
});
