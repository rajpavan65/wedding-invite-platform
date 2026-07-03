import { IAMClient, CreateRoleCommand, AttachRolePolicyCommand } from "@aws-sdk/client-iam";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const iamClient = new IAMClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function main() {
  console.log("Creating remotion-lambda-role...");
  try {
    const assumeRolePolicy = JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "lambda.amazonaws.com" },
          Action: "sts:AssumeRole",
        },
      ],
    });

    const createRes = await iamClient.send(
      new CreateRoleCommand({
        RoleName: "remotion-lambda-role",
        AssumeRolePolicyDocument: assumeRolePolicy,
      })
    );
    console.log("✅ Role created successfully:", createRes.Role?.Arn);

    console.log("Attaching AWSLambdaBasicExecutionRole...");
    await iamClient.send(
      new AttachRolePolicyCommand({
        RoleName: "remotion-lambda-role",
        PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      })
    );
    console.log("✅ Basic execution policy attached.");

    console.log("Attaching AmazonS3FullAccess (Required for Remotion Lambda to read/write assets)...");
    await iamClient.send(
      new AttachRolePolicyCommand({
        RoleName: "remotion-lambda-role",
        PolicyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
      })
    );
    console.log("✅ S3 policy attached.");

    console.log("Attaching AmazonSQSFullAccess (Required for Remotion to report progress)...");
    await iamClient.send(
      new AttachRolePolicyCommand({
        RoleName: "remotion-lambda-role",
        PolicyArn: "arn:aws:iam::aws:policy/AmazonSQSFullAccess",
      })
    );
    console.log("✅ SQS policy attached.");

    console.log("🎉 IAM Setup Complete! Wait 10 seconds for AWS propagation before deploying.");
  } catch (error: any) {
    if (error.name === "EntityAlreadyExistsException" || error.Code === "EntityAlreadyExists") {
      console.log("✅ Role already exists!");
    } else {
      console.error("❌ Error creating role:", error);
    }
  }
}

main();
