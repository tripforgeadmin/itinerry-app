import crypto from "node:crypto";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { supabase } from "../supabase";
import { checkRateLimit } from "../rateLimit";
import { fetchCases } from "../cases";
import { fetchDashboardData } from "../dashboard-data";
import { fetchProducts, fetchPriceBooks, fetchEntriesForBook, fetchKitItems } from "../products";
import { fetchQuotes, fetchQuoteWithLines } from "../quotes";
import {
  addQuoteLine,
  createQuote,
  deleteQuoteLine,
  getQuoteByNumber,
  setQuoteStatus,
  updateQuoteHeader,
  updateQuoteLine,
} from "../quote-actions";
import { applyStatusChange } from "../case-status";
import { addContactLog, CONTACT_OUTCOMES } from "../contact-log-actions";
import { VALID_STATUSES } from "../status";
import { VALID_QUOTE_STATUSES } from "../quote-status";
import { maskEmail, maskFreeName, maskName, maskPhone, maskAddress } from "../pii-mask";
import { logMcpCall } from "./audit";
import { memberFromAuthInfo, type McpMember } from "./auth";

/**
 * MCP tool catalog. Rules of this file:
 *  - External keys only: ticket_id / quote_number / product code. Never UUIDs.
 *  - EVERY response is masked via lib/pii-mask.ts before serialization.
 *  - EVERY call is journaled to mcp_audit_log; writes stamp the member's name
 *    into the existing staff-label fields.
 *  - send_message / send_result are two-phase (preview → confirm_token → send).
 *  - No anonymize, no hard deletes — by design (see plan).
 */

type ToolExtra = { authInfo?: Parameters<typeof memberFromAuthInfo>[0] };

const text = (data: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(data, null, 1) }],
});
const errText = (message: string) => ({
  content: [{ type: "text" as const, text: JSON.stringify({ error: message }) }],
  isError: true,
});

async function resolveTicket(ticketId: string): Promise<{ id: string; account_id: string | null } | null> {
  const { data } = await supabase
    .from("user_assessment")
    .select("id, account_id")
    .eq("ticket_id", ticketId)
    .maybeSingle();
  return (data as { id: string; account_id: string | null } | null) ?? null;
}

/** Wrap a handler with per-member rate limiting + audit journaling. */
function guarded<A extends Record<string, unknown>>(
  tool: string,
  fn: (args: A, member: McpMember) => Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }>
) {
  return async (args: A, extra: ToolExtra) => {
    const member = memberFromAuthInfo(extra.authInfo);
    if (!member) return errText("unauthorized");
    if (!(await checkRateLimit(`mcp:${member.id}`, 120, 60 * 1000))) {
      await logMcpCall({ member, tool, args, outcome: "denied", detail: "rate limited" });
      return errText("rate limit exceeded — try again in a minute");
    }
    try {
      const result = await fn(args, member);
      await logMcpCall({
        member,
        tool,
        args,
        outcome: result.isError ? "error" : tool.startsWith("send_") && !(args as { confirm_token?: string }).confirm_token ? "preview" : "ok",
        detail: result.isError ? result.content[0]?.text?.slice(0, 300) : undefined,
      });
      return result;
    } catch (err) {
      await logMcpCall({ member, tool, args, outcome: "error", detail: String(err).slice(0, 300) });
      return errText("internal error");
    }
  };
}

// ---- two-phase confirm tokens for send tools (HMAC over payload+member, 10 min) ----

function confirmSecret(): string {
  const s = process.env.MCP_JWT_SECRET;
  if (!s) throw new Error("MCP_JWT_SECRET is not set");
  return s;
}

export function makeConfirmToken(memberId: string, action: string, payload: string): string {
  const window = Math.floor(Date.now() / (10 * 60 * 1000)); // 10-minute bucket
  return crypto.createHmac("sha256", confirmSecret()).update(`${memberId}|${action}|${payload}|${window}`).digest("base64url");
}

export function checkConfirmToken(token: string, memberId: string, action: string, payload: string): boolean {
  const window = Math.floor(Date.now() / (10 * 60 * 1000));
  for (const w of [window, window - 1]) {
    const expected = crypto.createHmac("sha256", confirmSecret()).update(`${memberId}|${action}|${payload}|${w}`).digest("base64url");
    const a = Buffer.from(expected);
    const b = Buffer.from(token);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

// ---------------------------------------------------------------- registration --

export function registerTools(server: McpServer) {
  // ---- READ ----

  server.registerTool(
    "search_cases",
    {
      title: "ค้นหาเคส",
      description:
        "ค้นหาเคสวีซ่า กรองด้วยสถานะ/ประเทศปลายทาง/ข้อความ คืนรายการแบบย่อ (PII ถูกปิดบังบางส่วน) คีย์คือ ticket_id",
      inputSchema: {
        status: z.enum(VALID_STATUSES as [string, ...string[]]).optional(),
        destination: z.string().length(2).optional().describe("ISO alpha-2 เช่น FR"),
        query: z.string().max(80).optional().describe("ค้นในชื่อเล่น/ticket id"),
        limit: z.number().int().min(1).max(50).default(20),
      },
      annotations: { readOnlyHint: true },
    },
    guarded("search_cases", async (args) => {
      const { rows } = await fetchCases();
      const q = (args.query as string | undefined)?.toLowerCase();
      const filtered = rows
        .filter((r) => !args.status || r.status === args.status)
        .filter((r) => !args.destination || r.trip?.destination?.toUpperCase() === (args.destination as string).toUpperCase())
        .filter(
          (r) =>
            !q ||
            r.ticket_id?.toLowerCase().includes(q) ||
            r.account?.nickname?.toLowerCase().includes(q) ||
            r.account?.first_name?.toLowerCase().includes(q)
        )
        .slice(0, args.limit as number);
      return text(
        filtered.map((r) => ({
          ticket_id: r.ticket_id,
          name: r.account ? maskName(r.account) : "—",
          status: r.status,
          destination: r.trip?.destination ?? null,
          visa_type: r.trip?.visa_type ?? null,
          created_at: r.created_at,
          follow_up_count: r.follow_up_count,
        }))
      );
    })
  );

  server.registerTool(
    "get_case",
    {
      title: "ดูรายละเอียดเคส",
      description: "ดูเคสหนึ่งรายการด้วย ticket_id — สถานะ ทริป ช่องทางติดต่อ (ปิดบังบางส่วน) ประวัติติดต่อ และใบเสนอราคาที่ผูก",
      inputSchema: { ticket_id: z.string().max(40) },
      annotations: { readOnlyHint: true },
    },
    guarded("get_case", async (args) => {
      const { data } = await supabase
        .from("user_assessment")
        .select(
          "id, ticket_id, status, created_at, due_date, follow_up_count, contact_preference, intent, account:account_id(nickname, full_name, first_name, last_name, phone, phone_country_code, email), trip:trip_id(destination, visa_type, travel_arrival, travel_return), contact_log(outcome, note, staff, created_at)"
        )
        .eq("ticket_id", args.ticket_id as string)
        .maybeSingle();
      if (!data) return errText(`ไม่พบเคส ${args.ticket_id}`);
      const account = (Array.isArray(data.account) ? data.account[0] : data.account) as {
        nickname: string | null; full_name: string | null; first_name: string | null; last_name: string | null;
        phone: string | null; phone_country_code: string | null; email: string | null;
      } | null;
      const trip = (Array.isArray(data.trip) ? data.trip[0] : data.trip) as {
        destination: string | null; visa_type: string | null; travel_arrival: string | null; travel_return: string | null;
      } | null;
      const { data: quotes } = await supabase
        .from("quote")
        .select("quote_number, status, grand_total")
        .eq("assessment_id", data.id);
      return text({
        ticket_id: data.ticket_id,
        status: data.status,
        created_at: data.created_at,
        due_date: data.due_date,
        follow_up_count: data.follow_up_count,
        customer: account
          ? {
              name: maskName(account),
              phone: maskPhone(account.phone ? `${account.phone_country_code ?? ""}${account.phone}` : null),
              email: maskEmail(account.email),
              preferred_channel: data.contact_preference,
            }
          : null,
        trip,
        intent: data.intent,
        contact_log: ((data.contact_log ?? []) as { outcome: string; note: string | null; staff: string | null; created_at: string }[])
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .slice(0, 10),
        quotes: (quotes ?? []).map((qq) => ({ ...qq, grand_total: Number(qq.grand_total) })),
      });
    })
  );

  server.registerTool(
    "dashboard_stats",
    {
      title: "สถิติภาพรวม",
      description: "สถิติ funnel/แหล่งที่มา/เหตุผลแพ้ จาก dashboard (ไม่มี PII)",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    guarded("dashboard_stats", async () => text(await fetchDashboardData("th")))
  );

  server.registerTool(
    "list_quotes",
    {
      title: "รายการใบเสนอราคา",
      description: "ลิสต์ใบเสนอราคา (กรองสถานะได้) — ลูกค้าแสดงชื่อย่อ คีย์คือ quote_number",
      inputSchema: { status: z.enum(VALID_QUOTE_STATUSES as [string, ...string[]]).optional() },
      annotations: { readOnlyHint: true },
    },
    guarded("list_quotes", async (args) => {
      const rows = await fetchQuotes({ status: args.status as string | undefined });
      return text(
        rows.map((r) => ({
          quote_number: r.quote_number,
          name: r.name,
          customer: maskFreeName(r.customer_name),
          status: r.status,
          grand_total: r.grand_total,
          valid_until: r.valid_until,
          ticket_id: r.ticket_id,
        }))
      );
    })
  );

  server.registerTool(
    "get_quote",
    {
      title: "ดูใบเสนอราคา",
      description: "ดูใบเสนอราคาเต็มด้วย quote_number — header (ลูกค้าปิดบังบางส่วน) + รายการ + ยอดรวม",
      inputSchema: { quote_number: z.string().max(30) },
      annotations: { readOnlyHint: true },
    },
    guarded("get_quote", async (args) => {
      const quote = await getQuoteByNumber(args.quote_number as string);
      if (!quote) return errText(`ไม่พบใบเสนอราคา ${args.quote_number}`);
      const full = await fetchQuoteWithLines(quote.id);
      if (!full) return errText("โหลดรายการไม่สำเร็จ");
      return text({
        quote_number: quote.quote_number,
        name: quote.name,
        status: quote.status,
        customer: {
          name: maskFreeName(quote.customer_name),
          phone: maskPhone(quote.customer_phone),
          email: maskEmail(quote.customer_email),
          address: maskAddress(quote.customer_address),
        },
        quote_date: quote.quote_date,
        valid_until: quote.valid_until,
        credit_days: quote.credit_days,
        sales_person: quote.sales_person,
        lines: full.lines.map((l) => ({
          product_code: l.product_code,
          product_name: l.product_name,
          quantity: l.quantity,
          unit: l.unit,
          unit_price: l.unit_price,
          discount_pct: l.discount_pct,
          taxable: l.taxable,
          line_total: l.line_total,
        })),
        subtotal: quote.subtotal,
        discount_amount: quote.discount_amount,
        vat_rate: quote.vat_rate,
        vat_amount: quote.vat_amount,
        grand_total: quote.grand_total,
      });
    })
  );

  server.registerTool(
    "list_products",
    {
      title: "รายการสินค้า/บริการ + ราคา",
      description: "สินค้า/บริการ/ค่าธรรมเนียม พร้อมราคาแต่ละ price book และส่วนประกอบของชุด (kit) — ไม่มี PII",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    guarded("list_products", async () => {
      const [products, books, kits] = await Promise.all([fetchProducts(true), fetchPriceBooks(true), fetchKitItems()]);
      const entriesByBook = Object.fromEntries(
        await Promise.all(books.map(async (b) => [b.name, await fetchEntriesForBook(b.id)]))
      ) as Record<string, Awaited<ReturnType<typeof fetchEntriesForBook>>>;
      const productById = new Map(products.map((p) => [p.id, p]));
      return text(
        products.map((p) => ({
          code: p.code,
          name: p.name,
          family: p.family,
          destination: p.destination,
          visa_type: p.visa_type,
          unit: p.unit,
          taxable: p.taxable,
          prices: Object.fromEntries(
            books
              .map((b) => [b.name, entriesByBook[b.name]?.find((e) => e.product_id === p.id && e.active)?.unit_price])
              .filter(([, v]) => v !== undefined)
          ),
          kit_components: kits
            .filter((k) => k.parent_product_id === p.id)
            .map((k) => ({ code: productById.get(k.component_product_id)?.code, quantity: k.quantity })),
        }))
      );
    })
  );

  // ---- WRITE ----

  server.registerTool(
    "create_quote",
    {
      title: "สร้างใบเสนอราคา",
      description:
        "สร้างใบเสนอราคาใหม่ (draft) — ผูกกับเคสด้วย ticket_id ได้ (ระบบดึงชื่อ/เบอร์ลูกค้าจริงจากเคสเองฝั่ง server) หรือระบุลูกค้าเอง ราคาอิง price book ชื่อที่ระบุ (default: Standard)",
      inputSchema: {
        name: z.string().max(200).describe("หัวเรื่อง/ชื่องาน"),
        ticket_id: z.string().max(40).optional(),
        customer_name: z.string().max(120).optional().describe("จำเป็นเมื่อไม่ผูกเคส"),
        price_book: z.string().max(100).default("Standard"),
        vat: z.boolean().default(false),
        credit_days: z.number().int().min(0).max(365).optional(),
      },
    },
    guarded("create_quote", async (args, member) => {
      const books = await fetchPriceBooks(true);
      const book = books.find((b) => b.name === args.price_book);
      if (!book) return errText(`ไม่พบ price book "${args.price_book}"`);

      let assessmentId: string | null = null;
      let accountId: string | null = null;
      let customerName = (args.customer_name as string | undefined)?.trim() ?? "";
      let customerPhone = "";
      let customerEmail = "";
      if (args.ticket_id) {
        const found = await resolveTicket(args.ticket_id as string);
        if (!found) return errText(`ไม่พบเคส ${args.ticket_id}`);
        assessmentId = found.id;
        accountId = found.account_id;
        if (found.account_id) {
          // Server-side uses REAL data; Claude never needs to see it.
          const { data: acc } = await supabase
            .from("account")
            .select("nickname, full_name, first_name, last_name, phone, phone_country_code, email")
            .eq("id", found.account_id)
            .maybeSingle();
          if (acc) {
            const nameParts = [acc.full_name || [acc.first_name, acc.last_name].filter(Boolean).join(" ")].filter(Boolean);
            customerName = customerName || nameParts[0] || acc.nickname || "";
            customerPhone = acc.phone ? `${acc.phone_country_code ?? ""}${acc.phone}` : "";
            customerEmail = acc.email ?? "";
          }
        }
      }
      if (!customerName) return errText("ต้องระบุ customer_name หรือ ticket_id ที่มีข้อมูลลูกค้า");

      const result = await createQuote({
        name: args.name,
        customerName,
        customerPhone,
        customerEmail,
        priceBookId: book.id,
        vatRate: args.vat ? 7 : 0,
        creditDays: args.credit_days,
        assessmentId,
        accountId,
        salesPerson: member.name,
      });
      if (!result.ok) return errText(result.error);
      const quote = await supabase.from("quote").select("quote_number").eq("id", result.id).maybeSingle();
      return text({ ok: true, quote_number: quote.data?.quote_number });
    })
  );

  const quoteByNumber = async (quoteNumber: string) => getQuoteByNumber(quoteNumber);

  server.registerTool(
    "add_quote_line",
    {
      title: "เพิ่มรายการในใบเสนอราคา",
      description: "เพิ่มสินค้า/บริการ/ชุด (kit จะแตกเป็นบรรทัดย่อยอัตโนมัติ) ลงใบเสนอราคา (draft เท่านั้น) — อ้างอิงด้วย product code",
      inputSchema: {
        quote_number: z.string().max(30),
        product_code: z.string().max(40),
        quantity: z.number().positive().max(999).default(1),
        discount_pct: z.number().min(0).max(100).default(0),
      },
    },
    guarded("add_quote_line", async (args) => {
      const quote = await quoteByNumber(args.quote_number as string);
      if (!quote) return errText(`ไม่พบใบเสนอราคา ${args.quote_number}`);
      const { data: product } = await supabase
        .from("product")
        .select("id")
        .eq("code", (args.product_code as string).toUpperCase())
        .maybeSingle();
      if (!product) return errText(`ไม่พบสินค้า ${args.product_code}`);
      const result = await addQuoteLine(quote, {
        productId: product.id,
        quantity: args.quantity,
        discountPct: args.discount_pct,
      });
      if (!result.ok) return errText(result.error);
      return text({ ok: true, exploded: (result as { exploded?: number }).exploded ?? undefined });
    })
  );

  server.registerTool(
    "update_quote_line",
    {
      title: "แก้รายการในใบเสนอราคา",
      description: "แก้จำนวน/ราคา/ส่วนลดของบรรทัด (ระบุลำดับบรรทัดจาก get_quote, เริ่มที่ 1) — draft เท่านั้น",
      inputSchema: {
        quote_number: z.string().max(30),
        line_number: z.number().int().min(1),
        quantity: z.number().positive().max(999).optional(),
        unit_price: z.number().min(0).optional(),
        discount_pct: z.number().min(0).max(100).optional(),
      },
    },
    guarded("update_quote_line", async (args) => {
      const quote = await quoteByNumber(args.quote_number as string);
      if (!quote) return errText(`ไม่พบใบเสนอราคา ${args.quote_number}`);
      const full = await fetchQuoteWithLines(quote.id);
      const line = full?.lines[(args.line_number as number) - 1];
      if (!line) return errText(`ไม่พบบรรทัดที่ ${args.line_number}`);
      const result = await updateQuoteLine(quote, {
        lineId: line.id,
        quantity: args.quantity,
        unitPrice: args.unit_price,
        discountPct: args.discount_pct,
      });
      return result.ok ? text({ ok: true }) : errText(result.error);
    })
  );

  server.registerTool(
    "delete_quote_line",
    {
      title: "ลบรายการในใบเสนอราคา",
      description: "ลบบรรทัด (ระบุลำดับจาก get_quote, เริ่มที่ 1) — draft เท่านั้น",
      inputSchema: { quote_number: z.string().max(30), line_number: z.number().int().min(1) },
    },
    guarded("delete_quote_line", async (args) => {
      const quote = await quoteByNumber(args.quote_number as string);
      if (!quote) return errText(`ไม่พบใบเสนอราคา ${args.quote_number}`);
      const full = await fetchQuoteWithLines(quote.id);
      const line = full?.lines[(args.line_number as number) - 1];
      if (!line) return errText(`ไม่พบบรรทัดที่ ${args.line_number}`);
      const result = await deleteQuoteLine(quote, { lineId: line.id });
      return result.ok ? text({ ok: true }) : errText(result.error);
    })
  );

  server.registerTool(
    "update_quote_header",
    {
      title: "แก้หัวใบเสนอราคา",
      description: "แก้หัวเรื่อง/วันยืนราคา/VAT/ส่วนลดท้ายใบ/เครดิต/หมายเหตุ (draft เท่านั้น)",
      inputSchema: {
        quote_number: z.string().max(30),
        name: z.string().max(200).optional(),
        valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        vat: z.boolean().optional(),
        discount_amount: z.number().min(0).optional(),
        credit_days: z.number().int().min(0).max(365).optional(),
        notes: z.string().max(2000).optional(),
      },
    },
    guarded("update_quote_header", async (args) => {
      const quote = await quoteByNumber(args.quote_number as string);
      if (!quote) return errText(`ไม่พบใบเสนอราคา ${args.quote_number}`);
      const body: Record<string, unknown> = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.valid_until !== undefined) body.validUntil = args.valid_until;
      if (args.vat !== undefined) body.vatRate = args.vat ? 7 : 0;
      if (args.discount_amount !== undefined) body.discountAmount = args.discount_amount;
      if (args.credit_days !== undefined) body.creditDays = args.credit_days;
      if (args.notes !== undefined) body.notes = args.notes;
      const result = await updateQuoteHeader(quote, body);
      return result.ok ? text({ ok: true }) : errText(result.error);
    })
  );

  server.registerTool(
    "set_quote_status",
    {
      title: "เปลี่ยนสถานะใบเสนอราคา",
      description: `เปลี่ยนสถานะใบเสนอราคา (${VALID_QUOTE_STATUSES.join("/")}) ตามกติกา transition — ยกเลิกใช้ canceled (ไม่มีการลบถาวร)`,
      inputSchema: { quote_number: z.string().max(30), status: z.enum(VALID_QUOTE_STATUSES as [string, ...string[]]) },
    },
    guarded("set_quote_status", async (args, member) => {
      const quote = await quoteByNumber(args.quote_number as string);
      if (!quote) return errText(`ไม่พบใบเสนอราคา ${args.quote_number}`);
      const result = await setQuoteStatus(quote, { status: args.status, note: `via MCP · ${member.name}` });
      return result.ok ? text({ ok: true }) : errText(result.error);
    })
  );

  server.registerTool(
    "set_case_status",
    {
      title: "เปลี่ยนสถานะเคส",
      description: `เปลี่ยนสถานะเคส (${VALID_STATUSES.join("/")}) — ปิด lost ต้องมีเหตุผล l1+l2 ที่ถูกต้อง (ดู taxonomy จากหน้า admin)`,
      inputSchema: {
        ticket_id: z.string().max(40),
        status: z.enum(VALID_STATUSES as [string, ...string[]]),
        lost_reason_l1: z.string().max(60).optional(),
        lost_reason_l2: z.string().max(60).optional(),
        won_service_type: z.enum(["full", "diy"]).optional(),
        close_notes: z.string().max(500).optional(),
      },
    },
    guarded("set_case_status", async (args, member) => {
      const found = await resolveTicket(args.ticket_id as string);
      if (!found) return errText(`ไม่พบเคส ${args.ticket_id}`);
      const result = await applyStatusChange({
        id: found.id,
        status: args.status as string,
        lostReasonL1: args.lost_reason_l1,
        lostReasonL2: args.lost_reason_l2,
        wonServiceType: args.won_service_type,
        closeNotes: args.close_notes,
        noteSuffix: `via MCP · ${member.name}`,
      });
      return result.ok ? text({ ok: true }) : errText(result.error);
    })
  );

  server.registerTool(
    "add_contact_log",
    {
      title: "บันทึกการติดต่อ",
      description: `บันทึกผลการติดต่อลูกค้าหนึ่งครั้ง (outcome: ${[...CONTACT_OUTCOMES].join("/")}) — ประทับชื่อผู้บันทึกอัตโนมัติ`,
      inputSchema: {
        ticket_id: z.string().max(40),
        outcome: z.string().max(40),
        note: z.string().max(500).optional(),
      },
    },
    guarded("add_contact_log", async (args, member) => {
      const found = await resolveTicket(args.ticket_id as string);
      if (!found) return errText(`ไม่พบเคส ${args.ticket_id}`);
      const result = await addContactLog({
        assessmentId: found.id,
        outcome: args.outcome as string,
        note: args.note,
        staff: member.name,
      });
      return result.ok ? text({ ok: true }) : errText(result.error);
    })
  );

  // ---- SEND (two-phase) ----

  server.registerTool(
    "send_message",
    {
      title: "ส่งข้อความ LINE หาลูกค้า",
      description:
        "ส่งข้อความ LINE หาลูกค้าของเคส — สองจังหวะ: เรียกครั้งแรกโดยไม่ใส่ confirm_token จะได้ preview + token กลับมา ตรวจแล้วเรียกซ้ำพร้อม token เพื่อส่งจริง",
      inputSchema: {
        ticket_id: z.string().max(40),
        message: z.string().min(1).max(1000),
        confirm_token: z.string().optional(),
      },
      annotations: { destructiveHint: true },
    },
    guarded("send_message", async (args, member) => {
      const found = await resolveTicket(args.ticket_id as string);
      if (!found) return errText(`ไม่พบเคส ${args.ticket_id}`);
      const { data: acc } = await supabase
        .from("account")
        .select("id, line_user_id, nickname, full_name, first_name, last_name")
        .eq("id", found.account_id ?? "")
        .maybeSingle();
      if (!acc?.line_user_id) return errText("เคสนี้ไม่มี LINE ที่เชื่อมไว้ ส่งข้อความไม่ได้");

      const payload = `${args.ticket_id}|${args.message}`;
      if (!args.confirm_token) {
        return text({
          preview: {
            to: maskName(acc),
            ticket_id: args.ticket_id,
            message: args.message,
          },
          confirm_token: makeConfirmToken(member.id, "send_message", payload),
          note: "ตรวจ preview แล้วเรียก send_message อีกครั้งพร้อม confirm_token ภายใน 10 นาทีเพื่อส่งจริง",
        });
      }
      if (!checkConfirmToken(args.confirm_token as string, member.id, "send_message", payload)) {
        return errText("confirm_token ไม่ถูกต้องหรือหมดอายุ — เรียกใหม่โดยไม่ใส่ token เพื่อขอ preview อีกครั้ง");
      }
      const { pushMessageLogged } = await import("../message-log");
      // kind "manual" = staff-authored free text (same class as the admin send-message
      // flow); the member attribution rides in the mcp_audit_log row for this call.
      const delivered = await pushMessageLogged({
        to: acc.line_user_id,
        accountId: acc.id,
        assessmentId: found.id,
        kind: "manual",
        content: args.message as string,
        messages: [{ type: "text", text: args.message as string }],
        sentBy: "admin",
        logFailed: true,
      });
      return delivered ? text({ ok: true, sent: true }) : errText("ส่งไม่สำเร็จ (LINE API)");
    })
  );
}
