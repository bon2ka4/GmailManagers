/**
 * GMAIL MANAGER CLOUD BACKEND (Google Apps Script)
 * Hướng dẫn: Mở Google Sheet -> Extensions -> Apps Script -> Dán code này vào -> Deploy as Web App.
 */

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getRange("A1").getValue(); // Chúng ta lưu toàn bộ JSON đã mã hóa vào 1 ô duy nhất cho đơn giản
  
  return ContentService.createTextOutput(data || "[]")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    const content = e.postData.contents;
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Lưu đè toàn bộ dữ liệu mới vào ô A1
    sheet.getRange("A1").setValue(content);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
