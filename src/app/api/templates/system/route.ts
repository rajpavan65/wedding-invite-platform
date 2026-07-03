// src/app/api/templates/system/route.ts
//
// GET /api/templates/system
//
// Returns the effective catalog configs for every built-in (system) template —
// static TEMPLATE_CONFIGS merged with any stored admin overrides (enable/disable,
// display fields, gallery palette). Consumed by the storefront gallery, the
// create form, and the admin Template Manager.
//
// Degrades gracefully: if the template_overrides table is absent, every config
// is returned with its code defaults and enabled=true.

import { NextResponse } from "next/server";
import { getEffectiveSystemConfigs } from "@/lib/template-overrides.db";

export async function GET() {
  const configs = await getEffectiveSystemConfigs();
  // Return as an array in display order for easy client consumption.
  const list = Object.values(configs);
  return NextResponse.json(list);
}
