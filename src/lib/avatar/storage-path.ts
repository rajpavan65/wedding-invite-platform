// src/lib/avatar/storage-path.ts
//
// Avatar storage path builder (Req 1.8; Design §Avatar Storage Path).
//
// Avatar assets live at the logical key `avatars/{clientId}/{ceremonyType}.png`
// inside the `"avatars"` cloud-storage bucket. The key builder below is pure and
// deterministic so it can be property-tested without touching S3/CloudFront, and
// `avatarUrl` reuses the exact CloudFront URL form produced by `cloudStorage`.

import { cloudStorage } from "../cloud-storage";
import type { CeremonyPose } from "./types";

/** Logical storage bucket avatars are stored under. */
export const AVATAR_BUCKET = "avatars" as const;

/** File extension every avatar asset is stored with (1024×1024 transparent PNG). */
export const AVATAR_EXTENSION = "png" as const;

/**
 * Build the deterministic object key for an avatar asset.
 *
 * Returns exactly `avatars/{clientId}/{ceremonyType}.png` (Req 1.8).
 *
 * Pure: depends only on its inputs and never touches the network or env.
 */
export function avatarKey(clientId: string, ceremonyType: CeremonyPose): string {
  return `${AVATAR_BUCKET}/${clientId}/${ceremonyType}.${AVATAR_EXTENSION}`;
}

/**
 * Resolve the avatar object key to a resolvable CloudFront URL.
 *
 * Reuses `cloudStorage.getUrl` so the URL form stays in lockstep with the
 * upload path, guaranteeing the returned URL maps back to `avatarKey(...)`.
 */
export function avatarUrl(clientId: string, ceremonyType: CeremonyPose): string {
  return cloudStorage.getUrl(
    AVATAR_BUCKET,
    clientId,
    `${ceremonyType}.${AVATAR_EXTENSION}`
  );
}
