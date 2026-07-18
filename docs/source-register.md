# MSFT FY2025 Q4 source register

The machine-readable register is
[`source-inventory.json`](../src/fixtures/data/real/msft-fy25q4/source-inventory.json). Each normalized bundle stores
only metadata, structured numeric facts, locators, and short excerpts. The official page remains canonical.

| Phase | Publisher | Source | Demo use |
|---|---|---|---|
| Pre-event | Microsoft Investor Relations | [FY2025 Q3 earnings release](https://www.microsoft.com/en-us/investor/earnings/FY-2025-Q3/press-release-webcast) | Revenue, Azure growth, cloud revenue baseline |
| Pre-event | Microsoft Investor Relations | [FY2025 Q3 earnings call](https://www.microsoft.com/en-us/investor/events/fy-2025/earnings-fy-2025-q3) | Capacity, Q4 Azure outlook, cloud-margin baseline |
| Event | Microsoft Investor Relations | [FY2025 Q4 earnings release](https://www.microsoft.com/en-us/Investor/earnings/FY-2025-Q4/press-release-webcast) | Revenue, Azure growth, cloud revenue |
| Event | Microsoft Investor Relations | [FY2025 Q4 earnings call](https://www.microsoft.com/en-us/investor/events/fy-2025/earnings-fy-2025-q4) | Capacity duration, capex, FY2026 Q1 outlook |
| Event | Microsoft Investor Relations | [FY2025 Q4 metrics](https://www.microsoft.com/en-us/investor/earnings/fy-2025-q4/metrics) | Cloud margin and outlook reconciliation |
| Post-event | Microsoft Investor Relations | [FY2025 annual report center](https://www.microsoft.com/investor/reports/ar25/download-center/) | Corroborating reference; excluded from pre-event thesis |
| Pre-event institutional reference | CalPERS | [Total Fund Investment Policy](https://www.calpers.ca.gov/documents/total-fund-investment-policy/download?inline=) | Public policy reference only |
| Pre-event institutional reference | SEC EDGAR | [CalPERS Form 13F information table](https://www.sec.gov/Archives/edgar/data/919079/000091907925000004/xslForm13F_X02/informationtable.xml) | Public MSFT holding row only |

The pre-event cutoff is 2025-07-30 20:00 UTC. Later-published material cannot be assigned to pre-event scope. Run
`npm run verify:sources` for the offline contract or `npm run verify:sources -- --refresh` during a deliberate source
review. Remote content may legitimately drift; update frozen hashes and normalized facts only after human review.
