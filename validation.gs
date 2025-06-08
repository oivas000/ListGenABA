function onEdit(e) {
  // 1) Grab the edited range and sheet
  const sheet = e.range.getSheet();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  const newValue = e.range.getValue();

  // 2) Only proceed if the edited cell is:
  //    • On the sheet you care about (e.g. "Sheet1"), 
  //    • In row ≥ 2 (skip headers),
  //    • In column ≥ 6 (column F),
  //    • And its new value is TRUE (user just checked it).
  if (
    sheet.getName() !== "ABA" ||  // ← change "Sheet1" to your sheet’s name
    row < 2 ||
    col < 6 ||
    newValue !== true
  ) {
    return;
  }

  // 3) Compute which 3-column block this cell belongs to.
  //    Col 6 is F, 7 is G, 8 is H, 9 is I, etc.
  const blockIndex = Math.floor((col - 6) / 3);
  const startCol = 6 + blockIndex * 3;    // e.g. blockIndex=0 → startCol=6 (F); blockIndex=1 → startCol=9 (I).

  // 4) Read the entire 3-cell block for this same row
  const blockRange = sheet.getRange(row, startCol, 1, 3);
  const blockValues = blockRange.getValues()[0];  // e.g. [true, false, false] or [true,true,false], etc.

  // 5) Count how many checkboxes are TRUE in those 3 cells
  let trueCount = 0;
  for (let i = 0; i < 3; i++) {
    if (blockValues[i] === true) trueCount++;
  }

  // 6) If more than 1 box is now checked, immediately uncheck the one the user just tried to check:
  if (trueCount > 1) {
    // Revert this edit (so the user cannot have 2 trues in that block)
    e.range.setValue(false);
    
    // Optionally show an alert once (you can remove this if you don’t want popups)
    SpreadsheetApp.getUi().alert(
      "Only one Holy Mass on the same day."
      //Only one checkbox may be checked per each 3-column group (e.g. F–H, I–K, L–N).
    );
  }
}

/**
 * Sort rows 2→lastDataRow by column B (A→Z), then
 * fill column A with serials 1001,1002,… up to lastDataRow.
 *
 * - It only considers “data” up through the last row where column B is non-empty.
 * - Rows where B is blank are treated as “empty” (even if there are checkboxes elsewhere).
 */
function sortByColumnBAndReNumber() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ABA"); // ← change "ABA" if your sheet is named differently
  if (!sheet) return;

  // 1) Determine the last row in column B that has any value.
  //    We read all of column B, scan from the bottom up.
  const colBvals = sheet.getRange("B:B").getValues();
  let lastDataRow = 1;
  for (let i = colBvals.length - 1; i >= 1; i--) {
    if (colBvals[i][0] !== "" && colBvals[i][0] !== null) {
      lastDataRow = i + 1;
      break;
    }
  }

  // If there’s no data below row 1, nothing to sort/number.
  if (lastDataRow < 2) return;

  // 2) Sort rows 2→lastDataRow by column 2 (B). 
  //    We take every column from A→<lastColumn> in that block.
  const lastCol = sheet.getLastColumn();
  sheet
    .getRange(2, 1, lastDataRow - 1, lastCol)
    .sort({ column: 2, ascending: true });

  // 3) Re-fill column A from row 2→lastDataRow with serials 1001,1002,1003,…
  const numRows = lastDataRow - 1; // e.g. if lastDataRow=10, we have rows 2→10 → 9 rows
  const serials = [];
  for (let r = 2; r <= lastDataRow; r++) {
    serials.push([r + 999]); // row 2→1001, row 3→1002, etc.
  }
  sheet.getRange(2, 1, numRows, 1).setValues(serials);
}