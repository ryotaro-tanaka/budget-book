/**
 * expenseは必ず保存。画像はベストエフォート。
 * 結果はContinueボタン付きHTMLで返す。
 *
 * @param {ExpenseWithUploadRequest} data
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function handleExpenseWithUploadHtml_(data) {
  let ok = true;
  let uploadOk = null; // null: upload_ok を付けない

  try {
    if (data.base64) {
      const up = handleUpload(data);
      uploadOk = !!up.ok;

      if (up.ok) {
        data.image_url = up.image_url;
        data.image_file_id = up.image_file_id;
      }
    }

    appendExpenseRow(data);

  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    ok = false;
  }

  // return_to は "https://xxx/result" 推奨（/result をGAS側で足さない運用が安定）
  const url = resultUrl_(data.return_to, ok, uploadOk);

  const msg =
    ok
      ? (uploadOk === null
          ? "Saved"
          : (uploadOk ? "Saved (image uploaded)" : "Saved (image failed)"))
      : "Failed";

  return continuePage_(url, msg, false);
}
