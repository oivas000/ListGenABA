/**
 * copyFormatOnly
 *
 * Copies formatting (cell formats, column widths, row heights) from a sheet in another spreadsheet
 * into a target sheet in the active spreadsheet. Does this by:
 *  1. Copying the source sheet into the destination as a temp sheet.
 *  2. Copying formats from the temp sheet to the real target sheet.
 *  3. Deleting the temp sheet.
 *
 * @param {string} sourceSheetName – Name of the sheet in the source spreadsheet.
 * @param {string} targetSheetName – Name of the sheet in the active spreadsheet.
 */
function copyFormatOnly(sourceSheetName, targetSheetName) {
  // === 1) SOURCE SPREADSHEET ID ===
  var SOURCE_SPREADSHEET_ID = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Replace with your source spreadsheet ID

  // 2) Open source spreadsheet and sheet
  var sourceSS = SpreadsheetApp.openById(SOURCE_SPREADSHEET_ID);
  if (!sourceSS) {
    throw new Error('Cannot open source spreadsheet. Check the ID: ' + SOURCE_SPREADSHEET_ID);
  }
  var sourceSheet = sourceSS.getSheetByName(sourceSheetName);
  if (!sourceSheet) {
    throw new Error('Source sheet not found: ' + sourceSheetName);
  }

  // 3) Open active spreadsheet and find target sheet
  var destSS = SpreadsheetApp.getActiveSpreadsheet();
  if (!destSS) {
    throw new Error('Cannot open active spreadsheet.');
  }
  var destSheet = destSS.getSheetByName(targetSheetName);
  if (!destSheet) {
    throw new Error('Target sheet not found: ' + targetSheetName);
  }

  // 4) Copy source sheet into destination as temp sheet
  var tempCopiedSheet = sourceSheet.copyTo(destSS);

  // 5) Get data range on temp sheet
  var tempRange = tempCopiedSheet.getDataRange();
  var numRows = tempRange.getNumRows();
  var numCols = tempRange.getNumColumns();

  // 6) Ensure target sheet has enough rows and columns
  var destMaxRows = destSheet.getMaxRows();
  var destMaxCols = destSheet.getMaxColumns();
  if (destMaxRows < numRows) {
    destSheet.insertRowsAfter(destMaxRows, numRows - destMaxRows);
  }
  if (destMaxCols < numCols) {
    destSheet.insertColumnsAfter(destMaxCols, numCols - destMaxCols);
  }

  // 7) Copy formatting only from temp sheet to target sheet
  var destRange = destSheet.getRange(1, 1, numRows, numCols);
  tempRange.copyTo(destRange, { formatOnly: true });

  // 8) Copy column widths
  for (var col = 1; col <= numCols; col++) {
    var width = tempCopiedSheet.getColumnWidth(col);
    destSheet.setColumnWidth(col, width);
  }
  // Copy row heights
  for (var row = 1; row <= numRows; row++) {
    var height = tempCopiedSheet.getRowHeight(row);
    destSheet.setRowHeight(row, height);
  }

  // 9) Delete the temporary sheet
  destSS.deleteSheet(tempCopiedSheet);

  // 10) Log success
  Logger.log(
    'Formatting copied from "' +
    sourceSheetName +
    '" to "' +
    targetSheetName +
    '".'
  );
}
