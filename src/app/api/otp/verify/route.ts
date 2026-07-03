import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { orderId, code } = await req.json();

    if (!orderId || !code) {
      return NextResponse.json({ error: "Missing orderId or code" }, { status: 400 });
    }

    const order = await db.orders.findUnique(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const { otpCode, otpExpires } = order.details;

    if (!otpCode || !otpExpires) {
      return NextResponse.json(
        { error: "No OTP request found for this order. Please request a new one." },
        { status: 400 }
      );
    }

    if (Date.now() > otpExpires) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (otpCode !== code) {
      return NextResponse.json({ error: "Invalid OTP code." }, { status: 400 });
    }

    // OTP is valid. Clear it so it can't be reused.
    await db.orders.update(orderId, {
      details: {
        ...order.details,
        otpCode: undefined,
        otpExpires: undefined,
      },
    });

    // Set a secure HTTP-only cookie to keep the user logged into the portal
    const cookieStore = await cookies();
    cookieStore.set(`invite_session_${orderId}`, "verified", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[OTP Verify Error]:", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
