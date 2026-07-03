import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailService } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await db.orders.findUnique(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.customerEmail) {
      return NextResponse.json(
        { error: "No email address registered for this order." },
        { status: 400 }
      );
    }

    // Generate a 6-digit numeric OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expires in 10 minutes
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // Save to database
    await db.orders.update(orderId, {
      details: {
        ...order.details,
        otpCode,
        otpExpires,
      },
    });

    // Send the email (mocked for now)
    await emailService.sendOTP(order.customerEmail, otpCode);

    return NextResponse.json({ success: true, email: order.customerEmail });
  } catch (error) {
    console.error("[OTP Send Error]:", error);
    return NextResponse.json({ error: "Failed to send OTP" }, { status: 500 });
  }
}
