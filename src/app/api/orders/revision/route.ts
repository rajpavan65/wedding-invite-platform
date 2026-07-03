import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { orderId, details } = await req.json();

    if (!orderId || !details) {
      return NextResponse.json({ error: "Missing orderId or details" }, { status: 400 });
    }

    const order = await db.orders.findUnique(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow revision if order is COMPLETE or DELIVERED
    if (order.status !== "COMPLETE" && order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Revisions can only be requested on completed orders." },
        { status: 400 }
      );
    }

    // Check revision count (1 free revision limit)
    const currentRevisions = order.details.revisionCount || 0;
    if (currentRevisions >= 1) {
      return NextResponse.json(
        { error: "You have already used your 1 free revision." },
        { status: 400 }
      );
    }

    // Update details and increment revisionCount
    const newDetails = {
      ...order.details,
      groomName: details.groomName || order.details.groomName,
      brideName: details.brideName || order.details.brideName,
      weddingDate: details.weddingDate || order.details.weddingDate,
      venue: details.venue || order.details.venue,
      revisionCount: currentRevisions + 1,
    };

    // Set order status back to RENDERING to immediately queue it
    // Note: The UI can also hit /api/render, but for simplicity we just update status and let the client hit the render endpoint.
    await db.orders.update(orderId, {
      details: newDetails,
      status: "RENDERING", 
      videoUrl: undefined, // Clear old video
    });

    // Automatically trigger render process in the background
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    }).catch((e) => console.error("Failed to trigger render:", e));

    return NextResponse.json({ success: true, message: "Revision accepted." });
  } catch (error) {
    console.error("[Revision Error]:", error);
    return NextResponse.json({ error: "Failed to process revision." }, { status: 500 });
  }
}
