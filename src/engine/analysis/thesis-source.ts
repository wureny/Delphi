/**
 * Expose the approved thesis as a citable source bundle.
 *
 * "Against our view" claims must be grounded too: the model cites these
 * excerpts when it states what the team believed, and the numeric validator
 * checks forecast values against them exactly like external evidence.
 */
import type { SourceBundle, SourceExcerpt, ThesisSnapshot } from "@/domain/types";
import { contentHash, sha256Hex } from "@/domain/hash";
import { extractNumbers } from "@/domain/validators";

export function thesisSourceId(thesis: ThesisSnapshot): string {
  return `source_thesis_${thesis.thesisId}_v${thesis.version}`;
}

function describeObjects(thesis: ThesisSnapshot): Array<{ objectId: string; text: string }> {
  const out: Array<{ objectId: string; text: string }> = [];
  for (const p of thesis.pillars) {
    out.push({ objectId: p.pillarId, text: `Pillar "${p.title}": ${p.statement} Team conviction: ${p.teamConviction}. Status: ${p.status}.` });
  }
  for (const f of thesis.forecasts) {
    const value = f.value !== undefined ? `${f.value}` : `${f.minValue ?? "?"} to ${f.maxValue ?? "?"}`;
    const actual = f.actualValue !== undefined ? ` Actual: ${f.actualValue} ${f.unit}.` : "";
    out.push({ objectId: f.forecastId, text: `Forecast: ${f.metric}, ${f.period}, ${f.scenario} case: ${value} ${f.unit}.${actual} Status: ${f.status}.` });
  }
  for (const r of thesis.risks) {
    out.push({ objectId: r.riskId, text: `Risk "${r.title}": ${r.description} Severity: ${r.severity}. Likelihood: ${r.likelihood}. Status: ${r.status}.` });
  }
  for (const q of thesis.openQuestions) {
    out.push({ objectId: q.questionId, text: `Open question: ${q.question} Status: ${q.status}.` });
  }
  for (const c of thesis.catalysts) {
    out.push({ objectId: c.catalystId, text: `Catalyst "${c.title}", expected by ${c.expectedAt.slice(0, 10)}: ${c.expectedImpact}. Status: ${c.status}.` });
  }
  return out;
}

export function thesisToSourceBundle(thesis: ThesisSnapshot): SourceBundle {
  const sourceId = thesisSourceId(thesis);
  const excerpts: SourceExcerpt[] = describeObjects(thesis).map(({ objectId, text }) => {
    const excerptId = `excerpt_${sourceId}_${objectId}`;
    return {
      excerptId,
      sourceId,
      locator: { section: objectId },
      text,
      numericValues: extractNumbers(text).map((value) => ({
        label: "stated",
        value,
        unit: "as_stated",
        basis: "approved_thesis",
        sourceExcerptId: excerptId,
      })),
      classification: "internal",
      contentHash: `sha256:${sha256Hex(text)}`,
    };
  });

  return {
    fixtureVersion: "live",
    schemaVersion: "0.3.0",
    synthetic: thesis.synthetic,
    sourceDocument: {
      sourceId,
      tenantId: "tenant_delphi_live",
      title: `Approved thesis v${thesis.version}`,
      sourceType: "approved_thesis",
      issuerEntityId: thesis.caseId,
      uri: `delphi://thesis/${thesis.thesisId}/v${thesis.version}`,
      observedAt: thesis.recordedAt,
      publishedAt: thesis.approvedAt,
      classification: "internal",
      contentHash: contentHash(thesis),
      version: thesis.version,
      accessPolicyId: "policy_internal_thesis",
      status: "available",
      originKind: thesis.originKind ?? "demo_derived",
      publisherKind: "demo_team",
      publisherName: "Approved team thesis",
    },
    excerpts,
  };
}
