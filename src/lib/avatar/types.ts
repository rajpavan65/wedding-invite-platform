// src/lib/avatar/types.ts
export type CeremonyPose = "haldi" | "mehandi" | "sangeet" | "wedding" | "reception";

export interface AvatarRequest {
  clientId: string;
  referencePhotos: string[];   // 1..3 resolvable URLs
  poses: CeremonyPose[];       // which ceremony poses to generate
  variantsPerPose?: number;    // default 3 (Req 1.11)
}

export interface AvatarVariant {
  index: number;
  imageData: Buffer;           // 1024x1024 transparent PNG
  identityScore: number;       // cross-pose match vs reference pose (0..1)
}

export interface AvatarAsset {
  pose: CeremonyPose;
  url: string;                 // CloudFront URL once stored
  identityScore: number;
}

export interface AvatarResult {
  clientId: string;
  assets: AvatarAsset[];
  mock: boolean;               // true when running without provider creds
}

// The pluggable provider seam
export interface AvatarProvider {
  readonly name: string;
  /** Generate `variants` candidate images for a single pose. */
  generatePose(input: {
    referencePhotos: string[];
    pose: CeremonyPose;
    variants: number;
    timeoutMs: number;         // 120_000 (Req 1.10)
  }): Promise<AvatarVariant[]>;
}
