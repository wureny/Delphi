/**
 * Point-in-time demo theses available in the Live Desk.
 *
 * Each is anchored only to the company's prior-quarter release, so running it
 * against the latest SEC earnings filing is a genuine "new evidence" test.
 * They are demo-authored (originKind demo_derived), not a real institution's view.
 */
import type { ThesisSnapshot } from "@/domain/types";
import amzn from "../../evals/cases/amzn/thesis.json";
import cost from "../../evals/cases/cost/thesis.json";
import googl from "../../evals/cases/googl/thesis.json";
import jpm from "../../evals/cases/jpm/thesis.json";
import msft from "../../evals/cases/msft/thesis.json";
import nvda from "../../evals/cases/nvda/thesis.json";

export interface ThesisPreset {
  ticker: string;
  companyName: string;
  sector: string;
  thesis: ThesisSnapshot;
}

export const THESIS_PRESETS: ThesisPreset[] = [
  { ticker: "MSFT", companyName: "Microsoft", sector: "Cloud software", thesis: msft as ThesisSnapshot },
  { ticker: "NVDA", companyName: "NVIDIA", sector: "Semiconductors", thesis: nvda as ThesisSnapshot },
  { ticker: "GOOGL", companyName: "Alphabet", sector: "Internet", thesis: googl as ThesisSnapshot },
  { ticker: "AMZN", companyName: "Amazon", sector: "Retail & cloud", thesis: amzn as ThesisSnapshot },
  { ticker: "JPM", companyName: "JPMorgan Chase", sector: "Banks", thesis: jpm as ThesisSnapshot },
  { ticker: "COST", companyName: "Costco", sector: "Consumer staples retail", thesis: cost as ThesisSnapshot },
];

export function presetFor(ticker: string): ThesisPreset | undefined {
  return THESIS_PRESETS.find((p) => p.ticker === ticker.toUpperCase());
}
