/**
 * Remotion Entry Point
 *
 * This file is the entry point for:
 *  - `npx remotion studio` (Remotion Studio preview)
 *  - `@remotion/bundler bundle()` (server-side rendering)
 *
 * It MUST call registerRoot() with the root component.
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
