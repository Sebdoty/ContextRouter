import { ArtifactKind, MessageRole, Provider, RunStatus, StepStatus, StepType } from "@prisma/client";
import { compileContextPack } from "@/lib/context/compiler";
import { prisma } from "@/lib/db";
import { type BuiltRun, type NodeOutput, type StepExecutionResult, type StepPlanNode } from "@/lib/engine/types";
import { engineConstants, buildRun, planSteps } from "@/lib/engine/planner";
import { log, newTrace } from "@/lib/logger";
import { getDefaultAutoModel, getModelById, type ProviderKey } from "@/lib/models/catalog";
import { detectDisagreements, normalizeOutput } from "@/lib/parsers/outputs";
import { resolveProvider } from "@/lib/providers";
import { cpirSchema, preferenceSchema, routerDecisionSchema } from "@/lib/schemas";
import { decideRoute } from "@/lib/router";
import { asInputJson } from "@/lib/utils/prisma-json";

const MODEL_EXEC_TYPES: StepType[] = [
  StepType.MODEL_CALL,
  StepType.DRAFT,
  StepType.REFINE,
  StepType.CRITIQUE,
  StepType.COMPRESS
];

function isModelExecutionType(stepType: StepType): boolean {
  return MODEL_EXEC_TYPES.includes(stepType);
}

function approxTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function buildStepPrompt(run: BuiltRun, node: StepPlanNode, dependencyOutputs: NodeOutput[]): BuiltRun["cpir"] {
  if (node.type === StepType.REFINE) {
    return {
      ...run.cpir,
      inputs: {
        ...run.cpir.inputs,
        userText: `${run.cpir.inputs.userText}\n\nDraft to refine:\n${dependencyOutputs[0]?.outputRaw ?? ""}`
      }
    };
  }

  if (node.type === StepType.CRITIQUE) {
    return {
      ...run.cpir,
      inputs: {
        ...run.cpir.inputs,
        userText: `${run.cpir.inputs.userText}\n\nOutput to critique:\n${dependencyOutputs[0]?.outputRaw ?? ""}`
      }
    };
  }

  if (node.type === StepType.COMPRESS) {
    return {
      ...run.cpir,
      inputs: {
        ...run.cpir.inputs,
        userText: `${run.cpir.inputs.userText}\n\nCritique findings:\n${dependencyOutputs[0]?.outputRaw ?? ""}\n\nCompress into key points + actions.`
      }
    };
  }

  return run.cpir;
}

function ensureRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

async function executeRouterNode(args: {
  run: BuiltRun;
  stepId: string;
  traceId: string;
}): Promise<StepExecutionResult> {
  const decision = decideRoute(args.run.cpir, args.run.preferences);
  const parsed = routerDecisionSchema.parse(decision);

  log("info", "router.step.complete", { traceId: args.traceId }, {
    step_id: args.stepId,
    token_estimate: parsed.tokenEstimate,
    candidate_count: parsed.candidates.length
  });

  return {
    provider: Provider.mock,
    modelId: "router-heuristic",
    renderedPrompt: "",
    outputRaw: JSON.stringify(parsed, null, 2),
    outputParsedJson: parsed,
    inputTokens: parsed.tokenEstimate,
    outputTokens: approxTokens(parsed.reasoning),
    costUsd: 0
  };
}

async function executeModelNode(args: {
  run: BuiltRun;
  node: StepPlanNode;
  dependencyOutputs: NodeOutput[];
  nodeOutputs: Map<string, NodeOutput>;
  traceId: string;
  sessionId: string;
}): Promise<StepExecutionResult> {
  let provider = args.node.provider;
  let modelId = args.node.modelId;

  if (args.node.modelId === engineConstants.ROUTER_PLACEHOLDER_MODEL) {
    const router = args.nodeOutputs.get("router")?.outputParsedJson;
    const chosen = ensureRecord(router?.chosen);

    modelId = (chosen?.modelId as string | undefined) ?? getDefaultAutoModel().modelId;
    provider = ((chosen?.provider as Provider | undefined) ?? Provider.openai) as Provider;
  }

  const model = getModelById(modelId) ?? getDefaultAutoModel();
  const providerAdapter = resolveProvider(provider as ProviderKey);

  // Re-compile context per model call to preserve model-agnostic long-term memory.
  const freshContextPack = await compileContextPack(args.sessionId, args.run.cpir.inputs.userText);
  const effectiveCpir = buildStepPrompt(
    {
      ...args.run,
      cpir: {
        ...args.run.cpir,
        contextPack: freshContextPack
      }
    },
    args.node,
    args.dependencyOutputs
  );

  const renderedPrompt = providerAdapter.renderPrompt({
    cpir: effectiveCpir,
    model
  });

  const response = await providerAdapter.callModel(renderedPrompt, {
    modelId,
    provider: provider as ProviderKey,
    jsonMode: effectiveCpir.outputContract.type === "json",
    traceId: args.traceId
  });

  const parsed = normalizeOutput(response.text);

  log("info", "model.step.complete", { traceId: args.traceId }, {
    provider,
    model_id: modelId,
    input_tokens: response.inputTokens,
    output_tokens: response.outputTokens,
    cost_usd: response.costUsd,
    latency_ms: response.latencyMs
  });

  return {
    provider,
    modelId,
    renderedPrompt,
    outputRaw: response.text,
    outputParsedJson: parsed,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    costUsd: response.costUsd
  };
}

function executeJudgeNode(nodeOutputs: Map<string, NodeOutput>): StepExecutionResult {
  const modelOutputs = [...nodeOutputs.values()].filter((item) => item.type === StepType.MODEL_CALL);
  const normalized = modelOutputs.map((item) => normalizeOutput(item.outputRaw));
  const disagreements = detectDisagreements(normalized);

  const answer = {
    normalized,
    disagreements
  };

  return {
    provider: Provider.mock,
    modelId: "judge-normalizer",
    renderedPrompt: "",
    outputRaw: JSON.stringify(answer, null, 2),
    outputParsedJson: answer,
    inputTokens: modelOutputs.reduce((acc, item) => acc + approxTokens(item.outputRaw), 0),
    outputTokens: approxTokens(JSON.stringify(answer)),
    costUsd: 0
  };
}

function executeMergeNode(node: StepPlanNode, dependencyOutputs: NodeOutput[]): StepExecutionResult {
  const mergedAnswer = dependencyOutputs
    .map((output, index) => `Option ${index + 1} (${output.modelId}):\n${output.outputRaw}`)
    .join("\n\n---\n\n");

  const finalText =
    node.dependsOn.length === 1
      ? dependencyOutputs[0]?.outputRaw ?? ""
      : [
          "Merged final answer based on prior steps:",
          "",
          mergedAnswer,
          "",
          "Final synthesis:",
          "Use the strongest claims that are consistent across options and retain concrete actions."
        ].join("\n");

  return {
    provider: Provider.mock,
    modelId: "merge-synthesizer",
    renderedPrompt: "",
    outputRaw: finalText,
    outputParsedJson: {
      finalAnswer: finalText,
      sourceStepCount: dependencyOutputs.length
    },
    inputTokens: dependencyOutputs.reduce((acc, item) => acc + approxTokens(item.outputRaw), 0),
    outputTokens: approxTokens(finalText),
    costUsd: 0
  };
}

function extractFinalAnswer(nodeOutputs: Map<string, NodeOutput>): string {
  const merge = nodeOutputs.get("merge");
  if (merge?.outputRaw) {
    return merge.outputRaw;
  }

  const latestModelOutput = [...nodeOutputs.values()]
    .filter((item) => isModelExecutionType(item.type))
    .pop();

  return latestModelOutput?.outputRaw ?? "No output generated.";
}

async function materializePlan(runId: string, plan: StepPlanNode[]) {
  const map = new Map<string, string>();

  for (const node of plan) {
    const created = await prisma.step.create({
      data: {
        runId,
        type: node.type,
        provider: node.provider,
        modelId: node.modelId,
        status: StepStatus.PENDING
      }
    });

    map.set(node.id, created.id);
  }

  return map;
}

export async function executeRun(runId: string) {
  const runRecord = await prisma.run.findUnique({
    where: {
      id: runId
    },
    include: {
      steps: true,
      session: true,
      userMessage: true
    }
  });

  if (!runRecord) {
    throw new Error("Run not found");
  }

  if (runRecord.status === RunStatus.DONE && runRecord.steps.length > 0) {
    return runRecord;
  }

  if (!runRecord.userMessage) {
    throw new Error("Run has no user message to execute");
  }

  const trace = newTrace(runId);

  const cpir = cpirSchema.parse(runRecord.cpirJson);
  const run = buildRun({
    cpir,
    mode: runRecord.mode,
    selectedModelIds: runRecord.selectedModelIds,
    preferences: ensureRecord(runRecord.preferencesJson)
      ? preferenceSchema.parse(runRecord.preferencesJson as Record<string, unknown>)
      : undefined
  });

  const plan = planSteps(run);
  const stepRecordIds = await materializePlan(runId, plan);

  await prisma.run.update({
    where: {
      id: runId
    },
    data: {
      status: RunStatus.RUNNING
    }
  });

  const completed = new Set<string>();
  const started = new Set<string>();
  const nodeOutputs = new Map<string, NodeOutput>();

  try {
    while (completed.size < plan.length) {
      const ready = plan.filter(
        (node) => !started.has(node.id) && node.dependsOn.every((dependencyId) => completed.has(dependencyId))
      );

      if (ready.length === 0) {
        throw new Error("No executable nodes found; DAG may contain a cycle.");
      }

      await Promise.all(
        ready.map(async (node) => {
          started.add(node.id);
          const stepId = stepRecordIds.get(node.id);
          if (!stepId) {
            throw new Error(`Missing Step record for node ${node.id}`);
          }

          const startedAt = new Date();
          await prisma.step.update({
            where: { id: stepId },
            data: {
              status: StepStatus.RUNNING,
              startedAt
            }
          });

          const dependencyOutputs = node.dependsOn
            .map((id) => nodeOutputs.get(id))
            .filter((value): value is NodeOutput => Boolean(value));

          const startedMs = Date.now();
          let result: StepExecutionResult;

          if (node.type === StepType.ROUTER) {
            result = await executeRouterNode({
              run,
              stepId,
              traceId: trace.traceId
            });
          } else if (isModelExecutionType(node.type)) {
            result = await executeModelNode({
              run,
              node,
              dependencyOutputs,
              nodeOutputs,
              traceId: trace.traceId,
              sessionId: runRecord.sessionId
            });
          } else if (node.type === StepType.JUDGE) {
            result = executeJudgeNode(nodeOutputs);
          } else {
            result = executeMergeNode(node, dependencyOutputs);
          }

          const latencyMs = Date.now() - startedMs;

          await prisma.step.update({
            where: { id: stepId },
            data: {
              provider: result.provider,
              modelId: result.modelId,
              renderedPrompt: result.renderedPrompt,
              outputRaw: result.outputRaw,
              outputParsedJson:
                result.outputParsedJson !== undefined ? asInputJson(result.outputParsedJson) : undefined,
              status: StepStatus.DONE,
              finishedAt: new Date(),
              inputTokens: result.inputTokens,
              outputTokens: result.outputTokens,
              costUsd: result.costUsd,
              latencyMs
            }
          });

          nodeOutputs.set(node.id, {
            stepId,
            type: node.type,
            provider: result.provider,
            modelId: result.modelId,
            renderedPrompt: result.renderedPrompt,
            outputRaw: result.outputRaw,
            outputParsedJson: result.outputParsedJson
          });

          if (node.type === StepType.ROUTER && result.outputParsedJson) {
            await prisma.run.update({
              where: { id: runId },
              data: {
                routerDecisionJson: asInputJson(result.outputParsedJson)
              }
            });
          }

          completed.add(node.id);
        })
      );
    }

    const stepStats = await prisma.step.aggregate({
      where: {
        runId
      },
      _sum: {
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        latencyMs: true
      }
    });

    const finalAnswer = extractFinalAnswer(nodeOutputs);

    await Promise.all([
      prisma.artifact.create({
        data: {
          sessionId: runRecord.sessionId,
          runId,
          kind: ArtifactKind.FINAL_ANSWER,
          title: `Run ${runId} final answer`,
          content: finalAnswer
        }
      }),
      prisma.message.create({
        data: {
          sessionId: runRecord.sessionId,
          role: MessageRole.assistant,
          content: finalAnswer
        }
      }),
      prisma.memoryItem.create({
        data: {
          sessionId: runRecord.sessionId,
          type: "FACT",
          key: `run-${runId}-summary`,
          value: asInputJson({
            summary: finalAnswer.slice(0, 260)
          }),
          confidence: 0.5,
          sourceRunId: runId
        }
      }),
      prisma.run.update({
        where: {
          id: runId
        },
        data: {
          status: RunStatus.DONE,
          totalInputTokens: stepStats._sum.inputTokens ?? 0,
          totalOutputTokens: stepStats._sum.outputTokens ?? 0,
          totalCostUsd: Number((stepStats._sum.costUsd ?? 0).toFixed(6)),
          totalLatencyMs: stepStats._sum.latencyMs ?? 0
        }
      })
    ]);

    return prisma.run.findUnique({
      where: { id: runId },
      include: { steps: true, artifacts: true, session: true }
    });
  } catch (error) {
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: RunStatus.ERROR
      }
    });

    const message = error instanceof Error ? error.message : "Unknown run execution error";

    const runningSteps = await prisma.step.findMany({
      where: {
        runId,
        status: StepStatus.RUNNING
      }
    });

    await Promise.all(
      runningSteps.map((step) =>
        prisma.step.update({
          where: { id: step.id },
          data: {
            status: StepStatus.ERROR,
            finishedAt: new Date(),
            errorMessage: message
          }
        })
      )
    );

    log("error", "run.execute.failed", trace, {
      error: message
    });

    throw error;
  }
}
