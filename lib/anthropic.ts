import Anthropic from "@anthropic-ai/sdk";

/**
 * Server-only Anthropic client. Reads ANTHROPIC_API_KEY from the environment (never import
 * this into a client component). Used by the admin AI-draft route to draft the visa
 * assessment prose (จุดแข็ง / ที่เราจะช่วยเสริม / ความเห็น) from the rule engine's PII-free
 * output — see app/api/admin/draft-assessment/route.ts.
 */
export const anthropic = new Anthropic();

/**
 * Model used for the assessment draft. Sonnet 5 by default (cheaper than Opus, strong Thai);
 * override with AI_DRAFT_MODEL to swap tiers without a code change.
 */
export const AI_DRAFT_MODEL = process.env.AI_DRAFT_MODEL ?? "claude-sonnet-5";
