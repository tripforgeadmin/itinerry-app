// Google Apps Script — deploy as Web App (Anyone can access)
// 1. Open script.google.com → New project
// 2. Paste this code
// 3. Deploy → New deployment → Web App → Execute as: Me → Who has access: Anyone
// 4. Copy the Web App URL → paste into APPS_SCRIPT_URL in Vercel env vars

const SHEET_NAME = "Visa Responses";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // Write header row if empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "LINE User ID",
        "LINE Display Name",
        "ชื่อ-นามสกุล",
        "สัญชาติ",
        "เบอร์โทรศัพท์",
        "อีเมล",
        "รู้จักจากไหน",
        "อาชีพ",
        "ประเภทวีซ่า",
        "ปลายทาง",
        "รายได้/เดือน",
        "ยอดเงินในบัญชี",
        "มีทรัพย์สิน",
        "เคยถูกปฏิเสธวีซ่า",
        "ประวัติเดินทาง",
        "ระยะเวลาอยู่",
        "จุดประสงค์เดินทาง",
        "มี Acceptance Letter",
        "ระยะเวลาศึกษา",
        "มี Job Offer",
        "ระดับภาษาอังกฤษ",
      ]);
    }

    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.lineUserId || "",
      data.lineDisplayName || "",
      data.fullName || "",
      data.nationality || "",
      data.phone || "",
      data.email || "",
      data.source || "",
      data.occupation || "",
      data.visaType || "",
      data.destination || "",
      data.monthlyIncome || "",
      data.bankBalance || "",
      data.hasProperty || "",
      data.prevVisaRefusal || "",
      data.prevTravel || "",
      data.tripDuration || "",
      data.travelPurpose || "",
      data.hasAcceptanceLetter || "",
      data.studyDuration || "",
      data.hasJobOffer || "",
      data.englishLevel || "",
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
