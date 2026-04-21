import { NextResponse } from "next/server";
import { deriveJobSnapshot, getJobRepository, prepareJobForCoverageResume, prepareJobForRetry } from "@/lib/jobs";
import { advanceJob } from "@/lib/orchestration";

export async function GET(request: Request, { params }: { params: { jobId: string } }) {
  const repository = getJobRepository();
  let job = await repository.findById(params.jobId);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const retryRequested = new URL(request.url).searchParams.get("retry") === "1";

  if (retryRequested && job.status === "failed") {
    job = prepareJobForRetry(job);
    await repository.save(job);
  }

  if (retryRequested && job.status === "completed") {
    job = prepareJobForCoverageResume(job);
    await repository.save(job);
  }

  if (job.status !== "completed" && job.status !== "failed") {
    job = await advanceJob(job);
    await repository.save(job);
  }

  return NextResponse.json(deriveJobSnapshot(job));
}
