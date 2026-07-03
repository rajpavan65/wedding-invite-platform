/**
 * src/lib/sqs.ts
 *
 * AWS SQS client for the render job queue (Sprint 3 — US-3.2).
 *
 * Architecture:
 *   1. POST /api/render  →  enqueueRenderJob()  → SQS message
 *   2. SQS consumer     ←  pollRenderQueue()   ← picks up message
 *   3. Consumer triggers Remotion Lambda render
 *   4. On complete: updates Supabase order.status = "COMPLETE"
 *
 * Queue config:
 *   - Visibility timeout: 900s (15 min — max Lambda duration)
 *   - Message retention:  14 days
 *   - Dead Letter Queue:  3 failed attempts → DLQ
 */

import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  type Message,
} from "@aws-sdk/client-sqs";

// ─── SQS Client singleton ─────────────────────────────────────────────────────
const sqs = new SQSClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const QUEUE_URL = process.env.SQS_RENDER_QUEUE_URL || "";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RenderJobMessage {
  orderId: string;
  compositionId: string;
  timestamp: string;
  retryCount?: number;
}

// ─── Queue Operations ─────────────────────────────────────────────────────────
export const renderQueue = {
  /**
   * Enqueues a render job into SQS.
   * Called by POST /api/render immediately after order status → RENDERING.
   */
  async enqueue(job: RenderJobMessage): Promise<string | undefined> {
    if (!QUEUE_URL) {
      console.warn("[SQS] SQS_RENDER_QUEUE_URL not set — running in local mode");
      return undefined;
    }

    const { MessageId } = await sqs.send(
      new SendMessageCommand({
        QueueUrl:    QUEUE_URL,
        MessageBody: JSON.stringify(job),
      })
    );

    console.log(`[SQS] ✅ Enqueued render job ${job.orderId} → MessageId: ${MessageId}`);
    return MessageId;
  },

  /**
   * Polls for a single render job from SQS.
   * Used by the SQS consumer API route or a Lambda poller.
   */
  async poll(): Promise<{ message: Message; job: RenderJobMessage } | null> {
    if (!QUEUE_URL) return null;

    const { Messages } = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl:            QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds:     5,   // long-poll for up to 5s
        VisibilityTimeout:   900, // 15 min — give Lambda time to render
      })
    );

    if (!Messages || Messages.length === 0) return null;

    const message = Messages[0];
    const job = JSON.parse(message.Body || "{}") as RenderJobMessage;
    return { message, job };
  },

  /**
   * Deletes a message from SQS after successful processing.
   * MUST be called after every successful render to prevent re-processing.
   */
  async ack(receiptHandle: string): Promise<void> {
    if (!QUEUE_URL) return;

    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl:      QUEUE_URL,
        ReceiptHandle: receiptHandle,
      })
    );

    console.log("[SQS] ✅ Message acknowledged (deleted from queue)");
  },

  /**
   * Returns the current queue depth (number of messages waiting).
   * Shown in admin dashboard for operational visibility.
   */
  async depth(): Promise<number> {
    if (!QUEUE_URL) return 0;

    const { Attributes } = await sqs.send(
      new GetQueueAttributesCommand({
        QueueUrl:       QUEUE_URL,
        AttributeNames: ["ApproximateNumberOfMessages"],
      })
    );

    return parseInt(Attributes?.ApproximateNumberOfMessages ?? "0", 10);
  },
};
