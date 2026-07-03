// src/lib/avatar/providers/index.ts
//
// Env-based avatar provider resolver (task 3.3, Req 1.1, 1.7).
//
// Pure, side-effect-free selection of the concrete AvatarProvider based on
// which credentials are present in the environment:
//
//   FAL_API_KEY present            -> FalInstantIdProvider
//   else REPLICATE_API_TOKEN present -> ReplicatePhotoMakerProvider
//   else (no credentials)          -> MockAvatarProvider (mock mode, Req 1.7)
//
// Selection reads only `process.env` and constructs a provider; it performs NO
// network / external calls. The concrete providers own their own runtime calls
// and throw typed errors on failure — the resolver never silently falls back to
// mock once real credentials exist.

import type { AvatarProvider } from "../types";
import { FalInstantIdProvider } from "./fal";
import { MockAvatarProvider } from "./mock";
import { ReplicatePhotoMakerProvider } from "./replicate";

export { FalInstantIdProvider } from "./fal";
export { MockAvatarProvider } from "./mock";
export { ReplicatePhotoMakerProvider } from "./replicate";

/**
 * Treat an environment variable as "present" only when it is set to a
 * non-empty, non-whitespace value. Mirrors `requireApiKey` in ./shared so the
 * resolver and the providers agree on what counts as a configured credential.
 */
function hasEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * True when neither provider credential is configured, so the system runs in
 * the clearly-labelled mock mode (Req 1.7).
 *
 * `generateAvatars` uses this to populate `AvatarResult.mock`. It is evaluated
 * against the live environment on every call so toggling credentials does not
 * require a restart of any cached state.
 */
export function isMockMode(): boolean {
  return !hasEnv("FAL_API_KEY") && !hasEnv("REPLICATE_API_TOKEN");
}

/**
 * Select the concrete avatar provider from the environment (Req 1.1, 1.7).
 *
 * Order of preference: fal.ai InstantID, then Replicate PhotoMaker, then the
 * no-credentials mock fallback. Performs no external calls.
 */
export function resolveAvatarProvider(): AvatarProvider {
  if (hasEnv("FAL_API_KEY")) {
    return new FalInstantIdProvider();
  }
  if (hasEnv("REPLICATE_API_TOKEN")) {
    return new ReplicatePhotoMakerProvider();
  }
  return new MockAvatarProvider();
}
