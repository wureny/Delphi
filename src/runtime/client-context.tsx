"use client";

import { createContext, useContext, useMemo } from "react";
import type { AnalysisAdapter } from "./adapter";
import { FixtureAnalysisAdapter } from "./adapter";
import type { RuntimeCapabilities } from "./config";
import { degradedRun, defaultSuccessRun } from "@/fixtures/loader";

interface ClientRuntime {
  capabilities: RuntimeCapabilities;
  analysisAdapter: AnalysisAdapter;
}

const RuntimeContext = createContext<ClientRuntime | null>(null);

export function RuntimeProvider({
  capabilities,
  children,
}: {
  capabilities: RuntimeCapabilities;
  children: React.ReactNode;
}) {
  const analysisAdapter = useMemo(
    () => new FixtureAnalysisAdapter({ success: defaultSuccessRun, degraded: degradedRun }),
    [],
  );
  const value = useMemo(
    () => ({ capabilities, analysisAdapter }),
    [analysisAdapter, capabilities],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useClientRuntime(): ClientRuntime {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("useClientRuntime must be used inside RuntimeProvider");
  return runtime;
}
