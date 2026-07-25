import React from "react";
import {
  Document, Page, Text, View, Image, StyleSheet, renderToBuffer,
} from "@react-pdf/renderer";
import path from "path";
import "./pdf-fonts"; // Sarabun + Thai shaping fixes (shared with worksheet-pdf)
import { formatTHB } from "./money";
import type { QuoteLineItemRow, QuoteRow } from "./quotes";

/**
 * Customer-facing quotation PDF (ใบเสนอราคา). Renders entirely from quote/line
 * snapshots — no live product/price lookups, so an issued PDF is reproducible even
 * after the master data changes. Draft quotes carry a ฉบับร่าง (DRAFT) banner.
 */

// Phase 1: seller identity as constants; moves to app_config when it needs editing.
const SELLER = {
  name: "itinerry (TripForge Co.)",
  addressLines: ["www.itinerry.com"],
  email: "it.tripforge.co@gmail.com",
};

const NAVY = "#1b3d5c";
const GRAY = "#6b7280";
const LIGHT = "#eef2f6";
const BORDER = "#d7dee6";

const s = StyleSheet.create({
  page: { fontFamily: "Sarabun", fontSize: 9, color: "#111827", padding: 36, paddingBottom: 48 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 34, height: 34, marginBottom: 4 },
  sellerName: { fontSize: 11, fontWeight: 700, color: NAVY },
  sellerLine: { fontSize: 8, color: GRAY },
  title: { fontSize: 18, fontWeight: 700, color: NAVY, textAlign: "right" },
  titleEn: { fontSize: 9, color: GRAY, textAlign: "right", letterSpacing: 2 },
  draftBanner: {
    marginTop: 6, alignSelf: "flex-end", borderWidth: 1, borderColor: "#b91c1c",
    color: "#b91c1c", paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: 700,
  },
  metaBlock: { marginTop: 4, alignItems: "flex-end" },
  metaLine: { fontSize: 9, color: "#111827" },
  metaLabel: { color: GRAY },
  section: { marginTop: 14 },
  customerBox: { backgroundColor: LIGHT, borderRadius: 4, padding: 10 },
  customerLabel: { fontSize: 7.5, color: GRAY, marginBottom: 2, letterSpacing: 1 },
  customerName: { fontSize: 10.5, fontWeight: 700 },
  customerLine: { fontSize: 9, color: "#374151" },
  subject: { marginTop: 10, fontSize: 10, fontWeight: 700 },
  table: { marginTop: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  thead: { flexDirection: "row", backgroundColor: NAVY, color: "#ffffff", fontWeight: 700, fontSize: 8.5 },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: BORDER },
  cIdx: { width: "6%", padding: 5, textAlign: "center" },
  cName: { width: "44%", padding: 5 },
  cQty: { width: "12%", padding: 5, textAlign: "right" },
  cPrice: { width: "14%", padding: 5, textAlign: "right" },
  cDisc: { width: "10%", padding: 5, textAlign: "right" },
  cTotal: { width: "14%", padding: 5, textAlign: "right" },
  lineCode: { fontSize: 7, color: GRAY },
  noVatTag: { fontSize: 7, color: GRAY },
  totalsRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 2 },
  totalsLabel: { width: "30%", padding: 3, textAlign: "right", color: GRAY },
  totalsValue: { width: "18%", padding: 3, textAlign: "right" },
  grandRow: {
    flexDirection: "row", justifyContent: "flex-end", marginTop: 3,
    backgroundColor: LIGHT, borderRadius: 4,
  },
  grandLabel: { width: "30%", padding: 6, textAlign: "right", fontWeight: 700, color: NAVY },
  grandValue: { width: "18%", padding: 6, textAlign: "right", fontWeight: 700, color: NAVY, fontSize: 10.5 },
  vatNote: { marginTop: 4, fontSize: 7.5, color: GRAY, textAlign: "right" },
  blockTitle: { fontSize: 8, fontWeight: 700, color: NAVY, marginBottom: 2, letterSpacing: 1 },
  blockText: { fontSize: 8.5, color: "#374151" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  signBox: { width: "42%", alignItems: "center" },
  signLine: { borderTopWidth: 1, borderTopColor: "#9ca3af", width: "100%", marginTop: 34, paddingTop: 4 },
  signLabel: { fontSize: 8.5, color: GRAY, textAlign: "center" },
  footer: {
    position: "absolute", bottom: 24, left: 36, right: 36,
    fontSize: 7.5, color: GRAY, textAlign: "center",
  },
});

export interface QuotePdfData {
  quote: QuoteRow;
  lines: QuoteLineItemRow[];
}

const fmtDate = (d: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" }) : "—";

function QuoteDoc({ quote, lines }: QuotePdfData) {
  const hasPassThrough = lines.some((l) => !l.taxable);
  const isDraft = quote.status === "draft";
  return (
    <Document title={`${quote.quote_number} — ใบเสนอราคา`}>
      <Page size="A4" style={s.page}>
        {/* Header: seller ↔ title/number */}
        <View style={s.headerRow}>
          <View>
            <Image src={path.join(process.cwd(), "public/itinfav.png")} style={s.logo} />
            <Text style={s.sellerName}>{SELLER.name}</Text>
            {SELLER.addressLines.map((l) => (
              <Text key={l} style={s.sellerLine}>{l}</Text>
            ))}
            <Text style={s.sellerLine}>{SELLER.email}</Text>
          </View>
          <View>
            <Text style={s.title}>ใบเสนอราคา</Text>
            <Text style={s.titleEn}>QUOTATION</Text>
            <View style={s.metaBlock}>
              <Text style={s.metaLine}><Text style={s.metaLabel}>เลขที่: </Text>{quote.quote_number}</Text>
              <Text style={s.metaLine}><Text style={s.metaLabel}>วันที่: </Text>{fmtDate(quote.quote_date)}</Text>
              {quote.valid_until && (
                <Text style={s.metaLine}><Text style={s.metaLabel}>ยืนราคาถึง: </Text>{fmtDate(quote.valid_until)}</Text>
              )}
            </View>
            {isDraft && <Text style={s.draftBanner}>ฉบับร่าง (DRAFT)</Text>}
          </View>
        </View>

        {/* Customer */}
        <View style={[s.section, s.customerBox]}>
          <Text style={s.customerLabel}>เรียน / ลูกค้า</Text>
          <Text style={s.customerName}>{quote.customer_name}</Text>
          {quote.customer_address && <Text style={s.customerLine}>{quote.customer_address}</Text>}
          {(quote.customer_phone || quote.customer_email) && (
            <Text style={s.customerLine}>
              {[quote.customer_phone, quote.customer_email].filter(Boolean).join("  ·  ")}
            </Text>
          )}
        </View>

        <Text style={s.subject}>เรื่อง: {quote.name}</Text>

        {/* Line table */}
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={s.cIdx}>ลำดับ</Text>
            <Text style={s.cName}>รายการ</Text>
            <Text style={s.cQty}>จำนวน</Text>
            <Text style={s.cPrice}>ราคาต่อหน่วย</Text>
            <Text style={s.cDisc}>ส่วนลด</Text>
            <Text style={s.cTotal}>รวม (บาท)</Text>
          </View>
          {lines.map((l, i) => (
            <View key={l.id} style={[s.tr, i === 0 ? { borderTopWidth: 0 } : {}]} wrap={false}>
              <Text style={s.cIdx}>{i + 1}</Text>
              <View style={s.cName}>
                <Text>{l.product_name}</Text>
                {l.description ? <Text style={s.lineCode}>{l.description}</Text> : null}
                {!l.taxable ? <Text style={s.noVatTag}>(เงินจ่ายแทน — ไม่มีภาษีมูลค่าเพิ่ม)</Text> : null}
              </View>
              <Text style={s.cQty}>
                {l.quantity}{l.unit ? ` ${l.unit}` : ""}
              </Text>
              <Text style={s.cPrice}>{formatTHB(l.unit_price).replace("฿", "")}</Text>
              <Text style={s.cDisc}>{l.discount_pct > 0 ? `${l.discount_pct}%` : "—"}</Text>
              <Text style={s.cTotal}>{formatTHB(l.line_total).replace("฿", "")}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={{ marginTop: 8 }}>
          <View style={s.totalsRow}>
            <Text style={s.totalsLabel}>รวมเป็นเงิน</Text>
            <Text style={s.totalsValue}>{formatTHB(quote.subtotal).replace("฿", "")}</Text>
          </View>
          {quote.discount_amount > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>ส่วนลด</Text>
              <Text style={s.totalsValue}>−{formatTHB(quote.discount_amount).replace("฿", "")}</Text>
            </View>
          )}
          {quote.vat_rate > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>ภาษีมูลค่าเพิ่ม {quote.vat_rate}%</Text>
              <Text style={s.totalsValue}>{formatTHB(quote.vat_amount).replace("฿", "")}</Text>
            </View>
          )}
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>รวมทั้งสิ้น</Text>
            <Text style={s.grandValue}>{formatTHB(quote.grand_total)}</Text>
          </View>
          {quote.vat_rate > 0 && hasPassThrough && (
            <Text style={s.vatNote}>
              ภาษีมูลค่าเพิ่มคำนวณเฉพาะค่าบริการ — ค่าธรรมเนียมสถานทูต/ศูนย์ยื่นวีซ่าเป็นเงินจ่ายแทน (pass-through)
            </Text>
          )}
        </View>

        {/* Notes / terms */}
        {quote.notes && (
          <View style={s.section}>
            <Text style={s.blockTitle}>หมายเหตุ</Text>
            <Text style={s.blockText}>{quote.notes}</Text>
          </View>
        )}
        {quote.terms && (
          <View style={s.section}>
            <Text style={s.blockTitle}>เงื่อนไข</Text>
            <Text style={s.blockText}>{quote.terms}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={s.signRow}>
          <View style={s.signBox}>
            <View style={s.signLine}>
              <Text style={s.signLabel}>ผู้เสนอราคา</Text>
              <Text style={s.signLabel}>วันที่ ............................</Text>
            </View>
          </View>
          <View style={s.signBox}>
            <View style={s.signLine}>
              <Text style={s.signLabel}>ผู้อนุมัติ / ลูกค้า</Text>
              <Text style={s.signLabel}>วันที่ ............................</Text>
            </View>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {SELLER.name} · เอกสารนี้ออกโดยระบบ — {quote.quote_number}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuoteDoc {...data} />);
}
