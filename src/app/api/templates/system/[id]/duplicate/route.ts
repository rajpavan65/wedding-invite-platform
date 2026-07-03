// src/app/api/templates/system/[id]/duplicate/route.ts
//
// POST /api/templates/system/[id]/duplicate
//
// Clones a built-in (system) template into an editable custom template
// (Supabase `custom_templates`) seeded from its config + validated metadata,
// then returns the new DynamicTemplate so the admin can open it in the editor.
//
// Uses only the existing custom_templates table — no migration required.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isValidTemplateId } from "@/lib/template-metadata";
import {
  buildCustomTemplateSeed,
  customCloneId,
} from "@/lib/system-template-duplicate";
import type { TemplateId } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // "universal-template" is valid for rendering but is not a system template
  // with static metadata to clone from.
  if (id === "universal-template" || !isValidTemplateId(id)) {
    return NextResponse.json(
      { error: `"${id}" is not a duplicable system template` },
      { status: 400 },
    );
  }

  // Optional custom name from the request body.
  const body = await request.json().catch(() => ({}));
  const name: string | undefined = typeof body?.name === "string" ? body.name : undefined;

  // Unique-ish id: <system>-custom-<base36 timestamp>.
  const cloneId = customCloneId(id, Date.now().toString(36));

  let seed;
  try {
    seed = buildCustomTemplateSeed(id as TemplateId, cloneId, name);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("custom_templates")
    .insert({
      id: seed.id,
      name: seed.name,
      status: seed.status,
      ceremony: seed.ceremony,
      emoji: seed.emoji,
      palette: seed.palette,
      scenes: seed.scenes,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("[templates/duplicate] insert error:", error?.message);
    return NextResponse.json(
      { error: error?.message ?? "Failed to create custom template" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      status: data.status,
      ceremony: data.ceremony,
      emoji: data.emoji,
      palette: data.palette,
      scenes: data.scenes ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      clonedFrom: id,
    },
    { status: 201 },
  );
}
