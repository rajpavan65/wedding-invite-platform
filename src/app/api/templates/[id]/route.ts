import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { DynamicTemplate } from "@/lib/types";

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

// ── GET /api/templates/[id] ────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("custom_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(rowToTemplate(data));
}

// ── PATCH /api/templates/[id] — update ────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Only allow known fields to be updated
  const allowed = ["name", "status", "ceremony", "emoji", "palette", "scenes"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("custom_templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("[templates] update error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Template not found" },
      { status: error ? 500 : 404 }
    );
  }

  return NextResponse.json(rowToTemplate(data));
}

// ── DELETE /api/templates/[id] ────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await supabaseAdmin
    .from("custom_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[templates] delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
