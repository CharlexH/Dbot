import { NextResponse } from "next/server";
import { createGenerateRequest } from "@/lib/dbot";
import { normalizeGeminiModel } from "@/lib/gemini-models";
import { createJobRecord, deriveJobSnapshot, getJobRepository } from "@/lib/jobs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createGenerateRequest({
      url: body.url,
      selectedPresetId: body.selectedPresetIds?.[0] ?? body.selectedPresetId,
      selectedCategory: body.selectedCategoryIds?.[0] ?? body.selectedCategory
    });

    if (body.geminiApiKey) {
      payload.geminiApiKey = body.geminiApiKey;
    }

    const geminiModel = normalizeGeminiModel(body.geminiModel);
    if (geminiModel) {
      payload.geminiModel = geminiModel;
    }

    const repository = getJobRepository();
    const job = createJobRecord(payload);
    await repository.save(job);

    return NextResponse.json(
      {
        jobId: job.id,
        route: `/results/${job.id}`,
        snapshot: deriveJobSnapshot(job)
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create job."
      },
      { status: 400 }
    );
  }
}
