/**
 * src/lib/remotion-lambda.ts
 *
 * Remotion Lambda client — cloud rendering via AWS Lambda (Sprint 3 — US-3.1).
 *
 * Render modes (controlled by RENDER_MODE env var):
 *   "local"  — renderMedia() in the Next.js process (current dev mode)
 *   "lambda" — renderMediaOnLambda() via deployed Remotion Lambda function
 *
 * Setup steps (one-time, run from terminal):
 *   npx remotion lambda policies validate
 *   npx remotion lambda functions deploy --memory=1769 --timeout=300 --region=ap-south-1
 *   → Copy the function name output to REMOTION_FUNCTION_NAME in .env.local
 *   npx remotion lambda sites create src/remotion/index.ts --site-name=digital-invites
 *   → Copy the serve URL to REMOTION_SERVE_URL in .env.local
 */

import {
  renderMediaOnLambda,
  getRenderProgress,
  type AwsRegion,
} from "@remotion/lambda";

export interface LambdaRenderOptions {
  compositionId: string;
  inputProps: Record<string, unknown>;
  durationInFrames: number;
  fps?: number;
  codec?: "h264" | "h265" | "vp8" | "mp3";
}

export interface LambdaRenderResult {
  renderId: string;
  bucketName: string;
  outputFile: string;
  outputUrl: string;
}

// ─── Lambda Render ────────────────────────────────────────────────────────────

/**
 * Triggers a Remotion Lambda render.
 * Requires these env vars:
 *   REMOTION_FUNCTION_NAME — Lambda function name (from `remotion lambda functions deploy`)
 *   REMOTION_SERVE_URL     — S3 site URL (from `remotion lambda sites create`)
 */
export async function renderOnLambda(
  options: LambdaRenderOptions
): Promise<LambdaRenderResult> {
  const functionName = process.env.REMOTION_FUNCTION_NAME;
  const serveUrl     = process.env.REMOTION_SERVE_URL;
  const region       = (process.env.AWS_REGION || "ap-south-1") as AwsRegion;

  if (!functionName || !serveUrl) {
    throw new Error(
      "[Lambda] REMOTION_FUNCTION_NAME and REMOTION_SERVE_URL must be set in .env.local. " +
      "Run: npx remotion lambda functions deploy && npx remotion lambda sites create"
    );
  }

  console.log(`[Lambda] 🚀 Starting cloud render: ${options.compositionId}`);

  const { renderId, bucketName } = await renderMediaOnLambda({
    region,
    functionName,
    serveUrl,
    composition:           options.compositionId,
    inputProps:            options.inputProps,
    codec:                 options.codec ?? "h264",
    framesPerLambda:       30,        // each Lambda chunk = 1 second at 30fps
    concurrencyPerLambda:  1,
    timeoutInMilliseconds: 270_000,   // 4.5 min max per chunk
    maxRetries:            3,
    outName:               `${options.compositionId}-${Date.now()}.mp4`,
  });

  console.log(`[Lambda] ⏳ Render started — renderId: ${renderId}, bucket: ${bucketName}`);

  // Poll for completion (with 5-min timeout)
  const POLL_INTERVAL_MS = 3000;
  const MAX_WAIT_MS      = 300_000; // 5 min
  const startTime        = Date.now();

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const progress = await getRenderProgress({
      renderId,
      bucketName,
      functionName,
      region,
    });

    if (progress.fatalErrorEncountered) {
      throw new Error(`[Lambda] ❌ Render failed: ${progress.errors?.[0]?.message ?? "unknown error"}`);
    }

    if (progress.done && progress.outputFile) {
      const outputUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${progress.outputFile}`;
      console.log(`[Lambda] ✅ Render complete → ${outputUrl}`);
      return {
        renderId,
        bucketName,
        outputFile: progress.outputFile,
        outputUrl,
      };
    }

    const pct = Math.round((progress.overallProgress ?? 0) * 100);
    console.log(`[Lambda] 📊 Progress: ${pct}% — chunks: ${progress.renderMetadata?.totalChunks}`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`[Lambda] ⏰ Render timed out after ${MAX_WAIT_MS / 1000}s`);
}

/**
 * Returns whether Lambda rendering is enabled for this environment.
 */
export function isLambdaModeEnabled(): boolean {
  return (
    process.env.RENDER_MODE === "lambda" &&
    !!process.env.REMOTION_FUNCTION_NAME &&
    !!process.env.REMOTION_SERVE_URL
  );
}
