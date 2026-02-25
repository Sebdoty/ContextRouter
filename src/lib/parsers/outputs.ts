export type NormalizedOutput = {
  answer: string;
  claims: string[];
  actions: string[];
  codeBlocks: string[];
};

export type Disagreement = {
  claim: string;
  disagreesWith: string[];
};

function getSection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?:\\n[A-Z][A-Za-z ]+:|$)`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim() ?? "";
}

function splitList(section: string): string[] {
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function extractCodeBlocks(text: string): string[] {
  const blocks = text.match(/```[\s\S]*?```/g);
  return blocks ?? [];
}

export function normalizeOutput(text: string): NormalizedOutput {
  const answer = getSection(text, "Answer") || text.slice(0, 600);
  const claims = splitList(getSection(text, "Claims"));
  const actions = splitList(getSection(text, "Actions"));
  const codeBlocks = extractCodeBlocks(text);

  return {
    answer,
    claims,
    actions,
    codeBlocks
  };
}

function similarity(a: string, b: string): number {
  const aa = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const bb = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));

  let intersection = 0;
  for (const token of aa) {
    if (bb.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...aa, ...bb]).size;
  return union === 0 ? 0 : intersection / union;
}

export function detectDisagreements(normalizedOutputs: NormalizedOutput[]): Disagreement[] {
  const allClaims = normalizedOutputs.flatMap((item) => item.claims);
  const disagreements: Disagreement[] = [];

  for (const claim of allClaims) {
    const mismatches = allClaims.filter(
      (candidate) => candidate !== claim && similarity(candidate, claim) < 0.35
    );

    if (mismatches.length > 0) {
      disagreements.push({
        claim,
        disagreesWith: mismatches.slice(0, 3)
      });
    }
  }

  const unique = new Map<string, Disagreement>();
  for (const item of disagreements) {
    if (!unique.has(item.claim)) {
      unique.set(item.claim, item);
    }
  }

  return [...unique.values()].slice(0, 8);
}
