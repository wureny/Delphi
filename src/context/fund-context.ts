import type {
  CaseContextBinding,
  FundContextArtifact,
  FundContextManifest,
  SourceBundle,
  ThesisDeltaProposal,
  ThesisSnapshot,
  WorkflowRunBundle,
} from "@/domain/types";
import { semanticThesisHash } from "@/domain/semantic-thesis";
import { contentHash } from "@/domain/hash";

export type FundContextIssueCode =
  | "duplicate_connector"
  | "duplicate_artifact"
  | "connector_missing"
  | "object_missing"
  | "metadata_mismatch"
  | "unsafe_model_policy"
  | "derived_reference_missing"
  | "provenance_incomplete"
  | "binding_missing"
  | "point_in_time_violation";

export interface FundContextIssue {
  code: FundContextIssueCode;
  message: string;
  artifactId?: string;
}

export interface FundContextValidationInput {
  manifest: FundContextManifest;
  sources: SourceBundle[];
  thesis: ThesisSnapshot;
  knownObjectRefs: ReadonlySet<string>;
}

function duplicateIds(values: string[]): Set<string> {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return duplicates;
}

function metadataIssue(artifact: FundContextArtifact, field: string): FundContextIssue {
  return {
    code: "metadata_mismatch",
    artifactId: artifact.artifactId,
    message: `${artifact.artifactId} does not match ${artifact.objectRef} ${field}`,
  };
}

export function collectFundContextObjectRefs({
  sources,
  thesis,
  proposals,
  runs,
}: {
  sources: SourceBundle[];
  thesis: ThesisSnapshot;
  proposals: ThesisDeltaProposal[];
  runs: WorkflowRunBundle[];
}): Set<string> {
  const refs = new Set<string>([thesis.thesisId]);
  for (const source of sources) {
    refs.add(source.sourceDocument.sourceId);
    for (const excerpt of source.excerpts) refs.add(excerpt.excerptId);
  }
  for (const item of [
    ...thesis.pillars.map((value) => value.pillarId),
    ...thesis.forecasts.map((value) => value.forecastId),
    ...thesis.risks.map((value) => value.riskId),
    ...thesis.catalysts.map((value) => value.catalystId),
    ...thesis.openQuestions.map((value) => value.questionId),
  ]) {
    refs.add(item);
  }
  for (const proposal of proposals) refs.add(proposal.proposalId);
  for (const run of runs) refs.add(run.workflowRun.runId);
  return refs;
}

export function validateFundContextManifest({
  manifest,
  sources,
  thesis,
  knownObjectRefs,
}: FundContextValidationInput): FundContextIssue[] {
  const issues: FundContextIssue[] = [];
  const connectorIds = new Set(manifest.connectors.map((connector) => connector.connectorId));
  const sourceById = new Map(sources.map((bundle) => [bundle.sourceDocument.sourceId, bundle.sourceDocument]));

  for (const connectorId of duplicateIds(manifest.connectors.map((connector) => connector.connectorId))) {
    issues.push({ code: "duplicate_connector", message: `Duplicate connector ${connectorId}` });
  }
  for (const artifactId of duplicateIds(manifest.artifacts.map((artifact) => artifact.artifactId))) {
    issues.push({ code: "duplicate_artifact", artifactId, message: `Duplicate artifact ${artifactId}` });
  }

  for (const artifact of manifest.artifacts) {
    if (!connectorIds.has(artifact.connectorId)) {
      issues.push({
        code: "connector_missing",
        artifactId: artifact.artifactId,
        message: `${artifact.artifactId} references missing connector ${artifact.connectorId}`,
      });
    }

    if (artifact.objectKind === "source_document") {
      const source = sourceById.get(artifact.objectRef);
      if (!source) {
        issues.push({
          code: "object_missing",
          artifactId: artifact.artifactId,
          message: `${artifact.artifactId} references missing source ${artifact.objectRef}`,
        });
      } else {
        if (artifact.classification !== source.classification) issues.push(metadataIssue(artifact, "classification"));
        if (artifact.contentHash !== source.contentHash) issues.push(metadataIssue(artifact, "content hash"));
        if (artifact.version !== source.version) issues.push(metadataIssue(artifact, "version"));
        if (artifact.asOf !== (source.publishedAt ?? source.observedAt)) issues.push(metadataIssue(artifact, "as-of time"));
        if (artifact.observedAt !== source.observedAt) issues.push(metadataIssue(artifact, "observation time"));
        if (artifact.accessPolicyId !== source.accessPolicyId) issues.push(metadataIssue(artifact, "access policy"));
      }
    } else if (artifact.objectRef !== thesis.thesisId) {
      issues.push({
        code: "object_missing",
        artifactId: artifact.artifactId,
        message: `${artifact.artifactId} references missing thesis ${artifact.objectRef}`,
      });
    } else {
      if (artifact.contentHash !== semanticThesisHash(thesis)) issues.push(metadataIssue(artifact, "semantic hash"));
      if (artifact.version !== thesis.version) issues.push(metadataIssue(artifact, "version"));
      if (artifact.asOf !== thesis.validFrom) issues.push(metadataIssue(artifact, "as-of time"));
      if (artifact.observedAt !== thesis.recordedAt) issues.push(metadataIssue(artifact, "observation time"));
    }

    const sensitive = ["internal", "restricted", "mnpi_like"].includes(artifact.classification);
    if ((sensitive || artifact.originKind === "user_provided_local") && artifact.externalModelAccess !== "blocked") {
      issues.push({
        code: "unsafe_model_policy",
        artifactId: artifact.artifactId,
        message: `${artifact.artifactId} must block external-model access`,
      });
    }

    if (artifact.originKind === "real_public") {
      const missing = [
        artifact.publisherKind,
        artifact.publisherName,
        artifact.canonicalUri,
        artifact.retrievedAt,
        artifact.rightsNote,
      ].some((value) => !value);
      if (missing) {
        issues.push({
          code: "provenance_incomplete",
          artifactId: artifact.artifactId,
          message: `${artifact.artifactId} is real public context without complete publisher, URI, retrieval, and rights metadata`,
        });
      }
    }

    for (const derivedRef of artifact.derivedObjectRefs) {
      if (!knownObjectRefs.has(derivedRef)) {
        issues.push({
          code: "derived_reference_missing",
          artifactId: artifact.artifactId,
          message: `${artifact.artifactId} references missing derived object ${derivedRef}`,
        });
      }
    }
  }

  return issues;
}

export function defaultContextBindings(manifest: FundContextManifest): CaseContextBinding[] {
  return manifest.artifacts
    .filter((artifact) => artifact.defaultSelected)
    .map((artifact) => ({
      bindingId: `binding_${artifact.artifactId}`,
      caseId: manifest.caseId,
      artifactId: artifact.artifactId,
      contextRole: artifact.contextRole,
      scope: artifact.defaultScope ?? (artifact.contextRole === "external_evidence" ? "event" : "pre_event"),
      addedAt: manifest.generatedAt,
      source: "curated_default",
    }));
}

export function contextSetHash(bindings: readonly CaseContextBinding[]): string {
  return contentHash(
    bindings
      .map(({ caseId, artifactId, contextRole, scope, source }) => ({ caseId, artifactId, contextRole, scope, source }))
      .sort((a, b) => a.artifactId.localeCompare(b.artifactId)),
  );
}

export function validateCaseContextBindings({
  manifest,
  bindings,
}: {
  manifest: FundContextManifest;
  bindings: readonly CaseContextBinding[];
}): FundContextIssue[] {
  const issues: FundContextIssue[] = [];
  const artifacts = new Map(manifest.artifacts.map((artifact) => [artifact.artifactId, artifact]));
  const cutoff = manifest.eventCutoff ? Date.parse(manifest.eventCutoff) : undefined;
  for (const binding of bindings) {
    const artifact = artifacts.get(binding.artifactId);
    if (!artifact) {
      issues.push({
        code: "binding_missing",
        artifactId: binding.artifactId,
        message: `${binding.bindingId} references missing artifact ${binding.artifactId}`,
      });
      continue;
    }
    if (binding.caseId !== manifest.caseId) {
      issues.push({
        code: "binding_missing",
        artifactId: binding.artifactId,
        message: `${binding.bindingId} belongs to a different case`,
      });
    }
    if (binding.scope === "pre_event" && cutoff !== undefined && Date.parse(artifact.observedAt) > cutoff) {
      issues.push({
        code: "point_in_time_violation",
        artifactId: artifact.artifactId,
        message: `${artifact.artifactId} was observed after the pre-event cutoff`,
      });
    }
  }
  return issues;
}

export function summarizeFundContext(manifest: FundContextManifest) {
  const roleCounts: Record<FundContextArtifact["contextRole"], number> = {
    external_evidence: 0,
    institution_policy: 0,
    portfolio_position: 0,
    internal_working_context: 0,
    internal_approved_state: 0,
    local_reference: 0,
  };
  for (const artifact of manifest.artifacts) roleCounts[artifact.contextRole] += 1;
  return {
    connectorCount: manifest.connectors.length,
    artifactCount: manifest.artifacts.length,
    externalTransferCount: manifest.artifacts.filter((artifact) => artifact.externalTransfer).length,
    roleCounts,
  };
}
