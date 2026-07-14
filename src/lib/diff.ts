/** Structural before/after diff between two thesis snapshots. */
import type { ThesisSnapshot } from "@/domain/types";
import { stableStringify } from "@/domain/hash";
import { semanticThesisProjection } from "@/domain/semantic-thesis";

export interface FieldChange {
  objectType: string;
  objectId: string;
  objectLabel: string;
  field: string;
  before: string;
  after: string;
}

export interface AddedObject {
  objectType: string;
  objectId: string;
  label: string;
}

export interface RemovedObject {
  objectType: string;
  objectId: string;
  label: string;
}

export interface ThesisDiff {
  changes: FieldChange[];
  added: AddedObject[];
  removed: RemovedObject[];
}

function displayValue(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  return stableStringify(value);
}

function compareCollection<T extends object>(
  objectType: string,
  before: T[],
  after: T[],
  idKey: keyof T,
  labelKey: keyof T,
  fields: Array<keyof T>,
  out: ThesisDiff,
) {
  const beforeById = new Map(before.map((item) => [item[idKey] as string, item]));
  const afterIds = new Set(after.map((item) => item[idKey] as string));
  for (const item of after) {
    const id = item[idKey] as string;
    const prev = beforeById.get(id);
    if (!prev) {
      out.added.push({ objectType, objectId: id, label: String(item[labelKey]) });
      continue;
    }
    for (const field of fields) {
      if (stableStringify(prev[field]) !== stableStringify(item[field])) {
        out.changes.push({
          objectType,
          objectId: id,
          objectLabel: String(item[labelKey]),
          field: String(field),
          before: displayValue(prev[field]),
          after: displayValue(item[field]),
        });
      }
    }
  }
  for (const item of before) {
    const id = item[idKey] as string;
    if (!afterIds.has(id)) {
      out.removed.push({ objectType, objectId: id, label: String(item[labelKey]) });
    }
  }
}

export function diffThesis(before: ThesisSnapshot, after: ThesisSnapshot): ThesisDiff {
  const beforeSemantic = semanticThesisProjection(before);
  const afterSemantic = semanticThesisProjection(after);
  const out: ThesisDiff = { changes: [], added: [], removed: [] };
  if (beforeSemantic.summary !== afterSemantic.summary) {
    out.changes.push({
      objectType: "thesis",
      objectId: after.thesisId,
      objectLabel: "Thesis summary",
      field: "summary",
      before: beforeSemantic.summary,
      after: afterSemantic.summary,
    });
  }
  compareCollection("Thesis pillar", beforeSemantic.pillars, afterSemantic.pillars, "pillarId", "title", ["title", "status", "teamConviction", "statement", "ownerUserId", "evidenceRefs"], out);
  compareCollection("Forecast", beforeSemantic.forecasts, afterSemantic.forecasts, "forecastId", "metric", ["metric", "period", "scenario", "status", "value", "minValue", "maxValue", "unit", "currency", "ownerUserId"], out);
  compareCollection("Risk", beforeSemantic.risks, afterSemantic.risks, "riskId", "title", ["title", "description", "status", "severity", "likelihood", "evidenceRefs"], out);
  compareCollection("Open question", beforeSemantic.openQuestions, afterSemantic.openQuestions, "questionId", "question", ["question", "ownerUserId", "status", "evidenceRefs"], out);
  compareCollection("Catalyst", beforeSemantic.catalysts, afterSemantic.catalysts, "catalystId", "title", ["title", "expectedAt", "probability", "expectedImpact", "status"], out);
  return out;
}
