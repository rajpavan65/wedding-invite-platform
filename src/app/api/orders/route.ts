import { NextRequest, NextResponse } from "next/server";
import { db, generateOrderId } from "@/lib/db";
import { OrderData } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const order = await db.orders.findUnique(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  }

  const orders = await db.orders.findMany();
  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const order: OrderData = {
    id: body.id || generateOrderId(),
    createdAt: new Date().toISOString(),
    customerPhone: body.customerPhone || "",
    customerEmail: body.customerEmail || "",
    details: body.details || {},
    style: body.style || "royal",
    tier: body.tier || "basic",
    scenes: body.scenes || ["intro", "proposal", "wedding"],
    musicTrack: body.musicTrack || "romantic-piano",
    photos: body.photos || [],
    status: "PENDING",
    notes: body.notes || "",
  };

  const saved = await db.orders.create(order);

  // Background task: trigger avatar generation for Premium orders
  if (saved.tier === "premium" && saved.photos.length > 0) {
    (async () => {
      try {
        console.log(`[API] Triggering background avatar generation for order ${saved.id}...`);
        
        // Dynamically import to avoid top-level dependencies blocking the route
        const { generateAvatars } = await import("@/lib/ai-generator");
        const { avatarQa } = await import("@/lib/avatar/qa");

        const result = await generateAvatars({
          clientId: saved.id,
          referencePhotos: saved.photos,
          poses: saved.scenes as import("@/lib/avatar/types").CeremonyPose[],
          variantsPerPose: 3,
        });

        // Push the generated assets into the QA review state
        await avatarQa.beginReview(saved.id, result.assets);
        console.log(`[API] Avatar generation & QA initialized for order ${saved.id}`);
      } catch (err) {
        console.error(`[API] Failed background avatar generation for order ${saved.id}:`, err);
      }
    })();
  }

  return NextResponse.json(saved, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const body = await request.json();

  const id = searchParams.get("id") || body.id;

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const { id: _id, ...updates } = body;
  const updated = await db.orders.update(id, updates);
  if (!updated) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const deleted = await db.orders.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

