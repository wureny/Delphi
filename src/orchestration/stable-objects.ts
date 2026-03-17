import type { FindingRecord, FinalReportSectionKey } from "./contracts.ts";

export const stableObjectTypes = [
  "Thesis",
  "Risk",
  "MacroActorAction",
  "LiquidityFactor",
  "LiquidityRegime",
  "MarketSignal",
] as const;

export type StableObjectType = (typeof stableObjectTypes)[number];

export const runtimeUpdatableStableObjectTypes = [
  "Thesis",
  "Risk",
  "LiquidityFactor",
  "LiquidityRegime",
  "MarketSignal",
] as const;

export type RuntimeUpdatableStableObjectType =
  (typeof runtimeUpdatableStableObjectTypes)[number];

const stableObjectPrefixRegistry: Record<StableObjectType, string> = {
  Thesis: "thesis:",
  Risk: "risk:",
  MacroActorAction: "macroactoraction:",
  LiquidityFactor: "liquidityfactor:",
  LiquidityRegime: "liquidityregime:",
  MarketSignal: "marketsignal:",
};

export function inferStableObjectType(ref: string): StableObjectType | null {
  for (const [nodeType, prefix] of Object.entries(stableObjectPrefixRegistry)) {
    if (ref.startsWith(prefix)) {
      return nodeType as StableObjectType;
    }
  }

  return null;
}

export function inferRuntimeUpdatableStableNodeType(
  ref: string,
): RuntimeUpdatableStableObjectType | null {
  const nodeType = inferStableObjectType(ref);

  if (
    nodeType === "Thesis" ||
    nodeType === "Risk" ||
    nodeType === "LiquidityFactor" ||
    nodeType === "LiquidityRegime" ||
    nodeType === "MarketSignal"
  ) {
    return nodeType;
  }

  return null;
}

export function collectStableObjectRefs(
  findings: readonly FindingRecord[],
): string[] {
  const refs = new Set<string>();

  for (const finding of findings) {
    for (const objectRef of finding.objectRefs) {
      if (inferStableObjectType(objectRef)) {
        refs.add(objectRef);
      }
    }
  }

  return [...refs];
}

export function collectStableObjectRefsByAgent(
  findings: readonly FindingRecord[],
  agentType: FindingRecord["agentType"],
): string[] {
  return collectUniqueObjectRefs(
    findings.filter((finding) => finding.agentType === agentType),
  );
}

export function collectStableObjectRefsByImpact(
  findings: readonly FindingRecord[],
  impact: FindingRecord["impact"],
): string[] {
  return collectUniqueObjectRefs(
    findings.filter((finding) => finding.impact === impact),
  );
}

export function collectStableObjectRefsForSection(
  findings: readonly FindingRecord[],
  sectionKey: FinalReportSectionKey,
): string[] {
  switch (sectionKey) {
    case "final_judgment":
      return collectStableObjectRefs(findings);
    case "core_thesis":
      return collectStableObjectRefsByAgent(findings, "thesis");
    case "supporting_evidence":
      return collectStableObjectRefsByImpact(findings, "positive");
    case "key_risks":
      return collectUniqueObjectRefs(
        findings.filter((finding) => {
          const objectTypes = finding.objectRefs
            .map((ref) => inferStableObjectType(ref))
            .filter((value): value is StableObjectType => value !== null);
          return objectTypes.includes("Risk");
        }),
      );
    case "liquidity_context":
      return collectUniqueObjectRefs(
        findings.filter((finding) => {
          const objectTypes = finding.objectRefs
            .map((ref) => inferStableObjectType(ref))
            .filter((value): value is StableObjectType => value !== null);
          return (
            objectTypes.includes("MacroActorAction") ||
            objectTypes.includes("LiquidityFactor") ||
            objectTypes.includes("LiquidityRegime")
          );
        }),
      );
    case "what_changes_the_view":
      return collectUniqueObjectRefs(
        findings.filter((finding) => finding.impact === "mixed" || finding.impact === "negative"),
      );
    default:
      return [];
  }
}

function collectUniqueObjectRefs(findings: readonly FindingRecord[]): string[] {
  const refs = new Set<string>();

  for (const finding of findings) {
    for (const objectRef of finding.objectRefs) {
      if (inferStableObjectType(objectRef)) {
        refs.add(objectRef);
      }
    }
  }

  return [...refs];
}
