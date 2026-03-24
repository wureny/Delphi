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
  promptGuidance: string;
  allowedAgents: readonly AgentType[];
  failureSemantics: CapabilityFailureSemantics;
}

export const defaultSkillCapabilityByAgent: Record<AgentType, string> = {
  thesis: "thesis_analysis",
  liquidity: "liquidity_analysis",
  market_signal: "market_signal_analysis",
  judge: "judge_synthesis",
};

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

  getForAgent(
    agentType: AgentType,
    capabilityName: string,
  ): ToolDefinition | undefined {
    const definition = this.get(capabilityName);

    if (!definition || !definition.allowedAgents.includes(agentType)) {
      return undefined;
    }

    return definition;
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

  getForAgent(
    agentType: AgentType,
    capabilityName: string,
  ): SkillDefinition | undefined {
    const definition = this.get(capabilityName);

    if (!definition || !definition.allowedAgents.includes(agentType)) {
      return undefined;
    }

    return definition;
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
    promptGuidance: [
      "Reference playbooks: us-value-investing, tech-earnings-deepdive.",
      "Anchor the analysis in 2-4 decisive business forces, not a generic summary of facts.",
      "Judge the business on long-horizon durability: ROE persistence, balance-sheet safety, free-cash-flow quality, and moat strength.",
      "Use recent execution, guidance, and news flow as evidence about whether the core thesis is strengthening, weakening, or merely getting noisier.",
      "Prefer findings that can change an investment decision over descriptive restatement.",
    ].join("\n"),
    allowedAgents: ["thesis"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "liquidity_analysis",
    description: "Turn macro and liquidity snapshots into liquidity findings.",
    inputShape: "Normalized macro/liquidity snapshot",
    outputShape: "Finding[]",
    promptGuidance: [
      "Reference playbook: macro-liquidity.",
      "Assess liquidity through the state and direction of rates pressure, funding stress, bond volatility, and cross-asset carry risk.",
      "Distinguish clearly between easing, neutral, and tightening liquidity conditions over the stated time horizon.",
      "Translate macro state into investable consequences for valuation support, downside risk, and willingness to own risk assets.",
      "Do not drift into generic macro commentary that does not affect the current case.",
    ].join("\n"),
    allowedAgents: ["liquidity"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "market_signal_analysis",
    description: "Turn market snapshots into signal-oriented findings.",
    inputShape: "Normalized market snapshot",
    outputShape: "Finding[]",
    promptGuidance: [
      "Reference playbook: us-market-sentiment.",
      "Read the snapshot as a positioning and sentiment state assessment, not as deterministic price prophecy.",
      "Focus on crowding, risk appetite, valuation stretch, and whether current price action confirms or conflicts with the fundamental thesis.",
      "Convert the signal into practical stance language such as buyable, holdable, crowded, or avoid-for-now.",
      "Prefer signal findings that sharpen timing and risk control rather than repeating the quote tape.",
    ].join("\n"),
    allowedAgents: ["market_signal"],
    failureSemantics: "degrade",
  },
  {
    capabilityName: "judge_synthesis",
    description: "Synthesize upstream findings into a decision and six report sections.",
    inputShape: "Finding[]",
    outputShape: "Decision + ReportSection[] + FinalReport",
    promptGuidance: [
      "Reference playbook: investment-metacognition.",
      "Start from the real investment decision, then weigh business quality, recent execution, liquidity regime, and market sentiment without averaging them mechanically.",
      "If frameworks disagree, name the conflict and decide which side wins and why.",
      "End decisively with a verdict, the few reasons that dominate, the main avoidable mistakes, and the hard triggers that would change the view.",
      "Write like an investment memo for an informed non-technical investor, not like an internal schema dump.",
    ].join("\n"),
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
