import { type CPIR, type Depth, type TaskType } from "@/lib/schemas";

const CODE_HINTS = ["code", "debug", "typescript", "javascript", "python", "sql", "bug", "refactor"];
const RESEARCH_HINTS = ["research", "sources", "citation", "compare studies", "paper", "market"];
const CREATIVE_HINTS = ["poem", "story", "creative", "lyrics", "brainstorm name", "script"];
const EXTRACTION_HINTS = ["extract", "parse", "json", "table", "summarize into fields"];
const PLANNING_HINTS = ["plan", "roadmap", "timeline", "steps", "prioritize"];
const CRITIQUE_HINTS = ["critique", "review", "feedback", "evaluate"];

function includesAny(input: string, terms: string[]): boolean {
  return terms.some((term) => input.includes(term));
}

export function classifyTaskType(userText: string): TaskType {
  const normalized = userText.toLowerCase();

  if (includesAny(normalized, CODE_HINTS)) {
    return "coding";
  }

  if (includesAny(normalized, RESEARCH_HINTS)) {
    return "research";
  }

  if (includesAny(normalized, CREATIVE_HINTS)) {
    return "creative";
  }

  if (includesAny(normalized, EXTRACTION_HINTS)) {
    return "extraction";
  }

  if (includesAny(normalized, PLANNING_HINTS)) {
    return "planning";
  }

  if (includesAny(normalized, CRITIQUE_HINTS)) {
    return "critique";
  }

  return "reasoning";
}

export function classifyDepth(userText: string): Depth {
  const normalized = userText.toLowerCase();
  const longText = userText.length > 900;
  const mediumText = userText.length > 350;

  if (
    longText ||
    includesAny(normalized, [
      "step-by-step",
      "deep",
      "thorough",
      "tradeoff",
      "architecture",
      "prove",
      "rigorous"
    ])
  ) {
    return "deep";
  }

  if (mediumText || includesAny(normalized, ["explain", "analyze", "compare", "justify"])) {
    return "medium";
  }

  return "shallow";
}

export function inferOutputContract(userText: string): CPIR["outputContract"] {
  const normalized = userText.toLowerCase();

  if (normalized.includes("json") || normalized.includes("schema")) {
    return {
      type: "json",
      schema: {
        answer: "string",
        actions: "string[]"
      }
    };
  }

  if (normalized.includes("sections") || normalized.includes("bullet")) {
    return {
      type: "sections"
    };
  }

  return {
    type: "freeform"
  };
}

export function inferIntent(userText: string): string {
  const trimmed = userText.trim();
  if (trimmed.length <= 120) {
    return trimmed;
  }

  return `${trimmed.slice(0, 117)}...`;
}
