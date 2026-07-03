// src/app/api/avatar-qa/route.ts
//
// Avatar QA review endpoint — wires the admin review UI's approve/reject/downgrade
// actions to the server-side Avatar QA Service (Req 2.6, 2.7, 2.8;
// Design §Components/2).
//
// Route Handler conventions follow the installed Next.js version
// (node_modules/next/dist/docs/01-app/.../15-route-handlers.md): exported async
// HTTP-method functions using NextRequest/NextResponse. POST is never cached.

import { NextRequest, NextResponse } from "next/server";
import { avatarQa } from "@/lib/avatar/qa";
import { db } from "@/lib/db";

type ReviewAction = "approve" | "reject" | "downgrade";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const orderId: string | undefined = body?.orderId;
  const action: ReviewAction | undefined = body?.action;

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }
  if (action !== "approve" && action !== "reject" && action !== "downgrade") {
    return NextResponse.json(
      { error: "action must be 'approve', 'reject', or 'downgrade'" },
      { status: 400 },
    );
  }

  try {
    // Downgrade bypasses the QA state machine — transitions the order tier to
    // standard and moves status to AVATAR_READY so it can proceed to rendering.
    if (action === "downgrade") {
      const order = await db.orders.findUnique(orderId);
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      await db.orders.update(orderId, {
        status: "AVATAR_READY",
        tier: "standard",
      } as Partial<typeof order>);
      return NextResponse.json({
        orderId,
        state: "Downgraded",
        attempts: order.avatarQa?.attempts ?? 0,
        downgradeReason: body?.reason ?? "Admin manually downgraded to Standard tier",
      });
    }

    const record =
      action === "approve"
        ? await avatarQa.approve(orderId)
        : await avatarQa.reject(orderId, { reason: body?.reason });

    return NextResponse.json({
      orderId: record.orderId,
      state: record.state,
      attempts: record.attempts,
      downgradeReason: record.downgradeReason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Avatar QA review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
