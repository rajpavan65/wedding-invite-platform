import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { DynamicTemplate } from "@/lib/types";

// ── helpers ────────────────────────────────────────────────────────────────────

function rowToTemplate(row: Record<string, unknown>): DynamicTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    status: row.status as DynamicTemplate["status"],
    ceremony: row.ceremony as DynamicTemplate["ceremony"],
    emoji: row.emoji as string,
    palette: row.palette as DynamicTemplate["palette"],
    scenes: (row.scenes as DynamicTemplate["scenes"]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── GET /api/templates — list all custom templates ─────────────────────────────

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("custom_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[templates] list error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(rowToTemplate));
}

// ── POST /api/templates — create a new template ────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Basic validation
  if (!body.name || !body.ceremony) {
    return NextResponse.json(
      { error: "name and ceremony are required" },
      { status: 400 }
    );
  }

  // Build a URL-safe ID from the name if not provided
  const id =
    body.id ||
    body.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const { data, error } = await supabaseAdmin
    .from("custom_templates")
    .insert({
      id,
      name: body.name,
      status: "draft",
      ceremony: body.ceremony,
      emoji: body.emoji ?? "🎬",
      palette: body.palette ?? {
        primary: "#D4AF37",
        secondary: "#0A0500",
        accent: "#F0D060",
        background: "#0A0500",
      },
      scenes: body.scenes ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("[templates] create error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(rowToTemplate(data), { status: 201 });
}
