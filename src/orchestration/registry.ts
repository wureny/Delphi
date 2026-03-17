import type { AgentType } from "../research-graph/runtime.ts";

export const capabilityFailureSemantics = ["degrade", "fail_run", "skip"] as const;

export type CapabilityFailureSemantics =
  (typeof capabilityFailureSemantics)[number];

export interface ToolDefinition {
  capabilityName: string;
  description: string;
  inputShape: string;
  outputShape: string;
  allowedAgents: readonly AgentType[];
  failureSemantics: CapabilityFailureSemantics;
}

export interface SkillDefinition {
  capabilityName: string;
  description: string;
  inputShape: string;
  outputShape: string;
  allowedAgents: readonly AgentType[];
  failureSemantics: CapabilityFailureSemantics;
}

export class ToolRegistry {
  private readonly definitions: Map<string, ToolDefinition>;

  constructor(definitions: readonly ToolDefinition[]) {
    this.definitions = new Map(
      definitions.map((definition) => [definition.capabilityName, definition]),
    );
  }

  get(capabilityName: string): ToolDefinition | undefined {
    return this.definitions.get(capabilityName);
  }

  list(): ToolDefinition[] {
    return [...this.definitions.values()];
  }

  listForAgent(agentType: AgentType): ToolDefinition[] {
    return this.list().filter((definition) =>
      definition.allowedAgents.includes(agentType),
    );
  }
}

export class SkillRegistry {
  private readonly definitions: Map<string, SkillDefinition>;

  constructor(definitions: readonly SkillDefinition[]) {
    this.definitions = new Map(
      definitions.map((definition) => [definition.capabilityName, definition]),
    );
  }

  get(capabilityName: string): SkillDefinition | undefined {
    return this.definitions.get(capabilityName);
  }

  list(): SkillDefinition[] {
    return [...this.definitions.values()];
  }

  listForAgent(agentType: AgentType): SkillDefinition[] {
    return this.list().filter((definition) =>
      definition.allowedAgents.includes(agentType),
    );
  }
}

export const defaultToolDefinitions: readonly ToolDefinition[] = [
  {
    capabilityName: "market_data_retrieval",
    description: "Fetch normalized company, quote, news, and filing snapshots.",
    inputShape: "{ ticker: string }",
    outputShape: "Normalized market data snapshots",
    allowedAgents: ["thesis", "market_signal"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "macro_liquidity_retrieval",
    description: "Fetch normalized macro and liquidity snapshots.",
    inputShape: "{ runId: string }",
    outputShape: "Normalized macro/liquidity snapshot",
    allowedAgents: ["liquidity"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "graph_patch_submission",
    description: "Submit a structured GraphPatch through the runtime gateway.",
    inputShape: "{ patch: GraphPatch }",
    outputShape: "GraphPatchSubmissionResult",
    allowedAgents: ["thesis", "liquidity", "market_signal", "judge"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "graph_context_retrieval",
    description: "Read runtime or case graph context through a controlled adapter.",
    inputShape: "{ runId?: string, caseId?: string }",
    outputShape: "Graph context snapshot",
    allowedAgents: ["thesis", "liquidity", "market_signal", "judge"],
    failureSemantics: "skip",
  },
  {
    capabilityName: "report_assembly_helper",
    description: "Build fixed six report sections and the final report payload.",
    inputShape: "{ sections: ReportSectionRecord[] }",
    outputShape: "FinalReport",
    allowedAgents: ["judge"],
    failureSemantics: "fail_run",
  },
] as const;

export const defaultSkillDefinitions: readonly SkillDefinition[] = [
  {
    capabilityName: "thesis_analysis",
    description: "Turn company snapshots into thesis-oriented findings.",
    inputShape: "Normalized company + news snapshots",
    outputShape: "Finding[]",
    allowedAgents: ["thesis"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "liquidity_analysis",
    description: "Turn macro and liquidity snapshots into liquidity findings.",
    inputShape: "Normalized macro/liquidity snapshot",
    outputShape: "Finding[]",
    allowedAgents: ["liquidity"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "market_signal_analysis",
    description: "Turn market snapshots into signal-oriented findings.",
    inputShape: "Normalized market snapshot",
    outputShape: "Finding[]",
    allowedAgents: ["market_signal"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "judge_synthesis",
    description: "Synthesize upstream findings into a decision and six report sections.",
    inputShape: "Finding[]",
    outputShape: "Decision + ReportSection[] + FinalReport",
    allowedAgents: ["judge"],
    failureSemantics: "fail_run",
  },
] as const;

export function createDefaultToolRegistry(): ToolRegistry {
  return new ToolRegistry(defaultToolDefinitions);
}

export function createDefaultSkillRegistry(): SkillRegistry {
  return new SkillRegistry(defaultSkillDefinitions);
}
