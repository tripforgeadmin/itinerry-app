import Anthropic from "@anthropic-ai/sdk";

/**
 * Whether the AI-draft feature is configured at all. The SDK does NOT throw on a missing key when
 * the client is built — it defers the failure to the first request, which surfaces as a generic
 * "try again" error that no amount of retrying can fix. Checking the env up front lets the route
 * answer with a real explanation and lets the admin UI hide the button entirely, so the feature is
 * simply absent until a key is set rather than present-and-permanently-broken.
 *
 * Safe to import from any server module — reading this does not construct a client.
 */
export const AI_DRAFT_ENABLED = Boolean(process.env.ANTHROPIC_API_KEY);

/**
 * Model used for the assessment draft. Sonnet 5 by default (cheaper than Opus, strong Thai);
 * override with AI_DRAFT_MODEL to swap tiers without a code change.
 */
export const AI_DRAFT_MODEL = process.env.AI_DRAFT_MODEL ?? "claude-sonnet-5";

let client: Anthropic | null = null;

/**
 * Server-only Anthropic client, constructed on first use (never import this into a client
 * component). Lazy so that merely reading AI_DRAFT_ENABLED — which the admin case page does on
 * every render, to decide whether to show the draft button — doesn't pay for building an SDK
 * client it will never call. Used by the admin AI-draft route to draft the visa assessment prose
 * (จุดแข็ง / ที่เราจะช่วยเสริม / ความเห็น) from the rule engine's PII-free output — see
 * app/api/admin/draft-assessment/route.ts.
 */
export function getAnthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}
