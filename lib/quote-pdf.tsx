import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import "./pdf-fonts"; // Sarabun + Thai shaping fixes (shared with worksheet-pdf)
import { formatTHB } from "./money";
import { taxBreakdown } from "./quote-math.ts";
import { bahtText } from "./baht-text.ts";
import type { QuoteLineItemRow, QuoteRow } from "./quotes";

/**
 * Customer-facing quotation PDF (ใบเสนอราคา), laid out to match the company's real
 * form (examquotation.pdf at the repo root): Tripforge legal block, per-line tax
 * column, VAT-exempt/VAT-base split rows, amount in Thai words, standard refund
 * notes + UOB payment block, and the two-sided signature footer.
 *
 * Renders entirely from quote/line snapshots — no live product/price lookups, so an
 * issued PDF is reproducible after master-data edits. Drafts carry a DRAFT banner.
 */

// Company identity + standing text, phase-1 style constants (move to app_config when
// the business needs to edit them without a deploy).
const SELLER = {
  nameTh: "บริษัท ทริปฟอร์จ จำกัด (สำนักงานใหญ่)",
  addressLines: [
    "118/1 อาคารทิปโก้ ถนนพระราม6 แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400",
    "เลขประจำตัวผู้เสียภาษี 0105568171741",
    "โทร. 022798566",
  ],
  signName: "บริษัท ทริปฟอร์จ จำกัด",
};

const STANDARD_NOTES = [
  "• ค่าบริการศูนย์ยื่นคำร้องวีซ่า และค่าธรรมเนียมวีซ่า ไม่สามารถขอเงินคืนได้ ในทุกกรณี",
  "• ค่าบริการจัดเตรียมเอกสารวีซ่าของ itinerry ไม่สามารถขอเงินคืนได้ ในทุกกรณี",
  "ในกรณีที่วีซ่าไม่ผ่าน และพบว่าสาเหตุมาจากความผิดพลาดด้านการกรอกข้อมูล หรือการจัดเตรียมเอกสารของเจ้าหน้าที่ ทางบริษัทฯ จะทำการยื่นใหม่ให้อีกครั้ง (โดยลูกค้าเป็นผู้รับผิดชอบค่าธรรมเนียมวีซ่า และค่าบริการศูนย์ยื่นคำร้องวีซ่า) หรือทำการ Refund ค่าบริการจัดเตรียมเอกสารวีซ่าของ itinerry ได้ 75% ของราคาค่าบริการ (ยกเว้นการยื่นวีซ่าประเทศสหรัฐอเมริกาที่ไม่สามารถทำ Refund ได้)",
  "แต่หากพบว่าสาเหตุของความผิดพลาดเกิดจากเอกสารของลูกค้า หรือการแจ้งข้อมูลเท็จจากทางลูกค้า ทางบริษัทฯ ขอสงวนสิทธิ์ในการชดเชยทุกกรณี",
];

const PAYMENT_LINES = [
  "ธนาคาร: United Overseas Bank-UOB (ธนาคารยูไนเต็ด โอเวอร์ซีส์)",
  "Swift Code: UOVBTHBK",
  "สาขา: Thanon Phraram 6 (สาขาถนนพระรามหก)",
  "ชื่อบัญชี: Tripforge Co.,Ltd. (บจก. ทริปฟอร์จ)",
  "เลขที่บัญชี: 823-168-979-6",
];

const ORANGE = "#f0821e"; // accent from the example form
const NAVY = "#1b3d5c";
const GRAY = "#6b7280";
const LIGHT = "#f6f7f9";
const BORDER = "#e2e6ea";

const s = StyleSheet.create({
  page: { fontFamily: "Sarabun", fontSize: 9, color: "#1f2937", padding: 36, paddingBottom: 46 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 34, height: 34, marginBottom: 5 },
  sellerName: { fontSize: 10.5, fontWeight: 700, color: NAVY },
  sellerLine: { fontSize: 8, color: GRAY, lineHeight: 1.5 },
  headRight: { width: 250 },
  title: { fontSize: 19, fontWeight: 700, color: ORANGE, textAlign: "right" },
  metaTable: { marginTop: 8, borderTopWidth: 1, borderTopColor: BORDER, paddingTop: 6 },
  metaRow: { flexDirection: "row", marginBottom: 2 },
  metaLabel: { width: 62, color: ORANGE, fontSize: 8.5 },
  metaValue: { flex: 1, fontSize: 8.5 },
  draftBanner: {
    marginTop: 6, alignSelf: "flex-end", borderWidth: 1, borderColor: "#b91c1c",
    color: "#b91c1c", paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: 700,
  },
  customer: { marginTop: 12 },
  customerLabel: { fontSize: 8.5, color: ORANGE },
  customerName: { fontSize: 10, fontWeight: 700, marginTop: 1 },
  customerLine: { fontSize: 8.5, color: "#374151" },
  table: { marginTop: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  thead: {
    flexDirection: "row", borderTopWidth: 1, borderTopColor: "#9ca3af",
    borderBottomWidth: 1, borderBottomColor: "#9ca3af", fontWeight: 700, fontSize: 8.5,
    backgroundColor: LIGHT,
  },
  tr: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: BORDER },
  cIdx: { width: "5%", padding: 5, textAlign: "center" },
  cName: { width: "39%", padding: 5 },
  cQty: { width: "10%", padding: 5, textAlign: "right" },
  cPrice: { width: "15%", padding: 5, textAlign: "right" },
  cDisc: { width: "9%", padding: 5, textAlign: "right" },
  cTax: { width: "8%", padding: 5, textAlign: "right" },
  cTotal: { width: "14%", padding: 5, textAlign: "right" },
  lineSub: { fontSize: 7.5, color: GRAY },
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2, alignItems: "center" },
  totalsLabel: { width: "34%", padding: 2.5, textAlign: "right", color: ORANGE, fontSize: 8.5 },
  totalsValue: { width: "20%", padding: 2.5, textAlign: "right", fontSize: 8.5 },
  grandLabel: { width: "34%", padding: 3, textAlign: "right", color: ORANGE, fontWeight: 700, fontSize: 10 },
  grandValue: { width: "20%", padding: 3, textAlign: "right", fontWeight: 700, fontSize: 10.5 },
  bahtWords: { marginTop: 4, fontSize: 8.5, fontWeight: 700 },
  blockTitle: { fontSize: 8.5, fontWeight: 700, color: ORANGE, marginTop: 12, marginBottom: 2 },
  blockText: { fontSize: 8, color: "#374151", lineHeight: 1.55 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
  signBox: { width: "44%" },
  signName: { fontSize: 8.5, marginBottom: 26 },
  signCells: { flexDirection: "row", gap: 12 },
  signCell: { flex: 1, borderTopWidth: 0.75, borderTopColor: "#9ca3af", paddingTop: 3 },
  signLabel: { fontSize: 8, color: GRAY, textAlign: "center" },
});

export interface QuotePdfData {
  quote: QuoteRow;
  lines: QuoteLineItemRow[];
}

const fmtDMY = (d: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
};

const fmtThai = (d: Date) =>
  d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

const money = (n: number) => formatTHB(n).replace("฿", "");

function QuoteDoc({ quote, lines }: QuotePdfData) {
  const isDraft = quote.status === "draft";
  const breakdown = taxBreakdown(
    lines.map((l) => ({ lineTotal: l.line_total, taxable: l.taxable })),
    quote.discount_amount
  );
  const showVat = quote.vat_rate > 0;
  const dueDate =
    quote.credit_days !== null
      ? new Date(new Date(`${quote.quote_date}T00:00:00`).getTime() + quote.credit_days * 86400000)
      : null;

  return (
    <Document title={`${quote.quote_number} — ใบเสนอราคา`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Image src={path.join(process.cwd(), "public/itinfav.png")} style={s.logo} />
            <Text style={s.sellerName}>{SELLER.nameTh}</Text>
            {SELLER.addressLines.map((l) => (
              <Text key={l} style={s.sellerLine}>{l}</Text>
            ))}
          </View>
          <View style={s.headRight}>
            <Text style={s.title}>ใบเสนอราคา</Text>
            <View style={s.metaTable}>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>เลขที่</Text>
                <Text style={s.metaValue}>{quote.quote_number}</Text>
              </View>
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>วันที่</Text>
                <Text style={s.metaValue}>{fmtDMY(quote.quote_date)}</Text>
              </View>
              {quote.credit_days !== null && (
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>เครดิต</Text>
                  <Text style={s.metaValue}>{quote.credit_days} วัน</Text>
                </View>
              )}
              {quote.valid_until && (
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>ยืนราคาถึง</Text>
                  <Text style={s.metaValue}>{fmtDMY(quote.valid_until)}</Text>
                </View>
              )}
              {quote.sales_person && (
                <View style={s.metaRow}>
                  <Text style={s.metaLabel}>ผู้ขาย</Text>
                  <Text style={s.metaValue}>{quote.sales_person}</Text>
                </View>
              )}
              <View style={s.metaRow}>
                <Text style={s.metaLabel}>ชื่องาน</Text>
                <Text style={s.metaValue}>{quote.name}</Text>
              </View>
            </View>
            {isDraft && <Text style={s.draftBanner}>ฉบับร่าง (DRAFT)</Text>}
          </View>
        </View>

        {/* Customer */}
        <View style={s.customer}>
          <Text style={s.customerLabel}>ลูกค้า</Text>
          <Text style={s.customerName}>{quote.customer_name}</Text>
          {quote.customer_address && <Text style={s.customerLine}>{quote.customer_address}</Text>}
          {(quote.customer_phone || quote.customer_email) && (
            <Text style={s.customerLine}>
              {[quote.customer_phone, quote.customer_email].filter(Boolean).join("  ·  ")}
            </Text>
          )}
        </View>

        {/* Line table (per-line tax % like the example form) */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={s.cIdx}>#</Text>
            <Text style={s.cName}>รายละเอียด</Text>
            <Text style={s.cQty}>จำนวน</Text>
            <Text style={s.cPrice}>ราคาต่อหน่วย</Text>
            <Text style={s.cDisc}>ส่วนลด</Text>
            <Text style={s.cTax}>ภาษี</Text>
            <Text style={s.cTotal}>มูลค่า</Text>
          </View>
          {lines.map((l, i) => (
            <View key={l.id} style={[s.tr, i === 0 ? { borderTopWidth: 0 } : {}]} wrap={false}>
              <Text style={s.cIdx}>{i + 1}</Text>
              <View style={s.cName}>
                <Text>{l.product_name}</Text>
                {l.description ? <Text style={s.lineSub}>{l.description}</Text> : null}
              </View>
              <Text style={s.cQty}>{l.quantity}{l.unit ? ` ${l.unit}` : ""}</Text>
              <Text style={s.cPrice}>{money(l.unit_price)}</Text>
              <Text style={s.cDisc}>{l.discount_pct > 0 ? `${l.discount_pct} %` : "—"}</Text>
              <Text style={s.cTax}>{showVat && l.taxable ? `${quote.vat_rate} %` : "0 %"}</Text>
              <Text style={s.cTotal}>{money(l.line_total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals (VAT-exempt / VAT-base split rows like the example) */}
        <View style={{ marginTop: 8 }}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>รวมเป็นเงิน</Text>
            <Text style={s.totalsValue}>{money(quote.subtotal)} บาท</Text>
          </View>
          {quote.discount_amount > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>ส่วนลดท้ายใบ</Text>
              <Text style={s.totalsValue}>−{money(quote.discount_amount)} บาท</Text>
            </View>
          )}
          {showVat && (
            <>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>มูลค่าที่ไม่มี/ยกเว้นภาษี</Text>
                <Text style={s.totalsValue}>{money(breakdown.nonTaxableSubtotal)} บาท</Text>
              </View>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>มูลค่าที่คำนวณภาษี</Text>
                <Text style={s.totalsValue}>{money(breakdown.taxableBase)} บาท</Text>
              </View>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>ภาษีมูลค่าเพิ่ม {quote.vat_rate}%</Text>
                <Text style={s.totalsValue}>{money(quote.vat_amount)} บาท</Text>
              </View>
            </>
          )}
          <View style={s.totalsRow}>
            <Text style={s.grandLabel}>จำนวนเงินรวมทั้งสิ้น</Text>
            <Text style={s.grandValue}>{money(quote.grand_total)} บาท</Text>
          </View>
          <Text style={s.bahtWords}>({bahtText(quote.grand_total)})</Text>
        </View>

        {/* Standard notes + free-text notes */}
        <Text style={s.blockTitle}>หมายเหตุ</Text>
        {STANDARD_NOTES.map((n) => (
          <Text key={n.slice(0, 24)} style={s.blockText}>{n}</Text>
        ))}
        {quote.notes && <Text style={[s.blockText, { marginTop: 3 }]}>{quote.notes}</Text>}
        {quote.terms && (
          <>
            <Text style={s.blockTitle}>เงื่อนไขเพิ่มเติม</Text>
            <Text style={s.blockText}>{quote.terms}</Text>
          </>
        )}

        {/* Payment channel */}
        <Text style={s.blockTitle}>ช่องทางการชำระเงิน</Text>
        {PAYMENT_LINES.map((l) => (
          <Text key={l} style={s.blockText}>{l}</Text>
        ))}
        {dueDate && (
          <Text style={[s.blockText, { marginTop: 2 }]}>
            โปรดชำระเงินภายในวันที่ {fmtThai(dueDate)} เพื่อสำรองสิทธิ์ของท่าน
          </Text>
        )}

        {/* Signatures: customer left, company right (as the example) */}
        <View style={s.signRow} wrap={false}>
          <View style={s.signBox}>
            <Text style={s.signName}>ในนาม {quote.customer_name}</Text>
            <View style={s.signCells}>
              <View style={s.signCell}><Text style={s.signLabel}>ผู้สั่งซื้อสินค้า</Text></View>
              <View style={s.signCell}><Text style={s.signLabel}>วันที่</Text></View>
            </View>
          </View>
          <View style={s.signBox}>
            <Text style={s.signName}>ในนาม {SELLER.signName}</Text>
            <View style={s.signCells}>
              <View style={s.signCell}><Text style={s.signLabel}>ผู้อนุมัติ</Text></View>
              <View style={s.signCell}><Text style={s.signLabel}>วันที่</Text></View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuoteDoc {...data} />);
}
