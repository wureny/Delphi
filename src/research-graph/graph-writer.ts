import type { GraphPatch } from "./graph-patch.ts";
import type {
  GraphPatchValidationContext,
  GraphPatchValidationError,
  GraphPatchValidationResult,
  GraphPatchValidationWarning,
} from "./validator.ts";
import { validateGraphPatch } from "./validator.ts";

export interface GraphWriteContext extends GraphPatchValidationContext {
  requestId: string;
  submittedAt: string;
}

export interface GraphWriteReceipt {
  requestId: string;
  patchId: string;
  runId: string;
  targetScope: GraphPatch["targetScope"];
  appliedAt: string;
  acceptedOperations: number;
  touchedRefs: string[];
  warnings: GraphPatchValidationWarning[];
}

export interface GraphWriter {
  write(patch: GraphPatch, context: GraphWriteContext): Promise<GraphWriteReceipt>;
}

export interface GraphPatchAccepted {
  status: "accepted";
  patchId: string;
  runId: string;
  runEventType: "patch_accepted";
  validation: GraphPatchValidationResult;
  receipt: GraphWriteReceipt;
}

export interface GraphPatchRejected {
  status: "rejected";
  patchId: string;
  runId: string;
  runEventType: "patch_rejected";
  reason: "validation_failed" | "writer_failed";
  validation: GraphPatchValidationResult;
  errors: GraphPatchValidationError[];
  warnings: GraphPatchValidationWarning[];
}

export type GraphPatchSubmissionResult =
  | GraphPatchAccepted
  | GraphPatchRejected;

export async function submitGraphPatch(
  patch: GraphPatch,
  context: GraphWriteContext,
  writer: GraphWriter,
): Promise<GraphPatchSubmissionResult> {
  const validation = validateGraphPatch(patch, context);

  if (!validation.ok) {
    return {
      status: "rejected",
      patchId: patch.patchId,
      runId: patch.runId,
      runEventType: "patch_rejected",
      reason: "validation_failed",
      validation,
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  try {
    const receipt = await writer.write(patch, context);

    return {
      status: "accepted",
      patchId: patch.patchId,
      runId: patch.runId,
      runEventType: "patch_accepted",
      validation,
      receipt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown graph writer failure.";

    return {
      status: "rejected",
      patchId: patch.patchId,
      runId: patch.runId,
      runEventType: "patch_rejected",
      reason: "writer_failed",
      validation,
      errors: [
        {
          code: "writer_failure",
          message,
        },
      ],
      warnings: validation.warnings,
    };
  }
}

export class NoopGraphWriter implements GraphWriter {
  async write(patch: GraphPatch, context: GraphWriteContext): Promise<GraphWriteReceipt> {
    return {
      requestId: context.requestId,
      patchId: patch.patchId,
      runId: patch.runId,
      targetScope: patch.targetScope,
      appliedAt: new Date().toISOString(),
      acceptedOperations: patch.operations.length,
      touchedRefs: collectTouchedRefs(patch),
      warnings: [],
    };
  }
}

function collectTouchedRefs(patch: GraphPatch): string[] {
  const refs = new Set<string>();

  for (const operation of patch.operations) {
    switch (operation.type) {
      case "create_node":
        refs.add(operation.nodeRef);
        break;
      case "merge_node":
        refs.add(operation.resolvedRef);
        break;
      case "create_edge":
        refs.add(operation.fromRef);
        refs.add(operation.toRef);
        break;
      case "update_property":
        refs.add(operation.targetRef);
        break;
      case "attach_evidence":
        refs.add(operation.targetRef);
        refs.add(operation.evidenceRef);
        break;
      case "summarize_subgraph":
        refs.add(operation.targetRef);
        for (const sourceRef of operation.sourceRefs) {
          refs.add(sourceRef);
        }
        break;
      default:
        assertNever(operation);
    }
  }

  return [...refs];
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${JSON.stringify(value)}`);
}
