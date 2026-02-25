import { type RenderPromptInput } from "@/lib/providers/types";

export function renderCanonicalPrompt({ cpir, model }: RenderPromptInput): string {
  return [
    `You are ${model.modelId} acting as a specialist assistant.`,
    `Intent: ${cpir.intent}`,
    `TaskType: ${cpir.taskType}`,
    `Depth: ${cpir.depth}`,
    `Constraints: ${JSON.stringify(cpir.constraints)}`,
    `OutputContract: ${JSON.stringify(cpir.outputContract)}`,
    "ContextPack:",
    `Summary: ${cpir.contextPack.summary}`,
    `Facts: ${cpir.contextPack.facts.join(" | ")}`,
    `Decisions: ${cpir.contextPack.decisions.join(" | ")}`,
    `OpenQuestions: ${cpir.contextPack.openQuestions.join(" | ")}`,
    `ConstraintsList: ${cpir.contextPack.constraints.join(" | ")}`,
    "RecentTurns:",
    ...cpir.contextPack.recentTurns.map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`),
    "UserRequest:",
    cpir.inputs.userText,
    "Respond with clear reasoning and explicit assumptions.",
    "If you make claims, keep them concise and list action items when relevant."
  ].join("\n");
}
