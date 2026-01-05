const RECEIPTS_FOLDER_ID = "168FYIJd310yfiVs2Q7a1xC0mBjRfKlVm";

/**
 * @param {UploadRequest|ExpenseWithUploadRequest} data
 * @returns {UploadResult}
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
  const date = String(data.date || "00000000").replace(/[^0-9]/g, "");
  const n = Number(data.amount);
  const amount = isFinite(n) ? Math.round(n * 100).toString() : "0";

  const ext = (mime === "image/png") ? "png" : "jpg";
  const suffix = Math.random().toString(36).slice(2, 8);

  // date/amountが無いと意図した命名にならないので、開発中は落としたい場合はここでthrowしてもOK
  return `receipt_${date}_${amount}_${suffix}.${ext}`;
}
