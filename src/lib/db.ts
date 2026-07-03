/**
 * src/lib/db.ts
 *
 * Database client — migrated from local JSON files to Supabase (Sprint 2).
 * Maintains the same interface as before so all callers (API routes, admin)
 * continue to work with zero changes.
 *
 * Uses supabaseAdmin (service_role key) which bypasses RLS for server-side ops.
 */

import { OrderData } from "./types";
import { supabaseAdmin } from "./supabase";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generates a unique order ID (e.g. WI-12345678-ABCDE) */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `WI-${timestamp}-${random}`.toUpperCase();
}

/** Maps a Supabase row to our internal OrderData shape */
function rowToOrder(row: Record<string, unknown>): OrderData {
  const details = (row.details as OrderData["details"]) ?? {};
  return {
    id:            row.id as string,
    createdAt:     row.created_at as string,
    customerPhone: (row.customer_phone as string) ?? "",
    customerEmail: (row.customer_email as string) ?? undefined,
    details: {
      groomName:       (details.groomName ?? "") as string,
      brideName:       (details.brideName ?? "") as string,
      weddingDate:     (details.weddingDate ?? "") as string,
      venue:           (details.venue ?? "") as string,
      groomCity:       (details.groomCity ?? "") as string,
      brideCity:       (details.brideCity ?? "") as string,
      groomProfession: (details.groomProfession ?? "") as string,
      brideProfession: (details.brideProfession ?? "") as string,
      otpCode:         (details.otpCode ?? undefined) as string | undefined,
      otpExpires:      (details.otpExpires ?? undefined) as number | undefined,
      revisionCount:   (details.revisionCount ?? 0) as number,
    },
    style:       (row.style as OrderData["style"]) ?? "royal",
    tier:        (row.tier as OrderData["tier"]) ?? "standard",
    scenes:      (row.scenes as OrderData["scenes"]) ?? [],
    musicTrack:  (row.music_track as string) ?? "romantic-piano",
    photos:      (row.photos as string[]) ?? [],
    status:      (row.status as OrderData["status"]) ?? "PENDING",
    videoUrl:    (row.video_url as string) ?? undefined,
    thumbnailUrl:(row.thumbnail_url as string) ?? undefined,
    notes:       (row.notes as string) ?? undefined,
    avatarQa:    (row.avatar_qa as OrderData["avatarQa"]) ?? undefined,
  };
}

/** Maps our internal OrderData shape to a Supabase row */
function orderToRow(order: Partial<OrderData> & { id?: string }): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (order.id !== undefined)            row.id             = order.id;
  if (order.customerPhone !== undefined) row.customer_phone = order.customerPhone;
  if (order.customerEmail !== undefined) row.customer_email = order.customerEmail;
  if (order.details !== undefined)       row.details        = order.details;
  if (order.style !== undefined)         row.style          = order.style;
  if (order.tier !== undefined)          row.tier           = order.tier;
  if (order.scenes !== undefined)        row.scenes         = order.scenes;
  if (order.musicTrack !== undefined)    row.music_track    = order.musicTrack;
  if (order.photos !== undefined)        row.photos         = order.photos;
  if (order.status !== undefined)        row.status         = order.status;
  if (order.videoUrl !== undefined)      row.video_url      = order.videoUrl;
  if (order.thumbnailUrl !== undefined)  row.thumbnail_url  = order.thumbnailUrl;
  if (order.notes !== undefined)         row.notes          = order.notes;
  if (order.avatarQa !== undefined)      row.avatar_qa      = order.avatarQa;
  return row;
}

// ─── Database Client ─────────────────────────────────────────────────────────

export const db = {
  orders: {
    async findMany(): Promise<OrderData[]> {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[DB] findMany error:", error.message);
        return [];
      }
      return (data ?? []).map(rowToOrder);
    },

    async findUnique(id: string): Promise<OrderData | null> {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code !== "PGRST116") { // "no rows" — not a real error
          console.error("[DB] findUnique error:", error.message);
        }
        return null;
      }
      return rowToOrder(data);
    },

    async create(order: OrderData): Promise<OrderData> {
      const { data, error } = await supabaseAdmin
        .from("orders")
        .insert(orderToRow(order))
        .select()
        .single();

      if (error) {
        console.error("[DB] create error:", error.message);
        throw new Error(`Failed to create order: ${error.message}`);
      }
      return rowToOrder(data);
    },

    async update(id: string, updates: Partial<OrderData>): Promise<OrderData | null> {
      const row = orderToRow(updates);

      const { data, error } = await supabaseAdmin
        .from("orders")
        .update(row)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("[DB] update error:", error.message);
        return null;
      }
      return rowToOrder(data);
    },

    async delete(id: string): Promise<boolean> {
      const { error } = await supabaseAdmin
        .from("orders")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("[DB] delete error:", error.message);
        return false;
      }
      return true;
    },
  },
};
