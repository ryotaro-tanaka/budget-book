function doGet() {
  return ContentService.createTextOutput("OK doGET");
}

function doPost(e) {
  const data = JSON.parse(e.parameter.payload);

  const handlers = {
    upload: () => handleUpload(data),
    expense: () => (appendExpenseRow(data), { ok: true }),
    expense_with_upload: () => handleExpenseWithUpload_(data)
  };

  const fn = handlers[data.action];
  if (!fn) return json_({ ok: false, error: "UnknownAction", action: data.action });

  return json_(fn());
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

const RECEIPTS_FOLDER_ID = "168FYIJd310yfiVs2Q7a1xC0mBjRfKlVm";

/**
 * @param {UploadRequest} data
 * @returns {UploadResult|{ok:false,error:string}}
 */
function handleUpload(data) {
  try {
    const blob = makeImageBlob_(data);
    const file = DriveApp.getFolderById(RECEIPTS_FOLDER_ID).createFile(blob);
    return { ok: true, image_file_id: file.getId(), image_url: file.getUrl() };
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return { ok: false, error: String(err) };
  }
}

function makeImageBlob_(data) {
  const b64 = normalizeBase64_(data.base64);
  const bytes = Utilities.base64Decode(b64);

  const mime = data.mime_type || "image/jpeg";
  const name = makeReceiptName_(data, mime);

  return Utilities.newBlob(bytes, mime, name);
}

function normalizeBase64_(b64) {
  var s = String(b64 || "").replace(/ /g, "+");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return s;
}

/**
 * ex: receipt_20260103_120100_ab12cd.jpg
 */
function makeReceiptName_(data, mime) {
  // YYYY-MM-DD → YYYYMMDD
  const date = String(data.date || "00000000").replace(/[^0-9]/g, "");

  // 1201.00 -> 120100
  const n = Number(data.amount);
  const amount = isFinite(n)
    ? Math.round(n * 100).toString()
    : "0";

  const ext = (mime === "image/png") ? "png" : "jpg";
  const suffix = Math.random().toString(36).slice(2, 8);

  return `receipt_${date}_${amount}_${suffix}.${ext}`;
}

/**
 * @param {Expense} expense
 */
function appendExpenseRow(expense) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("expense");
  sheet.appendRow([
    expense.date,
    Number(expense.amount),
    expense.image_url || "",
    expense.image_file_id || "",
    expense.category || ""
  ]);
}

/**
 * @param {ExpenseWithUploadRequest} data
 * @returns {ExpenseWithUploadResponse}
 */
function handleExpenseWithUpload_(data) {
  let uploadResult = null;

  if (data.base64) {
    uploadResult = handleUpload(data);

    if (uploadResult.ok) {
      data.image_url = uploadResult.image_url;
      data.image_file_id = uploadResult.image_file_id;
    }
  }

  appendExpenseRow(data);

  return {
    ok: true,
    upload: uploadResult
      ? uploadResult
      : { ok: false, skipped: true }
  };
}
