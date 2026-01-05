// response.gs

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * return_to は "https://xxx/result" を推奨（末尾スラッシュは無視）
 * ok=1/0, ok=1 のときだけ upload_ok を付与（画像無しなら付けない）
 */
function resultUrl_(returnTo, ok, uploadOk) {
  const base = String(returnTo || "").replace(/\/+$/, "");
  const params = [];
  params.push("ok=" + (ok ? "1" : "0"));
  if (ok && uploadOk !== null) params.push("upload_ok=" + (uploadOk ? "1" : "0"));
  return base + "?" + params.join("&");
}

/**
 * Continueボタンを出す結果ページHTML
 * - target=_top でトップ遷移
 * - 自動遷移は基本OFF（必要ならenableAuto=trueでON）
 */
function continuePage_(redirectUrl, message, enableAuto) {
  const u = String(redirectUrl || "");
  const msg = String(message || "");

  const auto = enableAuto
    ? (
      '<script>' +
        'setTimeout(function(){' +
          'try{ window.top.location.replace(' + JSON.stringify(u) + '); }catch(e){ window.location.replace(' + JSON.stringify(u) + '); }' +
        '}, 50);' +
      '</script>'
    )
    : "";

  const out = HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Result</title>' +
    '</head><body style="font-family:system-ui;padding:16px;line-height:1.4">' +
      '<h2 style="margin:0 0 12px 0">' + escapeHtml_(msg) + '</h2>' +
      '<p style="margin:0 0 14px 0">' +
        '<a href="' + escapeHtml_(u) + '" target="_top" rel="noopener" ' +
           'style="display:inline-block;padding:10px 12px;border:1px solid #ccc;border-radius:10px;text-decoration:none">' +
          'Continue</a>' +
      '</p>' +
      '<p style="margin:0;color:#666;font-size:12px">If you are not redirected, tap Continue.</p>' +
      auto +
    '</body></html>'
  );

  // Apps Scriptの出力が埋め込み扱いになるケースの保険
  out.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  return out;
}

function escapeHtml_(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * expense_with_upload のHTMLレスポンス版
 * - expenseは必ず保存（成功なら ok=1）
 * - 画像は任意（upload_ok=1/0 で通知、画像なしなら付けない）
 *
 * @param {ExpenseWithUploadRequest} data
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function handleExpenseWithUploadHtml_(data) {
  let ok = true;
  let uploadOk = null; // null: upload_ok を付けない

  try {
    // 画像があるならアップロード試行（失敗してもexpenseは続行）
    if (data.base64) {
      const up = handleUpload(data);
      uploadOk = !!up.ok;

      if (up.ok) {
        data.image_url = up.image_url;
        data.image_file_id = up.image_file_id;
      }
    }

    appendExpenseRow(data);

  } catch (e) {
    console.error(e && e.stack ? e.stack : e);
    ok = false;
  }

  const url = resultUrl_(data.return_to, ok, uploadOk);

  const msg =
    ok
      ? (uploadOk === null
          ? "Saved"
          : (uploadOk ? "Saved (image uploaded)" : "Saved (image failed)"))
      : "Failed";

  // 自動遷移は基本OFF（ブロックされることがあるので）
  return continuePage_(url, msg, false);
}
