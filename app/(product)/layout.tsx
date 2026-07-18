import { Shell } from "@/components/shell/Shell";
import { degradedRun, defaultSuccessRun } from "@/fixtures/loader";
import { createRuntimeComposition } from "@/runtime/config";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const runtime = createRuntimeComposition(process.env, {
    success: defaultSuccessRun,
    degraded: degradedRun,
  });

  return <Shell capabilities={runtime.capabilities}>{children}</Shell>;
}
