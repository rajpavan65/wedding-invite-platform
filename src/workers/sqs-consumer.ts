import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { renderQueue } from "../lib/sqs";
import { executeRender } from "../app/api/render/route";
import { db } from "../lib/db";

async function runWorker() {
  console.log("🚀 SQS Render Worker started. Polling for jobs...");
  
  while (true) {
    try {
      const result = await renderQueue.poll();
      
      if (!result) {
        // No messages right now, wait a bit before polling again
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      const { message, job } = result;
      console.log(`\n📦 Picked up job for order: ${job.orderId}`);

      const order = await db.orders.findUnique(job.orderId);
      if (!order) {
        console.error(`❌ Order ${job.orderId} not found in DB. Deleting message.`);
        await renderQueue.ack(message.ReceiptHandle!);
        continue;
      }

      console.log(`[Worker] Executing render for ${job.orderId} (Template: ${job.compositionId})...`);
      
      // Execute the render (pass fromWorker = true to prevent re-enqueueing)
      await executeRender(job.orderId, order, true);

      // Acknowledge (delete) the message from the queue after successful render
      // Note: executeRender handles updating the DB with videoUrl and status.
      // If executeRender fails internally, it catches the error and marks the DB as PENDING/FAILED.
      // We will acknowledge the message regardless because executeRender handles the retry state in the DB,
      // OR we can choose to NOT ack it if it failed, letting SQS retry it.
      // For now, executeRender catches errors, so it technically succeeds from the worker's perspective.
      await renderQueue.ack(message.ReceiptHandle!);
      console.log(`✅ Job ${job.orderId} fully processed and acknowledged.`);
      
    } catch (error) {
      console.error("❌ Worker polling error:", error);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Start the worker
runWorker().catch(console.error);
