import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(`invite_session_${orderId}`);

    if (sessionCookie && sessionCookie.value === "verified") {
      return NextResponse.json({ authorized: true });
    }

    return NextResponse.json({ authorized: false });
  } catch (error) {
    console.error("[OTP Session Error]:", error);
    return NextResponse.json({ error: "Failed to check session" }, { status: 500 });
  }
}
