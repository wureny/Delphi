# Define Data Provider And Research Context Boundaries

## Why

Delphi's MVP currently uses fixture evidence and synthetic assets.
The product needs real financial context, historically planned around OpenBB, but market data must not be confused with thesis evidence or investment advice.

Before integrating OpenBB, Neo4j, or external LLMs, Delphi needs a clear data boundary:

* which financial data is context only
* which source-backed observations may become evidence proposals
* how stale or unavailable provider data is represented
* what provider outputs are forbidden from changing

## Scope

This change defines and implements the first financial data provider boundary.
It adds TypeScript domain contracts, a mock provider, and deterministic conversion rules for when provider facts may become evidence proposals.

OpenBB is documented as the intended real provider, but this change does not call OpenBB yet.
It keeps CI deterministic and avoids introducing secrets, Python runtime coupling, or external network dependence.

## Out Of Scope

* Real OpenBB SDK or REST integration
* Neo4j persistence
* External LLM API calls
* Trading, brokerage, order management, price targets, or buy/sell recommendations
* Automatic thesis conviction or assumption-status changes
