import { describe, expect, it } from "vitest";
import {
  BODY_MODEL_MANIFEST,
  SYSTEM_VIEWS,
  getMeshSystemState,
  isExteriorMesh,
  isMeshSelectedForSystem,
  resolveBodyModelVariant,
} from "./patientBodyModelConfig";

const HEART = "hartZBrush_defualt_group_Heart_Tex_0";
const LUNGS = [
  "thairoid01low_part01_Group6344Group18522_thairoid01lungh_part01_0",
  "thairoid01low_part02_Group6344Group24638_thairoid01lungh_part02_0",
];
const KIDNEYS = [
  "Group12708_Kidney_Tex_0",
  "kidney02kidney03Group12708_Kidney_Tex_0",
];

describe("body model gender resolution", () => {
  it.each(["female", "FEMALE", "f", "woman"])(
    "resolves %s to the female model",
    (gender) => {
      expect(resolveBodyModelVariant(gender)).toEqual({
        variant: "female",
        isFallback: false,
        reason: null,
      });
    },
  );

  it.each(["male", "MALE", "m", "man"])(
    "resolves %s to the male model",
    (gender) => {
      expect(resolveBodyModelVariant(gender)).toEqual({
        variant: "male",
        isFallback: false,
        reason: null,
      });
    },
  );

  it.each([undefined, null, "", "UNKNOWN", "other", "nonbinary", "unsupported"])(
    "uses a marked default fallback for %s without mutating the value",
    (gender) => {
      const originalGender = gender;
      expect(resolveBodyModelVariant(gender)).toEqual({
        variant: "male",
        isFallback: true,
        reason:
          "Recorded gender does not map to an available anatomical model",
      });
      expect(gender).toBe(originalGender);
    },
  );
});

describe("model-specific exterior classification", () => {
  it("selects node_0 as the male exterior", () => {
    expect(isExteriorMesh("node_0", "male")).toBe(true);
    expect(
      BODY_MODEL_MANIFEST.male.exteriorMeshMatchers,
    ).toEqual(["node_0"]);
  });

  it("selects all eight female exterior meshes including nails", () => {
    expect(BODY_MODEL_MANIFEST.female.exteriorMeshMatchers).toHaveLength(8);
    BODY_MODEL_MANIFEST.female.exteriorMeshMatchers.forEach((meshName) => {
      expect(isExteriorMesh(meshName, "female")).toBe(true);
    });
    expect(BODY_MODEL_MANIFEST.female.exteriorMeshMatchers).toEqual([
      "polySurface1_Arms_0",
      "polySurface1_Ears_0",
      "polySurface1_Face_0",
      "polySurface1_Fingernails_0",
      "polySurface1_Legs_0",
      "polySurface1_Lips_0",
      "polySurface1_Toenails_0",
      "polySurface1_Torso_0",
    ]);
  });
});

describe("patient body model anatomy routing", () => {
  it("hides every internal organ in Overview, including the brain", () => {
    for (const variant of ["male", "female"]) {
      BODY_MODEL_MANIFEST[variant].organMeshMatchers.forEach((meshName) => {
        expect(getMeshSystemState(meshName, "overview", variant)).toMatchObject({
          isOrgan: true,
          selected: false,
          visible: false,
        });
      });
      BODY_MODEL_MANIFEST[variant].exteriorMeshMatchers.forEach((meshName) => {
        expect(getMeshSystemState(meshName, "overview", variant)).toMatchObject({
          isExterior: true,
          visible: true,
        });
      });
    }
  });

  it.each(["male", "female"])(
    "selects brain1 for the %s Nervous view",
    (variant) => {
      expect(getMeshSystemState("brain1", "nervous", variant)).toMatchObject({
        isOrgan: true,
        selected: true,
        visible: true,
      });
    },
  );

  it.each([
    "polySurface1_Face_0",
    "polySurface1_Ears_0",
    "polySurface1_Torso_0",
    "polySurface1_Arms_0",
  ])("does not select exterior mesh %s for Nervous", (meshName) => {
    expect(isMeshSelectedForSystem(meshName, "nervous", "female")).toBe(false);
    expect(getMeshSystemState(meshName, "nervous", "female")).toMatchObject({
      isExterior: true,
      selected: false,
      visible: true,
    });
  });

  it.each(["male", "female"])(
    "selects only the heart for %s Cardiovascular",
    (variant) => {
      BODY_MODEL_MANIFEST[variant].organMeshMatchers.forEach((meshName) => {
        expect(
          getMeshSystemState(meshName, "cardiovascular", variant).selected,
        ).toBe(meshName === HEART);
      });
    },
  );

  it.each(["male", "female"])(
    "selects only the two imported lung meshes for %s Respiratory",
    (variant) => {
      BODY_MODEL_MANIFEST[variant].organMeshMatchers.forEach((meshName) => {
        expect(
          getMeshSystemState(meshName, "respiratory", variant).selected,
        ).toBe(LUNGS.includes(meshName));
      });
    },
  );

  it("selects stomach, liver, and gallbladder for male Digestive", () => {
    expect(BODY_MODEL_MANIFEST.male.systems.digestive).toEqual([
      "Division_1_stomach_0",
      "liver001_Material011_0",
      "gallbladder002_Material013_0",
    ]);
  });

  it("selects stomach and liver but no gallbladder for female Digestive", () => {
    expect(BODY_MODEL_MANIFEST.female.systems.digestive).toEqual([
      "Division_1_stomach_0",
      "liver001_Material011_0",
    ]);
    expect(
      isMeshSelectedForSystem(
        "gallbladder002_Material013_0",
        "digestive",
        "female",
      ),
    ).toBe(false);
  });

  it.each(["immune", "endocrine"])(
    "selects no anatomy for %s",
    (systemId) => {
      for (const variant of ["male", "female"]) {
        expect(BODY_MODEL_MANIFEST[variant].systems[systemId]).toEqual([]);
        BODY_MODEL_MANIFEST[variant].organMeshMatchers.forEach((meshName) => {
          expect(
            getMeshSystemState(meshName, systemId, variant),
          ).toMatchObject({
            selected: false,
            visible: false,
          });
        });
      }
    },
  );

  it("keeps kidneys hidden in every current system view", () => {
    Object.keys(SYSTEM_VIEWS).forEach((systemId) => {
      for (const variant of ["male", "female"]) {
        KIDNEYS.forEach((meshName) => {
          expect(
            getMeshSystemState(meshName, systemId, variant),
          ).toMatchObject({
            isOrgan: true,
            selected: false,
            visible: false,
          });
        });
      }
    });
  });
});
