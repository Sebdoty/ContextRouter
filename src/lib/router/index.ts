import { classifyDepth, classifyTaskType, inferIntent, inferOutputContract } from "@/lib/router/classifier";
import { buildRouterDecision } from "@/lib/router/scorer";
import { type CPIR, type ContextPack, cpirSchema, preferenceSchema, type RouterDecision, type RouterPreferences } from "@/lib/schemas";

export function buildCPIR(args: {
  userText: string;
  contextPack: ContextPack;
  constraints?: CPIR["constraints"];
}): CPIR {
  const classifierEnabled = process.env.ROUTER_USE_CLASSIFIER_LLM === "true";
  if (classifierEnabled) {
    // TODO: optional classifier-model call can override heuristic labels in a future iteration.
  }

  const cpir: CPIR = {
    intent: inferIntent(args.userText),
    taskType: classifyTaskType(args.userText),
    depth: classifyDepth(args.userText),
    constraints: args.constraints ?? {},
    inputs: {
      userText: args.userText
    },
    contextPack: args.contextPack,
    outputContract: inferOutputContract(args.userText)
  };

  return cpirSchema.parse(cpir);
}

export function decideRoute(cpir: CPIR, rawPrefs?: Partial<RouterPreferences>): RouterDecision {
  const prefs = preferenceSchema.parse({
    qualityBias: 50,
    ...rawPrefs
  });

  return buildRouterDecision(cpir, prefs);
}
