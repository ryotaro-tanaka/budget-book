function doGet() {
  return ContentService.createTextOutput("OK doGET");
}

function doPost(e) {
  const data = JSON.parse(e.parameter.payload);

  requireAuth_(data);

  const handlers = {
    upload: () => json_(handleUpload(data)),
    expense: () => json_((appendExpenseRow(data), { ok: true })),
    expense_with_upload: () => handleExpenseWithUploadHtml_(data)
  };

  const fn = handlers[data.action];
  if (!fn) return json_({ ok: false, error: "UnknownAction", action: data.action });

  return fn();
}
