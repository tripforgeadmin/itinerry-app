import { useEffect, useState } from "react";

/**
 * Typewriter effect: types each word out char-by-char, holds, deletes, advances to the next.
 * Code-point safe via Array.from (won't split surrogate pairs). Pass a STABLE `words` array
 * (module const) so the effect doesn't re-run every render.
 */
export function useTypewriter(words: string[], typeMs = 55, deleteMs = 28, holdMs = 1500): string {
  const [idx, setIdx] = useState(0);
  const [sub, setSub] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const chars = Array.from(words[idx % words.length] ?? "");
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && sub < chars.length) {
      t = setTimeout(() => setSub(sub + 1), typeMs);
    } else if (!deleting && sub === chars.length) {
      t = setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && sub > 0) {
      t = setTimeout(() => setSub(sub - 1), deleteMs);
    } else {
      setDeleting(false);
      setIdx((i) => (i + 1) % Math.max(words.length, 1));
    }
    return () => clearTimeout(t);
  }, [sub, deleting, idx, words, typeMs, deleteMs, holdMs]);

  return Array.from(words[idx % words.length] ?? "").slice(0, sub).join("");
}
