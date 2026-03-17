import type { GraphWriter, GraphWriteContext } from "../research-graph/graph-writer.ts";
import type { GraphPatch, GraphTargetScope } from "../research-graph/graph-patch.ts";
import { submitGraphPatch, type GraphPatchSubmissionResult } from "../research-graph/graph-writer.ts";
import type { GraphNodeType } from "../research-graph/runtime.ts";
import type { OntologyNodeType } from "../research-graph/ontology.ts";

export interface GraphPatchGatewayOptions {
  runId: string;
  caseId: string;
  writer: GraphWriter;
  existingStableIdentities?: Partial<Record<OntologyNodeType, Iterable<string>>>;
}

export interface GraphPatchGatewaySnapshot {
  runId: string;
  caseId: string;
  refNodeTypes: Record<string, GraphNodeType>;
  existingRuntimeRefs: string[];
  existingCaseRefs: string[];
  existingEvidenceRefs: string[];
}

export class GraphPatchGateway {
  private readonly refNodeTypes = new Map<string, GraphNodeType>();
  private readonly existingRuntimeRefs = new Set<string>();
  private readonly existingCaseRefs = new Set<string>();
  private readonly existingEvidenceRefs = new Set<string>();
  private readonly writer: GraphWriter;
  private readonly runId: string;
  private readonly caseId: string;
  private readonly existingStableIdentities: Partial<
    Record<OntologyNodeType, Iterable<string>>
  >;

  constructor(options: GraphPatchGatewayOptions) {
    this.writer = options.writer;
    this.runId = options.runId;
    this.caseId = options.caseId;
    this.existingStableIdentities = options.existingStableIdentities ?? {};

    this.seedCaseRef(options.caseId, "InvestmentCase");
  }

  async submit(patch: GraphPatch, submittedAt: string = new Date().toISOString()): Promise<GraphPatchSubmissionResult> {
    const context: GraphWriteContext = {
      requestId: buildGraphRequestId(patch.targetScope),
      submittedAt,
      runId: this.runId,
      caseId: this.caseId,
      refNodeTypes: Object.fromEntries(this.refNodeTypes),
      existingRuntimeRefs: this.existingRuntimeRefs,
      existingCaseRefs: this.existingCaseRefs,
      existingEvidenceRefs: this.existingEvidenceRefs,
    };

    if (Object.keys(this.existingStableIdentities).length > 0) {
      context.existingStableIdentities = this.existingStableIdentities;
    }

    const result = await submitGraphPatch(patch, context, this.writer);

    if (result.status === "accepted") {
      this.applyAcceptedPatch(patch);
    }

    return result;
  }

  seedRuntimeRef(ref: string, nodeType: GraphNodeType): void {
    this.registerRef(ref, nodeType, "runtime");
  }

  seedCaseRef(ref: string, nodeType: GraphNodeType): void {
    this.registerRef(ref, nodeType, "case");
  }

  snapshot(): GraphPatchGatewaySnapshot {
    return {
      runId: this.runId,
      caseId: this.caseId,
      refNodeTypes: Object.fromEntries(this.refNodeTypes),
      existingRuntimeRefs: [...this.existingRuntimeRefs],
      existingCaseRefs: [...this.existingCaseRefs],
      existingEvidenceRefs: [...this.existingEvidenceRefs],
    };
  }

  private applyAcceptedPatch(patch: GraphPatch): void {
    for (const operation of patch.operations) {
      switch (operation.type) {
        case "create_node":
          this.registerRef(operation.nodeRef, operation.nodeType, patch.targetScope);
          break;
        case "merge_node":
          this.registerRef(operation.resolvedRef, operation.nodeType, patch.targetScope);
          break;
        case "create_edge":
        case "update_property":
        case "attach_evidence":
        case "summarize_subgraph":
          break;
        default:
          assertNever(operation);
      }
    }
  }

  private registerRef(ref: string, nodeType: GraphNodeType, scope: GraphTargetScope): void {
    this.refNodeTypes.set(ref, nodeType);

    if (scope === "runtime") {
      this.existingRuntimeRefs.add(ref);
    } else {
      this.existingCaseRefs.add(ref);
    }

    if (nodeType === "Evidence") {
      this.existingEvidenceRefs.add(ref);
    }
  }
}

function buildGraphRequestId(scope: GraphTargetScope): string {
  return `graph_${scope}_${Date.now()}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
