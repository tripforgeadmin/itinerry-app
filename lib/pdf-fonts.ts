import { Font } from "@react-pdf/renderer";
import path from "path";

/**
 * Shared @react-pdf/renderer Thai setup — extracted from lib/worksheet-pdf.tsx so
 * every PDF (worksheet, quotation, …) registers Sarabun and the Thai shaping fixes
 * exactly once. Import this module for its side effects before building a Document.
 */

Font.register({
  family: "Sarabun",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Sarabun-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Sarabun-Bold.ttf"), fontWeight: 700 },
  ],
});

// Two Thai text fixes in one callback:
// 1. SARA AM (ำ) pre-decomposed to NIKHAHIT+SARA AA — fontkit decomposes it during shaping
//    anyway, but doing it up-front keeps char count == glyph count; otherwise react-pdf
//    truncates one glyph off the end of the text per ำ it contains (verified empirically).
// 2. Thai has no inter-word spaces, so long runs are split at dictionary word boundaries
//    (Intl.Segmenter keeps combining vowels/tone marks intact) to allow wrapping.
Font.registerHyphenationCallback((word) => {
  const w = word.replace(/ำ/g, "ํา");
  if (!/[฀-๿]/.test(w) || w.length < 12) return [w];
  return [...new Intl.Segmenter("th", { granularity: "word" }).segment(w)].map((s) => s.segment);
});

/** Sarabun has no emoji glyphs — strip pictographs (e.g. the 🛑 in config action strings). */
export function stripEmoji(t: string): string {
  return t.replace(/[\p{Extended_Pictographic}️]/gu, "").trim();
}
