import { Provider, RunMode, StepType } from "@prisma/client";
import {
  getDefaultAutoModel,
  getDefaultCompareModels,
  resolveSelectedModels,
  type ModelCatalogEntry
} from "@/lib/models/catalog";
import { preferenceSchema } from "@/lib/schemas";
import { type BuiltRun, type StepPlanNode } from "@/lib/engine/types";

const ROUTER_MODEL_ID = "router-heuristic";
const MERGE_MODEL_ID = "merge-synthesizer";
const ROUTER_PLACEHOLDER_MODEL = "__ROUTER_CHOICE__";

export function buildRun(args: {
  cpir: BuiltRun["cpir"];
  mode: RunMode;
  selectedModelIds?: string[];
  preferences?: Partial<BuiltRun["preferences"]>;
}): BuiltRun {
  const selectedModels = args.selectedModelIds
    ? resolveSelectedModels(args.selectedModelIds)
    : getDefaultCompareModels();

  return {
    cpir: args.cpir,
    mode: args.mode,
    selectedModels,
    preferences: preferenceSchema.parse(args.preferences ?? {})
  };
}

function getChainModels(run: BuiltRun): ModelCatalogEntry[] {
  const selected = run.selectedModels.length > 0 ? run.selectedModels : getDefaultCompareModels();
  const fallbacks = [getDefaultAutoModel(), ...getDefaultCompareModels()];
  const merged = [...selected, ...fallbacks];
  const chainModels: ModelCatalogEntry[] = [];

  for (const entry of merged) {
    if (!chainModels.some((model) => model.modelId === entry.modelId)) {
      chainModels.push(entry);
    }

    if (chainModels.length === 4) {
      break;
    }
  }

  while (chainModels.length < 4) {
    chainModels.push({
      provider: "mock",
      modelId: "mock-balanced",
      qualityTier: 3,
      costTier: 1,
      speedTier: 5,
      supportsJson: true,
      inputUsdPer1k: 0,
      outputUsdPer1k: 0
    });
  }

  return chainModels;
}

export function planSteps(run: BuiltRun): StepPlanNode[] {
  const routerStep: StepPlanNode = {
    id: "router",
    type: StepType.ROUTER,
    provider: Provider.mock,
    modelId: ROUTER_MODEL_ID,
    dependsOn: []
  };

  if (run.mode === RunMode.AUTO) {
    return [
      routerStep,
      {
        id: "auto_model",
        type: StepType.MODEL_CALL,
        provider: Provider.mock,
        modelId: ROUTER_PLACEHOLDER_MODEL,
        dependsOn: ["router"]
      },
      {
        id: "merge",
        type: StepType.MERGE,
        provider: Provider.mock,
        modelId: MERGE_MODEL_ID,
        dependsOn: ["auto_model"]
      }
    ];
  }

  if (run.mode === RunMode.COMPARE) {
    const selected = run.selectedModels.length > 0 ? run.selectedModels : getDefaultCompareModels();
    const modelSteps = selected.slice(0, 4).map((entry, index) => ({
      id: `compare_model_${index + 1}`,
      type: StepType.MODEL_CALL,
      provider: entry.provider as Provider,
      modelId: entry.modelId,
      dependsOn: ["router"]
    }));

    return [
      routerStep,
      ...modelSteps,
      {
        id: "judge",
        type: StepType.JUDGE,
        provider: Provider.mock,
        modelId: "judge-normalizer",
        dependsOn: modelSteps.map((step) => step.id)
      },
      {
        id: "merge",
        type: StepType.MERGE,
        provider: Provider.mock,
        modelId: MERGE_MODEL_ID,
        dependsOn: ["judge", ...modelSteps.map((step) => step.id)]
      }
    ];
  }

  const [draftModel, refineModel, critiqueModel, compressModel] = getChainModels(run);

  return [
    routerStep,
    {
      id: "draft",
      type: StepType.DRAFT,
      provider: draftModel.provider as Provider,
      modelId: draftModel.modelId,
      dependsOn: ["router"]
    },
    {
      id: "refine",
      type: StepType.REFINE,
      provider: refineModel.provider as Provider,
      modelId: refineModel.modelId,
      dependsOn: ["draft"]
    },
    {
      id: "critique",
      type: StepType.CRITIQUE,
      provider: critiqueModel.provider as Provider,
      modelId: critiqueModel.modelId,
      dependsOn: ["refine"]
    },
    {
      id: "compress",
      type: StepType.COMPRESS,
      provider: compressModel.provider as Provider,
      modelId: compressModel.modelId,
      dependsOn: ["critique"]
    },
    {
      id: "merge",
      type: StepType.MERGE,
      provider: Provider.mock,
      modelId: MERGE_MODEL_ID,
      dependsOn: ["draft", "refine", "critique", "compress"]
    }
  ];
}

export const engineConstants = {
  ROUTER_PLACEHOLDER_MODEL
};
