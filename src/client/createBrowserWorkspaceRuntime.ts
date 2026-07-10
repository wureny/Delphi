import { createFetchWorkspaceHttpTransport } from "../api/fetchWorkspaceHttpTransport";
import { HttpWorkspaceApiClient } from "../api/workspaceHttpApi";
import type { WorkspaceApiRuntime } from "../api/workspaceApiTypes";

export function createBrowserWorkspaceRuntime(
  apiBaseUrl = import.meta.env.VITE_DELPHI_API_BASE_URL ?? "",
): WorkspaceApiRuntime {
  return new HttpWorkspaceApiClient(createFetchWorkspaceHttpTransport({ baseUrl: apiBaseUrl }));
}
