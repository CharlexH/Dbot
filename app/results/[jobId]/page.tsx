import { notFound } from "next/navigation";
import { ResultsClient } from "@/components/results/results-client";
import { deriveJobSnapshot, getJobRepository } from "@/lib/jobs";

export default async function ResultsPage({ params }: { params: { jobId: string } }) {
  const repository = getJobRepository();
  const job = await repository.findById(params.jobId);

  if (!job) {
    notFound();
  }

  const snapshot = deriveJobSnapshot(job);

  return <ResultsClient initialSnapshot={snapshot} jobId={params.jobId} />;
}
