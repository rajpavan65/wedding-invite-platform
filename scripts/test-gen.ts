import { generateAvatars } from "../src/lib/ai-generator";
import { resolveAvatarProvider } from "../src/lib/avatar/providers";

(async () => {
  try {
    const provider = resolveAvatarProvider();
    console.log("Resolved provider:", provider.name);

    console.log("Starting avatar generation...");
    const result = await generateAvatars({
      clientId: "TEST-CLIENT",
      referencePhotos: ["https://upload.wikimedia.org/wikipedia/commons/a/a0/Bill_Gates_2018.jpg"],
      poses: ["wedding"],
      variantsPerPose: 1
    });
    console.log("Generation successful:", result);
  } catch (err) {
    console.error("Generation failed:", err);
  }
})();
