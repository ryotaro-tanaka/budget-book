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
