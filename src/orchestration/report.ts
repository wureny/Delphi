import { randomUUID } from "node:crypto";

import type {
  FinalReport,
  FinalReportSectionKey,
  ReportSectionRecord,
  SectionCitationMap,
} from "./contracts.ts";
import { finalReportSectionKeys } from "./contracts.ts";

export const reportSectionTitles: Record<FinalReportSectionKey, string> = {
  final_judgment: "Final Judgment",
  core_thesis: "Core Thesis",
  supporting_evidence: "Supporting Evidence",
  key_risks: "Key Risks",
  liquidity_context: "Liquidity Context",
  what_changes_the_view: "What Changes The View",
};

export function createReportSectionId(runId: string, sectionKey: FinalReportSectionKey): string {
  return `section:${runId}:${sectionKey}`;
}

export function createEmptyReportSections(runId: string): ReportSectionRecord[] {
  return finalReportSectionKeys.map((sectionKey) => ({
    sectionId: createReportSectionId(runId, sectionKey),
    runId,
    sectionKey,
    title: reportSectionTitles[sectionKey],
    content: "",
    citationFindingRefs: [],
    citationEvidenceRefs: [],
    status: "empty",
  }));
}

export function normalizeReportSections(
  runId: string,
  sections: readonly ReportSectionRecord[],
): ReportSectionRecord[] {
  const sectionByKey = new Map<FinalReportSectionKey, ReportSectionRecord>();

  for (const section of sections) {
    sectionByKey.set(section.sectionKey, section);
  }

  return finalReportSectionKeys.map((sectionKey) => {
    const existing = sectionByKey.get(sectionKey);

    if (existing) {
      return existing;
    }

    return {
      sectionId: createReportSectionId(runId, sectionKey),
      runId,
      sectionKey,
      title: reportSectionTitles[sectionKey],
      content: "",
      citationFindingRefs: [],
      citationEvidenceRefs: [],
      status: "empty",
    };
  });
}

export interface BuildFinalReportOptions {
  runId: string;
  caseId: string;
  generatedAt?: string;
  sections: readonly ReportSectionRecord[];
}

export function buildFinalReport(options: BuildFinalReportOptions): FinalReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const normalizedSections = normalizeReportSections(options.runId, options.sections);

  return {
    reportId: `report_${randomUUID()}`,
    runId: options.runId,
    caseId: options.caseId,
    generatedBy: "judge",
    generatedAt,
    finalJudgment: getSectionContent(normalizedSections, "final_judgment"),
    coreThesis: getSectionContent(normalizedSections, "core_thesis"),
    supportingEvidence: getSectionContent(normalizedSections, "supporting_evidence"),
    keyRisks: getSectionContent(normalizedSections, "key_risks"),
    liquidityContext: getSectionContent(normalizedSections, "liquidity_context"),
    whatChangesTheView: getSectionContent(normalizedSections, "what_changes_the_view"),
    sectionCitations: buildSectionCitationMap(normalizedSections),
  };
}

function getSectionContent(
  sections: readonly ReportSectionRecord[],
  sectionKey: FinalReportSectionKey,
): string {
  const section = sections.find((candidate) => candidate.sectionKey === sectionKey);
  return section?.content ?? "";
}

function buildSectionCitationMap(
  sections: readonly ReportSectionRecord[],
): SectionCitationMap {
  return {
    final_judgment: collectCitations(sections, "final_judgment"),
    core_thesis: collectCitations(sections, "core_thesis"),
    supporting_evidence: collectCitations(sections, "supporting_evidence"),
    key_risks: collectCitations(sections, "key_risks"),
    liquidity_context: collectCitations(sections, "liquidity_context"),
    what_changes_the_view: collectCitations(sections, "what_changes_the_view"),
  };
}

function collectCitations(
  sections: readonly ReportSectionRecord[],
  sectionKey: FinalReportSectionKey,
): string[] {
  const section = sections.find((candidate) => candidate.sectionKey === sectionKey);

  if (!section) {
    return [];
  }

  return [...section.citationFindingRefs, ...section.citationEvidenceRefs];
}
