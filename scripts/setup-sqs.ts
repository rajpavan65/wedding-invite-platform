import { SQSClient, CreateQueueCommand } from "@aws-sdk/client-sqs";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load existing env vars
dotenv.config({ path: ".env.local" });

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function main() {
  console.log("Setting up AWS SQS Queues for Digital Invites AI...");

  try {
    // 1. Create the Dead Letter Queue (DLQ) for failed renders
    console.log("Creating Dead Letter Queue (digital-invites-render-dlq)...");
    const dlqResponse = await sqsClient.send(
      new CreateQueueCommand({
        QueueName: "digital-invites-render-dlq",
        Attributes: {
          MessageRetentionPeriod: "1209600", // 14 days
        },
      })
    );
    const dlqUrl = dlqResponse.QueueUrl!;
    console.log(`✅ DLQ Created: ${dlqUrl}`);

    // Get the ARN of the DLQ
    // ARN format: arn:aws:sqs:REGION:ACCOUNT_ID:QUEUE_NAME
    const parts = dlqUrl.replace("https://sqs.", "").split(".amazonaws.com/");
    const region = parts[0];
    const pathParts = parts[1].split("/");
    const accountId = pathParts[0];
    const queueName = pathParts[1];
    const dlqArn = `arn:aws:sqs:${region}:${accountId}:${queueName}`;

    // 2. Create the main Render Queue
    console.log("Creating Main Render Queue (digital-invites-render-queue)...");
    const queueResponse = await sqsClient.send(
      new CreateQueueCommand({
        QueueName: "digital-invites-render-queue",
        Attributes: {
          VisibilityTimeout: "600", // 10 minutes (to allow Lambda to finish rendering without another worker picking it up)
          MessageRetentionPeriod: "345600", // 4 days
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: dlqArn,
            maxReceiveCount: "3", // After 3 failed attempts, move to DLQ
          }),
        },
      })
    );
    const queueUrl = queueResponse.QueueUrl!;
    console.log(`✅ Main Queue Created: ${queueUrl}`);

    // 3. Update .env.local
    const envPath = path.join(process.cwd(), ".env.local");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";

    // Replace or append SQS_RENDER_QUEUE_URL
    if (envContent.includes("SQS_RENDER_QUEUE_URL=")) {
      envContent = envContent.replace(
        /SQS_RENDER_QUEUE_URL=.*/g,
        `SQS_RENDER_QUEUE_URL=${queueUrl}`
      );
    } else {
      envContent += `\nSQS_RENDER_QUEUE_URL=${queueUrl}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ Updated .env.local with SQS_RENDER_QUEUE_URL`);
    console.log("\nSQS Setup Complete! Ready for background rendering.");

  } catch (error) {
    console.error("❌ Failed to create SQS queues:", error);
  }
}

main();
