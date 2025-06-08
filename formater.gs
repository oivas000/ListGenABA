/**
 * copyFormatOnly
 *
 * Copies formatting (cell formats, column widths, row heights) from a sheet in another spreadsheet
 * into a target sheet in the active spreadsheet. Does this by:
 *  1. Copying the source sheet into the destination as a temp sheet.
 *  2. Copying formats from the temp sheet to the real target sheet.
 *  3. Using the Advanced Sheets service to batch‐apply column widths and row heights.
 *  4. Deleting the temp sheet.
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

  // 8) Use Advanced Sheets service to batch‐apply column widths and row heights
  var spreadsheetId = destSS.getId();
  //var sourceSid = tempCopiedSheet.getSheetId();
  var destSid   = destSheet.getSheetId();

  // Gather column widths from temp sheet
  var colWidths = [];
  for (var c = 1; c <= numCols; c++) {
    colWidths.push(tempCopiedSheet.getColumnWidth(c));
  }
  // Gather row heights from temp sheet
  var rowHeights = [];
  for (var r = 1; r <= numRows; r++) {
    rowHeights.push(tempCopiedSheet.getRowHeight(r));
  }

  // Build batchUpdate requests
  var requests = [];
  //   a) Column width requests
  colWidths.forEach(function(width, index) {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: destSid,
          dimension: 'COLUMNS',
          startIndex: index,
          endIndex: index + 1
        },
        properties: { pixelSize: width },
        fields: 'pixelSize'
      }
    });
  });
  //   b) Row height requests
  rowHeights.forEach(function(height, index) {
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: destSid,
          dimension: 'ROWS',
          startIndex: index,
          endIndex: index + 1
        },
        properties: { pixelSize: height },
        fields: 'pixelSize'
      }
    });
  });

  // Execute batchUpdate in one call
  Sheets.Spreadsheets.batchUpdate({ requests: requests }, spreadsheetId);

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
