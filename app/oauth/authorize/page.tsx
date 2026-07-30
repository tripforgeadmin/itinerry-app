import { MCP_ENABLED, getClient, mcpResource } from "@/lib/oauth/clients";
import { notFound } from "next/navigation";
import AuthorizeForm from "./AuthorizeForm";

export const dynamic = "force-dynamic";

/**
 * OAuth 2.1 authorization page — claude.ai / Claude Code send each team member
 * here to log in with their own admin_member credential. OAuth rule: invalid
 * client_id / redirect_uri renders an error and NEVER redirects.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!MCP_ENABLED) notFound();
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");

  const clientId = get("client_id");
  const redirectUri = get("redirect_uri");
  const responseType = get("response_type");
  const codeChallenge = get("code_challenge");
  const challengeMethod = get("code_challenge_method");
  const resource = get("resource");
  const state = get("state");

  const client = getClient(clientId);
  const problems: string[] = [];
  if (!client) problems.push("client_id ไม่ถูกต้อง");
  if (client && !client.redirectUris(redirectUri)) problems.push("redirect_uri ไม่ได้ลงทะเบียน");
  if (responseType !== "code") problems.push("response_type ต้องเป็น code");
  if (!codeChallenge || challengeMethod !== "S256") problems.push("ต้องใช้ PKCE แบบ S256");
  if (resource && resource !== mcpResource()) problems.push("resource ไม่ตรงกับ MCP server นี้");

  if (problems.length > 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-red-600 mb-2">คำขอเชื่อมต่อไม่ถูกต้อง</h1>
          <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">เชื่อมต่อ Claude กับ itinerry</h1>
        <p className="mt-2 text-sm text-gray-500">
          เข้าสู่ระบบด้วยบัญชีสมาชิกทีมของคุณ — เมื่ออนุญาตแล้ว Claude จะ
          อ่านและแก้ไขข้อมูลเคส ใบเสนอราคา และส่งข้อความหาลูกค้า <b>ภายใต้ชื่อของคุณ</b>{" "}
          (ข้อมูลส่วนตัวลูกค้าจะถูกปิดบังบางส่วนเสมอ และทุกการกระทำถูกบันทึก)
        </p>
        <AuthorizeForm
          clientId={clientId}
          redirectUri={redirectUri}
          codeChallenge={codeChallenge}
          resource={resource || null}
          state={state}
        />
      </div>
    </main>
  );
}
