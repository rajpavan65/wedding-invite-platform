// src/app/api/templates/system/[id]/route.ts
//
// GET   /api/templates/system/[id] — effective config for one built-in template
// PATCH /api/templates/system/[id] — upsert a catalog-level override
//
// PATCH accepts: { enabled?, name?, tagline?, description?, emoji?,
//                  palette?: Partial<{primary,secondary,accent,background}>,
//                  thumbnailFrame? }
//
// Returns 503 (needsMigration) when the template_overrides table is absent so
// the admin UI can prompt to run the migration.

import { NextRequest, NextResponse } from "next/server";
import {
  applyOverrideToConfig,
  type TemplateOverride,
} from "@/lib/template-overrides";
import {
  getTemplateOverride,
  upsertTemplateOverride,
} from "@/lib/template-overrides.db";
import { TEMPLATE_CONFIGS, type TemplateId } from "@/lib/types";

function isSystemId(id: string): id is TemplateId {
  return id in TEMPLATE_CONFIGS;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSystemId(id)) {
    return NextResponse.json({ error: `"${id}" is not a system template` }, { status: 404 });
  }
  const override = await getTemplateOverride(id);
  return NextResponse.json(applyOverrideToConfig(TEMPLATE_CONFIGS[id], override));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSystemId(id)) {
    return NextResponse.json({ error: `"${id}" is not a system template` }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // Whitelist + light validation.
  const patch: TemplateOverride = {};
  if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
  if (typeof body.name === "string") patch.name = body.name.slice(0, 80);
  if (typeof body.tagline === "string") patch.tagline = body.tagline.slice(0, 120);
  if (typeof body.description === "string") patch.description = body.description.slice(0, 400);
  if (typeof body.emoji === "string") patch.emoji = body.emoji.slice(0, 8);
  if (
    typeof body.thumbnailFrame === "number" &&
    Number.isFinite(body.thumbnailFrame) &&
    body.thumbnailFrame >= 0
  ) {
    patch.thumbnailFrame = Math.floor(body.thumbnailFrame);
  }
  if (body.palette && typeof body.palette === "object") {
    const p: Partial<{ primary: string; secondary: string; accent: string; background: string }> = {};
    for (const k of ["primary", "secondary", "accent", "background"] as const) {
      if (typeof body.palette[k] === "string") p[k] = body.palette[k];
    }
    if (Object.keys(p).length > 0) patch.palette = p;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const result = await upsertTemplateOverride(id, patch);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, needsMigration: result.needsMigration ?? false },
      { status: result.needsMigration ? 503 : 500 },
    );
  }

  // Return the merged effective config so the client can update immediately.
  return NextResponse.json(applyOverrideToConfig(TEMPLATE_CONFIGS[id], result.override));
}
