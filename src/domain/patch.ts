/**
 * Semantic patch engine.
 *
 * Proposals carry JSON-Patch-shaped operations, but arbitrary paths are never
 * applied to canonical state. Every operation must match an allowlisted
 * semantic pattern (collection + field + operation), resolve to an existing
 * object by stable ID, and carry a value that passes the field's schema.
 */
import { z } from "zod";
import type { PatchOperation, ThesisSnapshot, ValidationMessage, ValidationResult } from "./types";
import { confidenceSchema, objectStatusSchema, openQuestionSchema } from "./schemas";

interface ReplaceRule {
  collection: "pillars" | "forecasts" | "risks" | "openQuestions" | "catalysts";
  idKey: string;
  field: string;
  valueSchema: z.ZodTypeAny;
}

/** Fields the review gateway is allowed to replace on approved state. */
const REPLACE_RULES: ReplaceRule[] = [
  { collection: "pillars", idKey: "pillarId", field: "status", valueSchema: objectStatusSchema },
  { collection: "pillars", idKey: "pillarId", field: "teamConviction", valueSchema: confidenceSchema },
  { collection: "pillars", idKey: "pillarId", field: "statement", valueSchema: z.string().min(8) },
  { collection: "forecasts", idKey: "forecastId", field: "status", valueSchema: objectStatusSchema },
  { collection: "forecasts", idKey: "forecastId", field: "value", valueSchema: z.number() },
  { collection: "risks", idKey: "riskId", field: "status", valueSchema: objectStatusSchema },
  { collection: "risks", idKey: "riskId", field: "severity", valueSchema: z.enum(["low", "medium", "high", "critical"]) },
  { collection: "openQuestions", idKey: "questionId", field: "status", valueSchema: objectStatusSchema },
];

/** Collections that accept appends, with the value schema for new members. */
const ADD_RULES = [
  { collection: "openQuestions" as const, idKey: "questionId", valueSchema: openQuestionSchema },
];

const err = (code: string, message: string, objectRefs?: string[]): ValidationMessage => ({
  validator: "semantic_patch",
  severity: "error",
  code,
  message,
  objectRefs,
});

interface ParsedReplace {
  kind: "replace";
  collection: ReplaceRule["collection"];
  objectId: string;
  field: string;
  value: unknown;
  rule: ReplaceRule;
}

interface ParsedAdd {
  kind: "add";
  collection: "openQuestions";
  value: unknown;
}

type ParsedOp = ParsedReplace | ParsedAdd;

function parseOperation(op: PatchOperation): ValidationResult<ParsedOp> {
  const segments = op.path.split("/").filter(Boolean);

  if (op.op === "replace") {
    if (segments.length !== 3) {
      return { status: "rejected", messages: [err("patch_path_shape", `Replace path "${op.path}" is not "/collection/objectId/field".`)] };
    }
    const [collection, objectId, field] = segments as [string, string, string];
    const rule = REPLACE_RULES.find((r) => r.collection === collection && r.field === field);
    if (!rule) {
      return {
        status: "rejected",
        messages: [err("patch_not_allowlisted", `Replacing "${field}" on "${collection}" is not an allowed semantic operation.`)],
      };
    }
    const parsedValue = rule.valueSchema.safeParse(op.value);
    if (!parsedValue.success) {
      return {
        status: "rejected",
        messages: [err("patch_value_invalid", `Value for "${op.path}" failed validation: ${parsedValue.error.issues[0]?.message ?? "invalid"}.`)],
      };
    }
    return {
      status: "accepted",
      value: { kind: "replace", collection: rule.collection, objectId, field, value: parsedValue.data, rule },
      messages: [],
    };
  }

  if (op.op === "add") {
    if (segments.length !== 2 || segments[1] !== "-") {
      return { status: "rejected", messages: [err("patch_path_shape", `Add path "${op.path}" is not "/collection/-".`)] };
    }
    const rule = ADD_RULES.find((r) => r.collection === segments[0]);
    if (!rule) {
      return {
        status: "rejected",
        messages: [err("patch_not_allowlisted", `Appending to "${segments[0]}" is not an allowed semantic operation.`)],
      };
    }
    const parsedValue = rule.valueSchema.safeParse(op.value);
    if (!parsedValue.success) {
      return {
        status: "rejected",
        messages: [err("patch_value_invalid", `New ${rule.collection} entry failed validation: ${parsedValue.error.issues[0]?.message ?? "invalid"}.`)],
      };
    }
    return { status: "accepted", value: { kind: "add", collection: rule.collection, value: parsedValue.data }, messages: [] };
  }

  return { status: "rejected", messages: [err("patch_op_forbidden", `Operation "${op.op}" is not permitted on approved state.`)] };
}

/**
 * Validate a patch against a thesis snapshot without applying it.
 */
export function validateSemanticPatch(
  thesis: ThesisSnapshot,
  ops: PatchOperation[],
): ValidationResult<ParsedOp[]> {
  const messages: ValidationMessage[] = [];
  const parsed: ParsedOp[] = [];

  if (ops.length === 0) {
    return { status: "rejected", messages: [err("patch_empty", "Patch contains no operations.")] };
  }

  for (const op of ops) {
    const result = parseOperation(op);
    if (result.status === "rejected" || !result.value) {
      messages.push(...result.messages);
      continue;
    }
    const p = result.value;
    if (p.kind === "replace") {
      const collection = thesis[p.collection] as unknown as Array<Record<string, unknown>>;
      const target = collection.find((item) => item[p.rule.idKey] === p.objectId);
      if (!target) {
        messages.push(err("patch_target_missing", `Object "${p.objectId}" does not exist in "${p.collection}".`, [p.objectId]));
        continue;
      }
      if (Object.is(target[p.field], p.value)) {
        messages.push(
          err(
            "patch_noop",
            `Object "${p.objectId}" already has the proposed value for "${p.field}".`,
            [p.objectId],
          ),
        );
        continue;
      }
    }
    if (p.kind === "add") {
      const idKey = ADD_RULES.find((r) => r.collection === p.collection)!.idKey;
      const newId = (p.value as Record<string, unknown>)[idKey] as string;
      const exists = (thesis[p.collection] as unknown as Array<Record<string, unknown>>).some((item) => item[idKey] === newId);
      if (exists) {
        messages.push(err("patch_duplicate_add", `Object "${newId}" already exists in "${p.collection}".`, [newId]));
        continue;
      }
    }
    parsed.push(p);
  }

  if (messages.some((m) => m.severity === "error")) {
    return { status: "rejected", messages };
  }
  return { status: "accepted", value: parsed, messages };
}

/**
 * Apply a validated patch, returning a new thesis object. The input snapshot
 * is never mutated. Version bookkeeping is owned by the transition gateway,
 * not by this function.
 */
export function applySemanticPatch(
  thesis: ThesisSnapshot,
  ops: PatchOperation[],
): ValidationResult<ThesisSnapshot> {
  const validation = validateSemanticPatch(thesis, ops);
  if (validation.status === "rejected" || !validation.value) {
    return { status: "rejected", messages: validation.messages };
  }

  const next: ThesisSnapshot = structuredClone(thesis);
  for (const p of validation.value) {
    if (p.kind === "replace") {
      const collection = next[p.collection] as unknown as Array<Record<string, unknown>>;
      const target = collection.find((item) => item[p.rule.idKey] === p.objectId)!;
      target[p.field] = p.value;
    } else {
      (next[p.collection] as Array<unknown>).push(p.value);
    }
  }
  return { status: "accepted", value: next, messages: validation.messages };
}
