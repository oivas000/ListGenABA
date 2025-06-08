function generateSlidesFromSheets() {
  // ① Configuration
  var TEMPLATE_ID    = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // Replace with your Slides template ID
  var DATA_START_ROW = 3;          // data starts in row 3, columns A–D
  var PREFIX_BIBLE   = 'BIBLE READING LIST ';
  var PREFIX_READING = 'READING LIST ';
  var PREFIX_INCENSE = 'INCENSE LIST ';

  // ② Verify template exists
  var templateFile;
  try {
    templateFile = DriveApp.getFileById(TEMPLATE_ID);
    Logger.log('ℹ️ Template found: ' + TEMPLATE_ID);
  } catch (e) {
    var errMsg = '❌ ERROR: Template not found: ' + TEMPLATE_ID + '\n    ' + e;
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }

  // ③ Find this spreadsheet’s folder
  var ss   = SpreadsheetApp.getActiveSpreadsheet();
  var ssId = ss.getId();
  var ssFile;
  try {
    ssFile = DriveApp.getFileById(ssId);
  } catch (e) {
    var errMsg = '❌ ERROR: Cannot access spreadsheet file: ' + ssId + '\n    ' + e;
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  var parents = ssFile.getParents();
  if (!parents.hasNext()) {
    var errMsg = '❌ ERROR: Spreadsheet not in a folder.';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  var destFolder = parents.next();
  Logger.log('ℹ️ Destination folder: ' + destFolder.getName());

  // ④ Find the oldest sheet starting with PREFIX_BIBLE
  var allSheets = ss.getSheets();
  var bibleSheet     = null;
  var lowestSheetIdx = Number.MAX_SAFE_INTEGER;
  for (var i = 0; i < allSheets.length; i++) {
    var sh = allSheets[i];
    var name = sh.getName();
    if (name.indexOf(PREFIX_BIBLE) === 0) {
      var idx = sh.getIndex();
      if (idx < lowestSheetIdx) {
        lowestSheetIdx = idx;
        bibleSheet = sh;
      }
    }
  }
  if (!bibleSheet) {
    var errMsg = '❌ ERROR: No sheet named with "' + PREFIX_BIBLE + '".';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  Logger.log('ℹ️ Using BIBLE sheet: ' + bibleSheet.getName());

  // Extract month and year
  var bibleNameParts = bibleSheet.getName().split(' ');
  if (bibleNameParts.length < 2) {
    var errMsg = '❌ ERROR: Unexpected sheet name: ' + bibleSheet.getName();
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  var rawMonthToken = bibleNameParts[bibleNameParts.length - 2];
  var rawYearToken  = bibleNameParts[bibleNameParts.length - 1];
  var monthToken = rawMonthToken.charAt(0).toUpperCase() +
                   rawMonthToken.slice(1).toLowerCase();
  var yearToken  = rawYearToken;
  Logger.log('ℹ️ Parsed: ' + monthToken + ' ' + yearToken);

  // Build names for other sheets
  var readingSheetName = PREFIX_READING + monthToken + ' ' + yearToken;
  var incenseSheetName = PREFIX_INCENSE + monthToken + ' ' + yearToken;

  // ⑤ Find Reading sheet
  var readingSheet = ss.getSheetByName(readingSheetName);
  if (!readingSheet) {
    var errMsg = '❌ ERROR: No sheet named "' + readingSheetName + '".';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  Logger.log('ℹ️ Found READING sheet: ' + readingSheetName);

  // ⑥ Find Incense sheet
  var incenseSheet = ss.getSheetByName(incenseSheetName);
  if (!incenseSheet) {
    var errMsg = '❌ ERROR: No sheet named "' + incenseSheetName + '".';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  Logger.log('ℹ️ Found INCENSE sheet: ' + incenseSheetName);

  // ⑦ Prepare sheet info array
  var sheetInfo = [
    { token: 'BIBLE',   sheet: bibleSheet },
    { token: 'READING', sheet: readingSheet },
    { token: 'INCENSE', sheet: incenseSheet }
  ];

  // ⑧ Convert month/year to numbers
  var monthMap = {
    'January':   0,  'February':  1, 'March':     2,
    'April':     3,  'May':       4, 'June':      5,
    'July':      6,  'August':    7, 'September': 8,
    'October':   9,  'November': 10, 'December':  11
  };
  var monthIndex = monthMap[monthToken];
  var yearInt    = parseInt(yearToken, 10);
  if (monthIndex === undefined || isNaN(yearInt)) {
    var errMsg = '❌ ERROR: Could not parse month/year from "' +
                 bibleSheet.getName() + '".';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  Logger.log('ℹ️ monthIndex/yearInt: ' + monthIndex + '/' + yearInt);

  // ⑨ Count data rows in each sheet
  function countDataRowsFromRow3(sheetObj) {
    var count = 0;
    while (true) {
      var rowIndex = DATA_START_ROW + count;
      var values   = sheetObj.getRange(rowIndex, 1, 1, 4).getValues()[0];
      var allBlank = values.every(function(cell) {
        return cell === '' || cell === null || cell === undefined;
      });
      if (allBlank) break;
      count++;
    }
    return count;
  }

  var dataRowCounts = sheetInfo.map(function(info) {
    try {
      var cnt = countDataRowsFromRow3(info.sheet);
      Logger.log('ℹ️ Rows in "' + info.sheet.getName() + '": ' + cnt);
      return cnt;
    } catch (e) {
      var warnMsg = '⚠️ WARNING: Cannot count rows in "' +
                    info.sheet.getName() + '": ' + e;
      Logger.log(warnMsg);
      SpreadsheetApp.getUi().alert(warnMsg);
      return 0;
    }
  });
  var M = Math.min.apply(null, dataRowCounts);
  if (M <= 0) {
    var errMsg = '❌ ERROR: At least one sheet has no data starting at row ' +
                 DATA_START_ROW + '.';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  Logger.log('ℹ️ Generating for M = ' + M + ' days.');

  // ⑩ Copy the Slides template
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  var deckName  = 'ABA POSTERS ' + monthToken.toUpperCase() + ' ' + yearToken + ' ' + timestamp;
  var deckFile  = templateFile.makeCopy(deckName, destFolder);
  var deckId    = deckFile.getId();
  Logger.log('ℹ️ Copied template as: "' + deckName + '" (ID: ' + deckId + ')');

  // ⑪ Open the new presentation
  var presentation;
  try {
    presentation = SlidesApp.openById(deckId);
  } catch (e) {
    var errMsg = '❌ ERROR: Cannot open presentation: ' + deckId + '\n    ' + e;
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  var placeholderSlides = presentation.getSlides();
  var N = placeholderSlides.length;
  if (N < 1) {
    var errMsg = '❌ ERROR: No slides in template.';
    Logger.log(errMsg);
    SpreadsheetApp.getUi().alert(errMsg);
    return;
  }
  Logger.log('ℹ️ Placeholder slides count: ' + N);

  // ⑫ Loop through each day
  for (var dayIndex = 1; dayIndex < M; dayIndex++) {
    var sheetRow = DATA_START_ROW + dayIndex - 1;

    // Read data for each token
    var rowDataMap = {};
    sheetInfo.forEach(function(info) {
      var values;
      try {
        values = info.sheet.getRange(sheetRow, 1, 1, 4).getValues()[0];
      } catch (e) {
        var warnMsg = '⚠️ WARNING: Cannot read row ' +
                      sheetRow + ' from "' + info.sheet.getName() + '": ' + e;
        Logger.log(warnMsg);
        SpreadsheetApp.getUi().alert(warnMsg);
        values = ['', '', '', ''];
      }
      for (var c = 0; c < 4; c++) {
        if (values[c] === null || values[c] === undefined) {
          values[c] = '';
        }
      }
      rowDataMap[info.token] = values;
    });

    // Determine day value
    var dayVal = parseInt(rowDataMap['BIBLE'][0], 10);
    if (isNaN(dayVal)) {
      dayVal = parseInt(rowDataMap['READING'][0], 10);
    }
    if (isNaN(dayVal)) {
      dayVal = parseInt(rowDataMap['INCENSE'][0], 10);
    }
    if (isNaN(dayVal)) {
      dayVal = 1;
    }

    // Compute weekday
    var thisDate = new Date(yearInt, monthIndex, dayVal);
    var weekday = Utilities.formatDate(
      thisDate,
      Session.getScriptTimeZone(),
      'EEEE'
    );
    Logger.log('ℹ️ dayIndex=' + dayIndex + ', dayVal=' + dayVal + ', weekday=' + weekday);

    // Duplicate and fill slides
    placeholderSlides.forEach(function(placeholderSl) {
      var newSlide = placeholderSl.duplicate();
      fillPlaceholdersOnSlide(newSlide, rowDataMap, sheetInfo);
      newSlide.replaceAllText('{{WEEKDAY}}', weekday.toUpperCase());
      newSlide.replaceAllText('{{MONTH}}',   monthToken.toUpperCase());
      newSlide.replaceAllText('{{YEAR}}',    yearToken);
    });
  }

  // ⑬ Remove original placeholders
  for (var i = placeholderSlides.length - 1; i >= 0; i--) {
    placeholderSlides[i].remove();
  }
  Logger.log('ℹ️ Removed ' + N + ' placeholder slides.');

  // ⑭ Save and finish
  presentation.saveAndClose();
  var successMsg = '✅ Done!\nCreated "' +
                   deckName +
                   '" with ' +
                   (N * M) +
                   ' slides in folder: ' +
                   destFolder.getName()  +
                   '.\nCreated by @oivas000.';
  Logger.log(successMsg);
  SpreadsheetApp.getUi().alert(successMsg);
}

/**
 * Fill placeholders {{TOKEN_A}} … {{TOKEN_D}} on one slide.
 * rowDataMap[token] → [A, B, C, D]
 */
function fillPlaceholdersOnSlide(slide, rowDataMap, sheetInfo) {
  sheetInfo.forEach(function(info) {
    var token = info.token;
    var vals  = rowDataMap[token];
    try {
      slide.replaceAllText('{{' + token + '_A}}', vals[0]);
      slide.replaceAllText('{{' + token + '_B}}', vals[1]);
      slide.replaceAllText('{{' + token + '_C}}', vals[2]);
      slide.replaceAllText('{{' + token + '_D}}', vals[3]);
    } catch (e) {
      var warnMsg = '⚠️ WARNING: replaceAllText failed for token "' +
                    token + '" on slide ID "' +
                    slide.getObjectId() + '": ' + e;
      Logger.log(warnMsg);
      SpreadsheetApp.getUi().alert(warnMsg);
    }
  });
}
