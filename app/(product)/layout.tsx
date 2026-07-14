import { Shell } from "@/components/shell/Shell";
import { degradedRun, successRun } from "@/fixtures/loader";
import { createRuntimeComposition } from "@/runtime/config";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const runtime = createRuntimeComposition(process.env, {
    success: successRun,
    degraded: degradedRun,
  });

  return <Shell capabilities={runtime.capabilities}>{children}</Shell>;
}
