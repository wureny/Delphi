/**
 * Read-only product graph projection.
 *
 * This is not a graph database and never owns canonical state. It projects
 * current Delphi product objects into stable nodes and typed relationships so
 * the shape can be inspected and later backed by a replaceable adapter.
 */
import type {
  DomainState,
  FundContextManifest,
  InvestmentCase,
  Review,
  SourceBundle,
  StateTransition,
  ThesisDeltaProposal,
  ThesisSnapshot,
  WorkflowRunBundle,
} from "@/domain/types";
import { semanticThesisHash } from "@/domain/semantic-thesis";

export type ProductGraphNodeKind =
  | "case"
  | "thesis"
  | "pillar"
  | "forecast"
  | "risk"
  | "catalyst"
  | "open_question"
  | "source"
  | "evidence"
  | "run"
  | "proposal"
  | "review"
  | "transition"
  | "connector";

export type ProductGraphEdgeType =
  | "HAS_THESIS"
  | "HAS_PILLAR"
  | "HAS_FORECAST"
  | "HAS_RISK"
  | "HAS_CATALYST"
  | "HAS_OPEN_QUESTION"
  | "CONTAINS_EVIDENCE"
  | "SUPPORTED_BY"
  | "PRODUCED"
  | "TARGETS"
  | "CITES"
  | "REVIEWS"
  | "APPLIES"
  | "WRITES_TO"
  | "PROVIDES_CONTEXT"
  | "CONTEXTUALIZES";

type ProductGraphAttribute = string | number | boolean | null;

export interface ProductGraphNode {
  id: string;
  kind: ProductGraphNodeKind;
  label: string;
  status?: string;
  attributes: Record<string, ProductGraphAttribute>;
}

export interface ProductGraphEdge {
  id: string;
  type: ProductGraphEdgeType;
  from: string;
  to: string;
  provenanceRefs: string[];
}

export interface ProductGraphProjection {
  projectionId: string;
  caseId: string;
  thesisId: string;
  thesisVersion: number;
  sourceSemanticHash: string;
  mode: "projection_only";
  nodes: ProductGraphNode[];
  edges: ProductGraphEdge[];
}

export interface GraphProjectionInput {
  investmentCase: InvestmentCase;
  domain: DomainState;
  proposals: ThesisDeltaProposal[];
  runs: WorkflowRunBundle[];
  sources: SourceBundle[];
  context?: FundContextManifest;
}

export interface GraphProjectionPort {
  project(input: GraphProjectionInput): ProductGraphProjection;
}

export interface GraphProjectionValidation {
  status: "current" | "stale";
  reasonCode?: "case_mismatch" | "thesis_mismatch" | "version_mismatch" | "semantic_hash_mismatch";
}

function edgeId(type: ProductGraphEdgeType, from: string, to: string): string {
  return `edge:${type.toLowerCase()}:${from}:${to}`;
}

function projectThesisObjects(
  thesis: ThesisSnapshot,
  addNode: (node: ProductGraphNode) => void,
  hasNode: (nodeId: string) => boolean,
  addEdge: (edge: ProductGraphEdge) => void,
) {
  const groups = [
    { items: thesis.pillars, kind: "pillar" as const, relation: "HAS_PILLAR" as const, id: "pillarId" as const, label: "title" as const },
    { items: thesis.forecasts, kind: "forecast" as const, relation: "HAS_FORECAST" as const, id: "forecastId" as const, label: "metric" as const },
    { items: thesis.risks, kind: "risk" as const, relation: "HAS_RISK" as const, id: "riskId" as const, label: "title" as const },
    { items: thesis.catalysts, kind: "catalyst" as const, relation: "HAS_CATALYST" as const, id: "catalystId" as const, label: "title" as const },
    { items: thesis.openQuestions, kind: "open_question" as const, relation: "HAS_OPEN_QUESTION" as const, id: "questionId" as const, label: "question" as const },
  ];

  for (const group of groups) {
    for (const rawItem of group.items) {
      const item = rawItem as unknown as Record<string, unknown>;
      const id = String(item[group.id]);
      const evidenceRefs = Array.isArray(item.evidenceRefs) ? item.evidenceRefs.map(String) : [];
      addNode({
        id,
        kind: group.kind,
        label: String(item[group.label]),
        status: typeof item.status === "string" ? item.status : undefined,
        attributes: {
          ownerUserId: typeof item.ownerUserId === "string" ? item.ownerUserId : null,
          evidenceCount: evidenceRefs.length,
        },
      });
      addEdge({
        id: edgeId(group.relation, thesis.thesisId, id),
        type: group.relation,
        from: thesis.thesisId,
        to: id,
        provenanceRefs: [],
      });
      for (const evidenceId of evidenceRefs) {
        if (!hasNode(evidenceId)) {
          addNode({
            id: evidenceId,
            kind: "evidence",
            label: `Unavailable historical evidence · ${evidenceId}`,
            status: "unavailable",
            attributes: { classification: "unknown", contentHash: null },
          });
        }
        addEdge({
          id: edgeId("SUPPORTED_BY", id, evidenceId),
          type: "SUPPORTED_BY",
          from: id,
          to: evidenceId,
          provenanceRefs: [evidenceId],
        });
      }
    }
  }
}

export class DeterministicGraphProjectionPort implements GraphProjectionPort {
  project(input: GraphProjectionInput): ProductGraphProjection {
    const thesis = input.domain.currentThesis;
    const nodes = new Map<string, ProductGraphNode>();
    const edges = new Map<string, ProductGraphEdge>();
    const addNode = (node: ProductGraphNode) => nodes.set(node.id, node);
    const addEdge = (edge: ProductGraphEdge) => edges.set(edge.id, edge);

    addNode({
      id: input.investmentCase.caseId,
      kind: "case",
      label: `${input.investmentCase.companyName} (${input.investmentCase.ticker})`,
      status: input.investmentCase.status,
      attributes: { sector: input.investmentCase.sector, horizon: input.investmentCase.horizon },
    });
    addNode({
      id: thesis.thesisId,
      kind: "thesis",
      label: `Approved thesis v${thesis.version}`,
      status: thesis.status,
      attributes: { version: thesis.version, ownerUserId: thesis.ownerUserId },
    });
    addEdge({
      id: edgeId("HAS_THESIS", input.investmentCase.caseId, thesis.thesisId),
      type: "HAS_THESIS",
      from: input.investmentCase.caseId,
      to: thesis.thesisId,
      provenanceRefs: [],
    });

    for (const bundle of input.sources) {
      const source = bundle.sourceDocument;
      addNode({
        id: source.sourceId,
        kind: "source",
        label: source.title,
        status: source.status,
        attributes: {
          sourceType: source.sourceType,
          classification: source.classification,
          observedAt: source.observedAt,
          version: source.version,
          accessPolicyId: source.accessPolicyId,
          contentHash: source.contentHash,
        },
      });
      for (const excerpt of bundle.excerpts) {
        addNode({
          id: excerpt.excerptId,
          kind: "evidence",
          label: excerpt.text.length > 72 ? `${excerpt.text.slice(0, 69)}…` : excerpt.text,
          attributes: {
            sourceId: excerpt.sourceId,
            classification: excerpt.classification,
            contentHash: excerpt.contentHash,
          },
        });
        addEdge({
          id: edgeId("CONTAINS_EVIDENCE", source.sourceId, excerpt.excerptId),
          type: "CONTAINS_EVIDENCE",
          from: source.sourceId,
          to: excerpt.excerptId,
          provenanceRefs: [excerpt.excerptId],
        });
      }
    }

    projectThesisObjects(thesis, addNode, (nodeId) => nodes.has(nodeId), addEdge);

    for (const bundle of input.runs) {
      const run = bundle.workflowRun;
      addNode({
        id: run.runId,
        kind: "run",
        label: `${run.workflowId} · ${run.status}`,
        status: run.status,
        attributes: { mode: run.mode, workflowVersion: run.workflowVersion },
      });
    }

    for (const proposal of input.proposals) {
      addNode({
        id: proposal.proposalId,
        kind: "proposal",
        label: proposal.headline,
        status: proposal.status,
        attributes: { materiality: proposal.materiality, confidence: proposal.confidence },
      });
      addEdge({
        id: edgeId("PRODUCED", proposal.runId, proposal.proposalId),
        type: "PRODUCED",
        from: proposal.runId,
        to: proposal.proposalId,
        provenanceRefs: proposal.findingRefs,
      });
      if (proposal.targetObjectId && nodes.has(proposal.targetObjectId)) {
        addEdge({
          id: edgeId("TARGETS", proposal.proposalId, proposal.targetObjectId),
          type: "TARGETS",
          from: proposal.proposalId,
          to: proposal.targetObjectId,
          provenanceRefs: proposal.findingRefs,
        });
      }
      for (const evidenceId of proposal.evidenceRefs) {
        addEdge({
          id: edgeId("CITES", proposal.proposalId, evidenceId),
          type: "CITES",
          from: proposal.proposalId,
          to: evidenceId,
          provenanceRefs: [evidenceId],
        });
      }
    }

    for (const review of input.domain.reviews) {
      this.addReview(review, addNode, addEdge);
    }
    for (const transition of input.domain.transitions) {
      this.addTransition(transition, thesis, addNode, addEdge);
    }
    if (input.context) {
      for (const connector of input.context.connectors) {
        addNode({
          id: connector.connectorId,
          kind: "connector",
          label: connector.label,
          status: connector.status,
          attributes: {
            connectorType: connector.connectorType,
            mode: connector.mode,
            accessMode: connector.accessMode,
            executionLocation: connector.executionLocation,
            persistence: connector.persistence,
          },
        });
      }
      for (const artifact of input.context.artifacts) {
        const objectNode = nodes.get(artifact.objectRef);
        if (!objectNode || !nodes.has(artifact.connectorId)) continue;
        addNode({
          ...objectNode,
          attributes: {
            ...objectNode.attributes,
            contextRole: artifact.contextRole,
            contextDataOwner: artifact.dataOwner,
            contextClassification: artifact.classification,
            contextAccessPolicyId: artifact.accessPolicyId,
            contextAllowedRoles: artifact.allowedRoles.join(" · "),
            contextAsOf: artifact.asOf,
            contextObservedAt: artifact.observedAt,
            contextVersion: artifact.version,
            contextContentHash: artifact.contentHash,
            contextExternalModelAccess: artifact.externalModelAccess,
            contextExternalTransfer: artifact.externalTransfer,
            contextLifecycleStage: artifact.lifecycleStage,
            contextDeletionPropagation: artifact.deletionPropagation,
            contextGraphProjection: artifact.graphProjection,
          },
        });
        addEdge({
          id: edgeId("PROVIDES_CONTEXT", artifact.connectorId, artifact.objectRef),
          type: "PROVIDES_CONTEXT",
          from: artifact.connectorId,
          to: artifact.objectRef,
          provenanceRefs: [artifact.artifactId],
        });
        for (const derivedObjectRef of artifact.derivedObjectRefs) {
          if (derivedObjectRef === artifact.objectRef || !nodes.has(derivedObjectRef)) continue;
          addEdge({
            id: edgeId("CONTEXTUALIZES", artifact.objectRef, derivedObjectRef),
            type: "CONTEXTUALIZES",
            from: artifact.objectRef,
            to: derivedObjectRef,
            provenanceRefs: [artifact.artifactId],
          });
        }
      }
    }

    return {
      projectionId: `graph:${input.investmentCase.caseId}:thesis:v${thesis.version}`,
      caseId: input.investmentCase.caseId,
      thesisId: thesis.thesisId,
      thesisVersion: thesis.version,
      sourceSemanticHash: semanticThesisHash(thesis),
      mode: "projection_only",
      nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
      edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
  }

  private addReview(
    review: Review,
    addNode: (node: ProductGraphNode) => void,
    addEdge: (edge: ProductGraphEdge) => void,
  ) {
    addNode({
      id: review.reviewId,
      kind: "review",
      label: `${review.action} · ${review.reviewerRole}`,
      status: review.status,
      attributes: { reviewerUserId: review.reviewerUserId, reviewedAt: review.reviewedAt },
    });
    addEdge({
      id: edgeId("REVIEWS", review.reviewId, review.proposalId),
      type: "REVIEWS",
      from: review.reviewId,
      to: review.proposalId,
      provenanceRefs: [],
    });
  }

  private addTransition(
    transition: StateTransition,
    thesis: ThesisSnapshot,
    addNode: (node: ProductGraphNode) => void,
    addEdge: (edge: ProductGraphEdge) => void,
  ) {
    addNode({
      id: transition.transitionId,
      kind: "transition",
      label: `v${transition.fromVersion} → v${transition.toVersion}`,
      status: transition.status,
      attributes: { approvedByUserId: transition.approvedByUserId, approvedAt: transition.approvedAt },
    });
    for (const proposalId of transition.proposalIds) {
      addEdge({
        id: edgeId("APPLIES", transition.transitionId, proposalId),
        type: "APPLIES",
        from: transition.transitionId,
        to: proposalId,
        provenanceRefs: transition.evidenceRefs,
      });
    }
    addEdge({
      id: edgeId("WRITES_TO", transition.transitionId, thesis.thesisId),
      type: "WRITES_TO",
      from: transition.transitionId,
      to: thesis.thesisId,
      provenanceRefs: transition.evidenceRefs,
    });
  }
}

export function validateGraphProjection(
  projection: ProductGraphProjection,
  investmentCase: InvestmentCase,
  thesis: ThesisSnapshot,
): GraphProjectionValidation {
  if (projection.caseId !== investmentCase.caseId) return { status: "stale", reasonCode: "case_mismatch" };
  if (projection.thesisId !== thesis.thesisId) return { status: "stale", reasonCode: "thesis_mismatch" };
  if (projection.thesisVersion !== thesis.version) return { status: "stale", reasonCode: "version_mismatch" };
  if (projection.sourceSemanticHash !== semanticThesisHash(thesis)) {
    return { status: "stale", reasonCode: "semantic_hash_mismatch" };
  }
  return { status: "current" };
}
