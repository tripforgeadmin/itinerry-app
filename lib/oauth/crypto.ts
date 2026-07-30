import crypto from "node:crypto";

/**
 * Crypto primitives for the OAuth AS: scrypt passcode hashing (no native deps —
 * argon2 would add one for a 5-person team), SHA-256 for stored code/token hashes,
 * and PKCE S256 verification. All comparisons are timing-safe.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 };

export function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(passcode, salt, SCRYPT.keylen, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPasscode(passcode: string, stored: string): boolean {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(hashB64, "base64");
    const actual = crypto.scryptSync(passcode, Buffer.from(saltB64, "base64"), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

/** PKCE S256: challenge == BASE64URL(SHA256(verifier)). */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!verifier || !challenge) return false;
  const computed = crypto.createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}
