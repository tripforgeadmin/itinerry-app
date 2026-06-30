import { supabase } from "./supabase";

export async function anonymizeAccount(accountId: string): Promise<boolean> {
  const { error } = await supabase
    .from("account")
    .update({
      full_name:         "[ลบแล้ว]",
      phone:             null,
      email:             null,
      line_user_id:      null,
      line_display_name: null,
      line_picture_url:  null,
      is_friend:         null,
      nationality_other: null,
      source_other:      null,
      updated_at:        new Date().toISOString(),
    })
    .eq("id", accountId);

  if (error) {
    console.error("anonymize error:", error);
    return false;
  }
  return true;
}
