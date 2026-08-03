import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/adminAuth";
import { isValidCommentCategory } from "@/lib/comment-categories";

const clean = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Append one structured case comment: Problem [category + note] + Solution [category + note].
 * The To-Be of the old free-text contact note — categories make pain points queryable
 * (broadcast condition `pain_point`). Either half may be empty, but not both. */
export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const assessmentId = clean(body.assessmentId, 64);
  if (!assessmentId) return NextResponse.json({ ok: false, error: "assessmentId required" }, { status: 400 });

  const problemCategory = clean(body.problemCategory, 120) || null;
  const solutionCategory = clean(body.solutionCategory, 120) || null;
  const problemNote = clean(body.problemNote) || null;
  const solutionNote = clean(body.solutionNote) || null;

  if (!problemCategory && !solutionCategory && !problemNote && !solutionNote) {
    return NextResponse.json({ ok: false, error: "empty comment" }, { status: 400 });
  }
  if (problemCategory && !(await isValidCommentCategory(problemCategory, "problem"))) {
    return NextResponse.json({ ok: false, error: "invalid problem category" }, { status: 400 });
  }
  if (solutionCategory && !(await isValidCommentCategory(solutionCategory, "solution"))) {
    return NextResponse.json({ ok: false, error: "invalid solution category" }, { status: 400 });
  }

  const { error } = await supabase.from("case_comment").insert({
    assessment_id: assessmentId,
    problem_category: problemCategory,
    problem_note: problemNote,
    solution_category: solutionCategory,
    solution_note: solutionNote,
    staff: clean(body.staff, 120) || null,
  });
  if (error) {
    console.error("case_comment insert error:", error);
    return NextResponse.json({ ok: false, error: "internal error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
