import { NextRequest, NextResponse } from "next/server";
import { cloudStorage } from "@/lib/cloud-storage";

/**
 * POST /api/templates/upload
 *
 * Accepts a multipart/form-data body with a single file field named "file".
 * Uploads it to S3 under the "templates" folder and returns the CDN URL.
 *
 * Supported file types:
 *   - Background video:  .mp4, .webm
 *   - Background image:  .jpg, .jpeg, .png, .webp
 *   - Lottie animation:  .json
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string | null) ?? "backgrounds";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate allowed MIME types
    const allowed = [
      "video/mp4",
      "video/webm",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/json",
    ];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 400 }
      );
    }

    // Max 100 MB for video backgrounds
    const MAX_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 100 MB)" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload under "renders" bucket with a templates/ sub-folder so we can reuse
    // the existing cloudStorage.uploadFile API which expects bucket/folder/filename.
    // We use "renders" as the S3 logical bucket and "templates/{folder}" as the path.
    const url = await cloudStorage.uploadFile(
      "renders",
      `templates/${folder}`,
      file.name,
      buffer
    );

    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    console.error("[templates/upload] error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
