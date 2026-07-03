import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { cloudStorage } from "@/lib/cloud-storage";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const orderId = formData.get("orderId") as string;
    const files = formData.getAll("photos") as File[];

    if (!orderId || files.length === 0) {
      return NextResponse.json(
        { error: "orderId and photos are required" },
        { status: 400 }
      );
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", orderId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadPromises = files.map(async (file, i) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `photo_${i + 1}.${ext}`;
      
      // Use the cloud storage stub
      return await cloudStorage.uploadFile("photos", orderId, filename, buffer);
    });

    const urls = await Promise.all(uploadPromises);

    return NextResponse.json({ urls, count: urls.length });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
