import { generateText, Output, gateway } from "ai";
import { z } from "zod";
import type { SpeciesCopy } from "./copy-plan";
import type { GuideSpeciesSeed } from "./seed-plan";

const speciesCopySchema = z.object({
  descriptionEn: z.string(),
  descriptionJa: z.string(),
  descriptionZhTw: z.string(),
  spottingTipsEn: z.string(),
  spottingTipsJa: z.string(),
  spottingTipsZhTw: z.string(),
});

export type GenerateCopyInput = Pick<
  GuideSpeciesSeed,
  "sciName" | "comNameEn" | "comNameJa" | "comNameZhTw"
>;

/** Call xAI Grok via Vercel AI Gateway for trilingual copy. */
export async function generateSpeciesCopy(
  input: GenerateCopyInput,
): Promise<SpeciesCopy> {
  const { output } = await generateText({
    model: gateway("xai/grok-4.1-fast-non-reasoning"),
    output: Output.object({ schema: speciesCopySchema }),
    prompt: `You write warm, approachable field-guide copy for wild birds seen at Ueno Park and Shinobazu Pond in Tokyo, written for everyday park visitors as well as birders.

Species:
- Scientific: ${input.sciName}
- English: ${input.comNameEn}
- Japanese: ${input.comNameJa}
- Traditional Chinese (Taiwan): ${input.comNameZhTw}

Return:
- descriptionEn / descriptionJa / descriptionZhTw: 2–3 natural, vivid sentences each describing what makes this bird easy to recognize and what it does in Ueno Park / Shinobazu Pond. Use plain, everyday words (avoid dense ornithological jargon like "supercilium" or "undertail coverts"). Vary sentence openings and avoid textbook templates.
- spottingTipsEn / spottingTipsJa / spottingTipsZhTw: 1–3 practical, friendly sentences on where and when to look around Ueno Park and Shinobazu Pond (lotus pond, boat pond, shoreline paths, tree canopies, seasons, calls, or behavior). Remember Shinobazu Pond is a landlocked freshwater pond (no tides, no fishing). No GPS coordinates.

Language rules:
- Write each field purely in its target language with zero mixed-language words or foreign scripts.
- Japanese: consistent polite です・ます tone (never imperative 探せ/観察せよ). Always call the park 上野公園 and the pond 不忍池.
- Traditional Chinese (Taiwan): natural Taiwanese Mandarin (use 牠/牠們 for birds, Traditional characters only, Taiwan common bird names). Always call the park 上野公園 and the pond 不忍池.
- Double-check plumage and seasonal details so they are ornithologically accurate.`,
  });

  if (!output) {
    throw new Error(`No structured copy for ${input.sciName}`);
  }
  return output;
}
