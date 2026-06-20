import type { MetricThreshold } from "../domain/financialData";

export const defaultMetricThresholds: MetricThreshold[] = [
  {
    metricKey: "gross_margin",
    label: "gross margin above 70%",
    operator: "<",
    threshold: 70,
    thesisId: "th_ngsc",
    assumptionId: "a_ngsc_3",
    impactWhenBreached: "contradicts",
  },
  {
    metricKey: "revenue_growth_yoy",
    label: "revenue growth above 25%",
    operator: ">=",
    threshold: 25,
    thesisId: "th_ngsc",
    assumptionId: "a_ngsc_1",
    impactWhenBreached: "supports",
  },
  {
    metricKey: "comparable_sales_growth",
    label: "comparable sales growth above 4%",
    operator: ">=",
    threshold: 4,
    thesisId: "th_retl",
    assumptionId: "a_retl_2",
    impactWhenBreached: "supports",
  },
];
