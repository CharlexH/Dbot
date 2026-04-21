import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import { fixtureRuns } from "@/lib/mocks";

export default function MockWorkbenchPage() {
  return <WorkbenchShell run={fixtureRuns.multiExperience} />;
}
