import { unwrapApiResult } from "../api/workspaceApiMappers";
import type { WorkspaceApiRuntime } from "../api/workspaceApiTypes";
import type { ProviderEvidenceRefreshInput, ProviderEvidenceRefreshResult } from "./providerEvidenceService";

export class ProviderEvidenceApiService {
  constructor(private readonly runtime: WorkspaceApiRuntime) {}

  async refreshEvidence(input: ProviderEvidenceRefreshInput = {}): Promise<ProviderEvidenceRefreshResult> {
    return unwrapApiResult(
      await this.runtime.refreshProviderEvidence({
        kind: "refresh_provider_evidence",
        period: input.period,
        symbols: input.symbols,
      }),
    );
  }
}
