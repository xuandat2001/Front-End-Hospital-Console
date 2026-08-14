const MALE_HEART = "hartZBrush_defualt_group_Heart_Tex_0";
const MALE_LUNGS = Object.freeze([
  "thairoid01low_part01_Group6344Group18522_thairoid01lungh_part01_0",
  "thairoid01low_part02_Group6344Group24638_thairoid01lungh_part02_0",
]);
const KIDNEYS = Object.freeze([
  "Group12708_Kidney_Tex_0",
  "kidney02kidney03Group12708_Kidney_Tex_0",
]);
const STOMACH = "Division_1_stomach_0";
const LIVER = "liver001_Material011_0";
const BRAIN = "brain1";

const MALE_INTERNAL_MESHES = Object.freeze([
  BRAIN,
  ...KIDNEYS,
  MALE_HEART,
  ...MALE_LUNGS,
  STOMACH,
  "gallbladder002_Material013_0",
  "hepatic_artery001_Material_0",
  "inferior_vena_cava001_Material012_0",
  LIVER,
  "portal_vein001_Material015_0",
]);

const FEMALE_EXTERIOR_MESHES = Object.freeze([
  "polySurface1_Arms_0",
  "polySurface1_Ears_0",
  "polySurface1_Face_0",
  "polySurface1_Fingernails_0",
  "polySurface1_Legs_0",
  "polySurface1_Lips_0",
  "polySurface1_Toenails_0",
  "polySurface1_Torso_0",
]);

const FEMALE_INTERNAL_MESHES = Object.freeze([
  BRAIN,
  ...KIDNEYS,
  ...MALE_LUNGS,
  STOMACH,
  LIVER,
  MALE_HEART,
]);

function freezeSystems(systems) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(systems).map(([systemId, meshNames]) => [
        systemId,
        Object.freeze(meshNames),
      ]),
    ),
  );
}

export const SYSTEM_VIEWS = Object.freeze({
  overview: {
    targetY: 0,
    distance: 6.4,
    minDistance: 3.8,
    padding: 1.18,
    color: "#38bdf8",
  },
  cardiovascular: {
    targetY: 0.42,
    distance: 2.8,
    minDistance: 1,
    padding: 1.9,
    color: "#ef4444",
  },
  respiratory: {
    targetY: 0.48,
    distance: 3,
    minDistance: 1.35,
    padding: 1.65,
    color: "#fb7185",
  },
  nervous: {
    targetY: 1.22,
    distance: 2.45,
    minDistance: 1.05,
    padding: 2,
    color: "#a78bfa",
  },
  digestive: {
    targetY: 0,
    distance: 2.75,
    minDistance: 1.5,
    padding: 1.6,
    color: "#f59e0b",
  },
  musculoskeletal: {
    targetY: 0,
    distance: 4,
    minDistance: 3.8,
    padding: 1.18,
    color: "#e2e8f0",
  },
  immune: {
    targetY: 0.2,
    distance: 3.25,
    minDistance: 3.8,
    padding: 1.18,
    color: "#34d399",
  },
  endocrine: {
    targetY: 0.88,
    distance: 2.65,
    minDistance: 3.8,
    padding: 1.18,
    color: "#f472b6",
  },
});

export const BODY_MODEL_MANIFEST = Object.freeze({
  male: Object.freeze({
    id: "male",
    url: "/models/MaleBodyHumanAnatomy.glb",
    displayLabel: "Male anatomical model",
    exteriorMeshMatchers: Object.freeze(["node_0"]),
    organMeshMatchers: MALE_INTERNAL_MESHES,
    systems: freezeSystems({
      overview: [],
      cardiovascular: [MALE_HEART],
      respiratory: [...MALE_LUNGS],
      nervous: [BRAIN],
      digestive: [STOMACH, LIVER, "gallbladder002_Material013_0"],
      musculoskeletal: [],
      immune: [],
      endocrine: [],
    }),
    initialRotation: Object.freeze([0, -Math.PI / 2, 0]),
    cameraOverrides: Object.freeze({
      overviewPadding: 1.18,
      focusPadding: 1.7,
    }),
    fallback: Object.freeze({
      isDefault: true,
      reason: "Temporary default when a supported model variant is unavailable",
    }),
  }),
  female: Object.freeze({
    id: "female",
    url: "/models/FemaleBodyHumanAnatomy.glb",
    displayLabel: "Female anatomical model",
    exteriorMeshMatchers: FEMALE_EXTERIOR_MESHES,
    organMeshMatchers: FEMALE_INTERNAL_MESHES,
    systems: freezeSystems({
      overview: [],
      cardiovascular: [MALE_HEART],
      respiratory: [...MALE_LUNGS],
      nervous: [BRAIN],
      digestive: [STOMACH, LIVER],
      musculoskeletal: [],
      immune: [],
      endocrine: [],
    }),
    initialRotation: Object.freeze([0, -Math.PI / 2, 0]),
    cameraOverrides: Object.freeze({
      overviewPadding: 1.2,
      focusPadding: 1.7,
    }),
    fallback: Object.freeze({
      isDefault: false,
      reason: null,
    }),
  }),
});

export const BODY_MODEL_FALLBACK_NOTICE =
  "Default anatomical model shown because a supported model variant is unavailable.";

const MALE_GENDER_VALUES = new Set(["male", "m", "man"]);
const FEMALE_GENDER_VALUES = new Set(["female", "f", "woman"]);

export function normalizeMeshName(value) {
  return String(value || "").trim().toLowerCase();
}

export function matchesMeshMatcher(meshName, matchers = []) {
  const normalizedName = normalizeMeshName(meshName);
  return matchers.some(
    (matcher) => normalizeMeshName(matcher) === normalizedName,
  );
}

export function getBodyModelManifest(variant) {
  return BODY_MODEL_MANIFEST[variant] || BODY_MODEL_MANIFEST.male;
}

export function resolveBodyModelVariant(gender) {
  const normalizedGender =
    typeof gender === "string" ? gender.trim().toLowerCase() : "";

  if (MALE_GENDER_VALUES.has(normalizedGender)) {
    return {
      variant: "male",
      isFallback: false,
      reason: null,
    };
  }

  if (FEMALE_GENDER_VALUES.has(normalizedGender)) {
    return {
      variant: "female",
      isFallback: false,
      reason: null,
    };
  }

  return {
    variant: "male",
    isFallback: true,
    reason:
      "Recorded gender does not map to an available anatomical model",
  };
}

export function isExteriorMesh(meshName, variantOrManifest) {
  const manifest =
    typeof variantOrManifest === "object"
      ? variantOrManifest
      : getBodyModelManifest(variantOrManifest);
  return matchesMeshMatcher(meshName, manifest.exteriorMeshMatchers);
}

export function isOrganMesh(meshName, variantOrManifest) {
  const manifest =
    typeof variantOrManifest === "object"
      ? variantOrManifest
      : getBodyModelManifest(variantOrManifest);
  return matchesMeshMatcher(meshName, manifest.organMeshMatchers);
}

export function isMeshSelectedForSystem(
  meshName,
  systemId,
  variantOrManifest,
) {
  const manifest =
    typeof variantOrManifest === "object"
      ? variantOrManifest
      : getBodyModelManifest(variantOrManifest);
  const selectedMeshMatchers = manifest.systems[systemId] || [];
  return matchesMeshMatcher(meshName, selectedMeshMatchers);
}

export function getMeshSystemState(sourceName, systemId, variant = "male") {
  const manifest = getBodyModelManifest(variant);
  const resolvedSystemId = SYSTEM_VIEWS[systemId] ? systemId : "overview";
  const isExterior = isExteriorMesh(sourceName, manifest);
  const isOrgan = isOrganMesh(sourceName, manifest);
  const selected =
    resolvedSystemId !== "overview" &&
    isMeshSelectedForSystem(sourceName, resolvedSystemId, manifest);

  return {
    isExterior,
    isOrgan,
    selected,
    visible: isExterior || selected,
  };
}
