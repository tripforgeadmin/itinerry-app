import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import { QUESTIONS } from "./questions";

Font.register({
  family: "Sarabun",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/Sarabun-Regular.ttf") },
    { src: path.join(process.cwd(), "public/fonts/Sarabun-Bold.ttf"), fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { fontFamily: "Sarabun", padding: 48, fontSize: 11, color: "#1e293b", lineHeight: 1.7 },
  header: { marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 11, color: "#64748b" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: { flexDirection: "row", marginBottom: 6, alignItems: "flex-start" },
  label: { flex: 2, color: "#64748b", paddingRight: 12 },
  value: { flex: 3 },
});

type AnsweredQuestion = {
  section: string;
  sectionTitle: string;
  question: string;
  value: string;
};

function buildAnsweredList(answers: Record<string, string>): AnsweredQuestion[] {
  const result: AnsweredQuestion[] = [];

  for (const q of QUESTIONS) {
    if (q.type === "consent") continue;

    const raw = answers[q.id];
    if (!raw || raw.trim() === "") continue;

    let displayValue = raw;

    if (q.type === "radio" || q.type === "dropdown") {
      const opt = q.options?.find((o) => o.value === raw);
      if (opt) {
        displayValue = opt.label;
        // append free-text if "other"
        if (raw === "other") {
          const otherText = answers[`${q.id}_other`];
          if (otherText) displayValue = `${opt.label}: ${otherText}`;
        }
      }
    } else if (q.type === "multiCheckbox") {
      displayValue = raw
        .split(",")
        .map((v) => {
          const opt = q.options?.find((o) => o.value === v.trim());
          return opt?.label ?? v.trim();
        })
        .join(", ");
    }
    // text / email / tel / date — keep raw value

    result.push({
      section: q.section,
      sectionTitle: q.sectionTitle,
      question: q.question,
      value: displayValue,
    });
  }

  return result;
}

function AssessmentDocument({
  answers,
  submittedAt,
}: {
  answers: Record<string, string>;
  submittedAt: string;
}) {
  const answered = buildAnsweredList(answers);

  // Group by section, preserving order of first appearance
  const sectionOrder: string[] = [];
  const sections: Record<string, { title: string; rows: AnsweredQuestion[] }> = {};

  for (const item of answered) {
    if (!sections[item.section]) {
      sectionOrder.push(item.section);
      sections[item.section] = { title: item.sectionTitle, rows: [] };
    }
    sections[item.section].rows.push(item);
  }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>สรุปคำถาม-คำตอบลูกค้า</Text>
          <Text style={s.subtitle}>{submittedAt}</Text>
        </View>

        {sectionOrder.map((sec) => (
          <View key={sec}>
            <Text style={s.sectionTitle}>{sections[sec].title}</Text>
            {sections[sec].rows.map((row, i) => (
              <View key={i} style={s.row}>
                <Text style={s.label}>{row.question}</Text>
                <Text style={s.value}>{row.value}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function generateAssessmentPdf(
  answers: Record<string, string>,
  submittedAt: string,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(AssessmentDocument, { answers, submittedAt }) as any;
  return await renderToBuffer(element);
}
