/**
 * ABA Scheduling Script
 * 
 * - Uses sheet "ABA" with columns: 
 *   [No, NAME, B, R, I, m1..m3, t1..t3, w1..w3, h1..h3, f1..f3, s1..s3, u1..u3]
 * - Prompts for month/year, builds weighted assignments, and creates three new sheets:
 *     "BIBLE READING LIST <MONTH> <YEAR>"
 *     "READING LIST <MONTH> <YEAR>"
 *     "INCENSE LIST <MONTH> <YEAR>"
 * - Provides a Reset option to restore weights.
 * - Adjusts B/R/I weights after each assignment and adds +20 at the end.
 */

const WEEK_NAMES = ['m', 't', 'w', 'h', 'f', 's', 'u']; 
const COL_INDEX = {
  No: 0, NAME: 1, B: 2, R: 3, I: 4,
  m1: 5, m2: 6, m3: 7, t1: 8, t2: 9, t3: 10,
  w1: 11, w2: 12, w3: 13, h1: 14, h2: 15, h3: 16,
  f1: 17, f2: 18, f3: 19, s1: 20, s2: 21, s3: 22,
  u1: 23, u2: 24, u3: 25
};

let m1l, m2l, m3l,
    t1l, t2l, t3l,
    w1l, w2l, w3l,
    h1l, h2l, h3l,
    f1l, f2l, f3l,
    s1l, s2l, s3l,
    u1l, u2l, u3l;
let COLUMNS_ORDERED;

/**
 * Runs when the spreadsheet is opened. Adds custom menus.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  const subMenu = ui
    .createMenu('Utilities')
    .addItem('Sorting and Numbering', 'sortByColumnBAndReNumber');

  ui.createMenu('ABA')
    .addItem('Generate Lists',        'runGenerate')
    .addItem('Generate Slides',       'generateSlidesFromSheets')
    .addItem('Download',              'Downloader')
    .addItem('Reset',                 'runReset')
    .addSubMenu(subMenu)
    .addToUi();
}

/**
 * Prompts for month/year and triggers schedule generation.
 */
function runGenerate() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt(
    'Generate ABA Schedule',
    'Enter month and year (e.g. "5 2025"):',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const txt = resp.getResponseText().trim();
  const parts = txt.split(/\s+/);
  if (parts.length !== 2) {
    ui.alert('Enter month (1–12) and year.');
    return;
  }
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  if (!(month >= 1 && month <= 12 && year > 0)) {
    ui.alert('Invalid month or year.');
    return;
  }

  try {
    generateSchedule(month, year);
    ui.alert(`✅ Finished!\nSchedule generated for ${monthName(month)} ${year}.\nCheck the new sheets.\nCreated by @oivas000.`);
  } catch (e) {
    ui.alert('❌ ERROR during schedule generation:\n' + e);
    throw e;
  }
}

/**
 * Resets all non-zero B/R/I weights back to 100.
 */
function runReset() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const aba = ss.getSheetByName('ABA');
  if (!aba) {
    ui.alert('Sheet "ABA" not found.');
    return;
  }
  const resp = ui.alert(
    'Reset Weights',
    'Reset all B, R, I weights (non-zero → 100)?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  // Load all data into memory
  const numCols = aba.getLastColumn();
  const numRows = aba.getLastRow();
  const data = aba.getRange(1, 1, numRows, numCols).getValues();

  // Adjust weights in the in-memory array
  for (let r = 1; r < numRows; r++) {
    const bVal = data[r][COL_INDEX.B];
    if (bVal !== 0 && bVal !== '' && bVal != null) data[r][COL_INDEX.B] = 100;

    const rVal = data[r][COL_INDEX.R];
    if (rVal !== 0 && rVal !== '' && rVal != null) data[r][COL_INDEX.R] = 100;

    const iVal = data[r][COL_INDEX.I];
    if (iVal !== 0 && iVal !== '' && iVal != null) data[r][COL_INDEX.I] = 100;
  }

  // Write back the entire sheet in bulk
  aba.getRange(1, 1, numRows, numCols).setValues(data);

  ui.alert('Weights reset.');
}

/**
 * Core scheduling logic using in-memory data and bulk writes.
 */
function generateSchedule(month, year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('ABA');
  if (!aba) throw new Error('Sheet "ABA" not found.');

  // Loads ABA Sheet Data Range
  const numCols = aba.getLastColumn();
  const numRows = aba.getLastRow();
  const data = aba.getRange(1, 1, numRows, numCols).getValues();

  // Build map from member ID → row index
  const noToRow = {};
  for (let r = 0; r < numRows; r++) {
    noToRow[data[r][COL_INDEX.No]] = r;
  }

  // Build month structures
  const { monthCal, monthInfo, monthDict } = buildMonthStructures(year, month);

  // Prepare ordered column names
  COLUMNS_ORDERED = [];
  for (const w of WEEK_NAMES) {
    for (let n = 1; n <= 3; n++) {
      COLUMNS_ORDERED.push(w + n);
    }
  }

  // Count how many TRUE flags per column in memory
  const columnCounts = [];
  for (const colName of COLUMNS_ORDERED) {
    const idx = COL_INDEX[colName];
    let cnt = 0;
    for (let r = 0; r < numRows; r++) {
      if (data[r][idx] === true) cnt++;
    }
    columnCounts.push({ col: colName, count: cnt });
  }
  columnCounts.sort((a, b) => a.count - b.count);
  const leastMems = columnCounts.map(obj => obj.col);

  // Initialize assignment lists
  m1l = []; m2l = []; m3l = [];
  t1l = []; t2l = []; t3l = [];
  w1l = []; w2l = []; w3l = [];
  h1l = []; h2l = []; h3l = [];
  f1l = []; f2l = []; f3l = [];
  s1l = []; s2l = []; s3l = [];
  u1l = []; u2l = []; u3l = [];
  const listsByName = {
    m1: m1l, m2: m2l, m3: m3l,
    t1: t1l, t2: t2l, t3: t3l,
    w1: w1l, w2: w2l, w3: w3l,
    h1: h1l, h2: h2l, h3: h3l,
    f1: f1l, f2: f2l, f3: f3l,
    s1: s1l, s2: s2l, s3: s3l,
    u1: u1l, u2: u2l, u3: u3l
  };

  // Perform random selection and weight updates in memory
  for (const dt of leastMems) {
    const d = dt.charAt(0);
    const t = parseInt(dt.charAt(1), 10);
    const colIdx = COL_INDEX[dt];
    const tupleMemsIds = [];
    for (let r = 0; r < numRows; r++) {
      if (data[r][colIdx] === true) {
        tupleMemsIds.push(data[r][COL_INDEX.No]);
      }
    }
    const times = weekCount(monthInfo, d);
    for (let i = 0; i < times; i++) {
      randomSelector(tupleMemsIds, d, t, data, noToRow);
    }
  }

  // Shuffle each list in memory
  Object.values(listsByName).forEach(lst => lst.sort(() => Math.random() - 0.5));

  // Build schedule and analyze frequencies
  const schedule = organizeSchedule(monthDict, listsByName, data, noToRow);
  analyzeFrequencies(schedule, data, noToRow);

  // Create CSV sheets
  writeCsvSheets(schedule, month, year);

  // Final weight increment step in memory
  for (let r = 1; r < numRows; r++) {
    const bVal = data[r][COL_INDEX.B];
    if (bVal !== 0 && bVal !== '' && bVal != null) {
      data[r][COL_INDEX.B] = bVal + 20;
    }
    const rVal = data[r][COL_INDEX.R];
    if (rVal !== 0 && rVal !== '' && rVal != null) {
      data[r][COL_INDEX.R] = rVal + 20;
    }
    const iVal = data[r][COL_INDEX.I];
    if (iVal !== 0 && iVal !== '' && iVal != null) {
      data[r][COL_INDEX.I] = iVal + 20;
    }
  }

  // Write all changes back to the sheet in bulk
  aba.getRange(1, 1, numRows, numCols).setValues(data);
}

/**
 * Builds calendar structures for the month.
 */
function buildMonthStructures(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  const monthCal = [];
  let week = [0, 0, 0, 0, 0, 0, 0];
  for (let day = 1; day <= lastDay; day++) {
    const jsDow = new Date(year, month - 1, day).getDay();
    const idx = jsDow === 0 ? 6 : jsDow - 1;
    week[idx] = day;
    if (idx === 6 || day === lastDay) {
      monthCal.push(week.slice());
      week = [0, 0, 0, 0, 0, 0, 0];
    }
  }
  const monthInfo = monthCal.map(wk =>
    wk.map((d, idx) => (d === 0 ? '' : WEEK_NAMES[idx]))
  );
  const monthDict = {};
  for (let wi = 0; wi < monthCal.length; wi++) {
    for (let i = 0; i < 7; i++) {
      const dayNum = monthCal[wi][i];
      const letter = monthInfo[wi][i];
      if (dayNum !== 0) monthDict[dayNum] = letter;
    }
  }
  return { monthCal, monthInfo, monthDict };
}

/**
 * Counts how many times a weekday letter appears.
 */
function weekCount(monthInfo, weekLetter) {
  let cnt = 0;
  for (const wk of monthInfo) {
    for (const letter of wk) {
      if (letter === weekLetter) cnt++;
    }
  }
  return cnt;
}

/**
 * Picks the highest-weighted items for B/R/I and updates weights in memory.
 */
function randomSelector(tupleMemsIds, d, t, data, noToRow) {
  const B_db_weights = tupleMemsIds.map(id => {
    const rowIdx = noToRow[id];
    return data[rowIdx][COL_INDEX.B];
  });
  const R_db_weights = tupleMemsIds.map(id => {
    const rowIdx = noToRow[id];
    return data[rowIdx][COL_INDEX.R];
  });
  const I_db_weights = tupleMemsIds.map(id => {
    const rowIdx = noToRow[id];
    return data[rowIdx][COL_INDEX.I];
  });

  const B_max = Math.max(...B_db_weights);
  const B_weightsMasked = B_db_weights.map(w => (w === B_max ? w : 0));
  let b = weightedChoice(tupleMemsIds, B_weightsMasked, data, noToRow);

  let r;
  {
    let attemptWeights = R_db_weights.slice();
    while (true) {
      const R_max = Math.max(...attemptWeights);
      const R_weightsMasked = attemptWeights.map(w => (w === R_max ? w : 0));
      r = weightedChoice(tupleMemsIds, R_weightsMasked, data, noToRow);
      if (r !== b) break;
      const idxR = tupleMemsIds.indexOf(r);
      attemptWeights[idxR] -= 10;
    }
  }

  let i;
  {
    let attemptWeights = I_db_weights.slice();
    while (true) {
      const I_max = Math.max(...attemptWeights);
      const I_weightsMasked = attemptWeights.map(w => (w === I_max ? w : 0));
      i = weightedChoice(tupleMemsIds, I_weightsMasked, data, noToRow);
      if (i !== b && i !== r) break;
      const idxI = tupleMemsIds.indexOf(i);
      attemptWeights[idxI] -= 10;
    }
  }

  const varName = d + t + 'l';
  switch (varName) {
    case 'm1l': m1l.push([b, r, i]); break;
    case 'm2l': m2l.push([b, r, i]); break;
    case 'm3l': m3l.push([b, r, i]); break;
    case 't1l': t1l.push([b, r, i]); break;
    case 't2l': t2l.push([b, r, i]); break;
    case 't3l': t3l.push([b, r, i]); break;
    case 'w1l': w1l.push([b, r, i]); break;
    case 'w2l': w2l.push([b, r, i]); break;
    case 'w3l': w3l.push([b, r, i]); break;
    case 'h1l': h1l.push([b, r, i]); break;
    case 'h2l': h2l.push([b, r, i]); break;
    case 'h3l': h3l.push([b, r, i]); break;
    case 'f1l': f1l.push([b, r, i]); break;
    case 'f2l': f2l.push([b, r, i]); break;
    case 'f3l': f3l.push([b, r, i]); break;
    case 's1l': s1l.push([b, r, i]); break;
    case 's2l': s2l.push([b, r, i]); break;
    case 's3l': s3l.push([b, r, i]); break;
    case 'u1l': u1l.push([b, r, i]); break;
    case 'u2l': u2l.push([b, r, i]); break;
    case 'u3l': u3l.push([b, r, i]); break;
    default:
      throw new Error('Unknown list: ' + varName);
  }

  // Update weights in memory
  const rowB = noToRow[b];
  data[rowB][COL_INDEX.B] += -10;
  data[rowB][COL_INDEX.R] += -5;

  const rowR = noToRow[r];
  data[rowR][COL_INDEX.R] += -10;
  data[rowR][COL_INDEX.B] += -5;

  if (t !== 1) {
    const rowI = noToRow[i];
    data[rowI][COL_INDEX.I] += -10;
  }

  return [b, r, i];
}

/**
 * Picks one item from `items[]` based on corresponding `weights[]`.
 */
function weightedChoice(items, weights) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total === 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  let r = Math.random() * total;
  let cursor = 0;
  for (let i = 0; i < items.length; i++) {
    cursor += weights[i];
    if (cursor >= r) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Builds the schedule in memory and fixes conflicts.
 */
function organizeSchedule(monthDict, listsByName, data, noToRow) {
  const schedule = {};
  const days = Object.keys(monthDict).map(d => parseInt(d, 10)).sort((a, b) => a - b);
  for (const dayNum of days) {
    const letter = monthDict[dayNum];
    const daySlots = [];
    for (let slot = 1; slot <= 3; slot++) {
      const listName = letter + slot;
      const triple = listsByName[listName].shift();
      if (!triple) throw new Error(`Missing triple for ${listName} on ${dayNum}`);
      const bName = getRealName(triple[0], data, noToRow);
      const rName = getRealName(triple[1], data, noToRow);
      const iName = getRealName(triple[2], data, noToRow);
      daySlots.push([bName, rName, iName]);
    }
    schedule[dayNum] = daySlots;
  }
  return fixSchedule(schedule);
}

/**
 * Retrieves the NAME field from memory.
 */
function getRealName(memId, data, noToRow) {
  return data[noToRow[memId]][COL_INDEX.NAME];
}

/**
 * Resolves adjacent-day conflicts in the schedule.
 */
function fixSchedule(schedule) {
  const numericSchedule = {};
  for (const [k, v] of Object.entries(schedule)) {
    const dnum = parseInt(k, 10);
    numericSchedule[dnum] = v.map(slot => [...slot]);
  }

  for (let pass = 0; pass < 20; pass++) {
    let changes = 0;
    const days = Object.keys(numericSchedule).map(x => parseInt(x, 10)).sort((a, b) => a - b);
    for (let idx = 0; idx < days.length - 1; idx++) {
      const d = days[idx];
      const nextD = days[idx + 1];
      if (nextD !== d + 1) continue;
      const tasksD = numericSchedule[d];
      const tasksNext = numericSchedule[nextD];
      const minSlots = Math.min(tasksD.length, tasksNext.length);
      for (let s = 0; s < minSlots; s++) {
        let foundSwap = false;
        for (let taskIdx = 0; taskIdx < 3; taskIdx++) {
          const personD = tasksD[s][taskIdx];
          const personN = tasksNext[s][taskIdx];
          if (personD && personD === personN) {
            const trySwapping = (baseDay, baseTasks, person) => {
              for (const offset of [7, -7, 14, -14, 21, -21, 28, -28]) {
                const target = baseDay + offset;
                if (!(target in numericSchedule)) continue;
                const targetTasks = numericSchedule[target];
                if (s >= targetTasks.length) continue;
                const other = targetTasks[s][taskIdx];
                if (!other || other === person) continue;
                const slotRowNext = tasksNext[s].slice();
                slotRowNext.splice(taskIdx, 1);
                if (slotRowNext.includes(other)) continue;
                if (tasksNext.some((row, ridx) => ridx !== s && row.includes(other))) continue;
                if (targetTasks.some((row, ridx) => ridx !== s && row.includes(person))) continue;
                if (tasksNext[s].some((name, idx2) => idx2 !== taskIdx && name === other)) continue;
                if (targetTasks[s].some((name, idx2) => idx2 !== taskIdx && name === person)) continue;
                tasksNext[s][taskIdx] = other;
                targetTasks[s][taskIdx] = person;
                return true;
              }
              return false;
            };

            if (trySwapping(nextD, tasksNext, personN)) {
              foundSwap = true;
              changes++;
              break;
            }
            if (trySwapping(d, tasksD, personD)) {
              foundSwap = true;
              changes++;
              break;
            }
          }
        }
        if (foundSwap) continue;
      }
    }
    if (changes === 0) break;
  }

  const newSchedule = {};
  for (const [dStr, slots] of Object.entries(numericSchedule)) {
    newSchedule[parseInt(dStr, 10)] = slots.map(slot => [...slot]);
  }
  return newSchedule;
}

/**
 * Analyzes assignment frequencies and logs results.
 */
function analyzeFrequencies(schedule, data, noToRow) {
  const bNames = [];
  const rNames = [];
  const iNames = [];
  for (const day of Object.keys(schedule).map(x => parseInt(x, 10)).sort((a, b) => a - b)) {
    const slots = schedule[day];
    for (const trio of slots) {
      bNames.push(trio[0]);
      rNames.push(trio[1]);
      iNames.push(trio[2]);
    }
  }
  const buildCounter = arr => {
    const ctr = {};
    for (const x of arr) {
      ctr[x] = (ctr[x] || 0) + 1;
    }
    return ctr;
  };
  const bCounter = buildCounter(bNames);
  const rCounter = buildCounter(rNames);
  const iCounter = buildCounter(iNames);
  const allNames = data
    .slice(1)
    .map(row => row[COL_INDEX.NAME])
    .filter(n => n != null && n.toString().trim() !== '');
  const missingFast = ctr => allNames.filter(n => !(n in ctr));
  const missingInB = missingFast(bCounter);
  const missingInR = missingFast(rCounter);
  const missingInI = missingFast(iCounter);
  const getMostCommon = (ctr, top = 10) =>
    Object.entries(ctr).sort((a, b) => b[1] - a[1]).slice(0, top);
  const getLeastCommon = (ctr, top = 10) =>
    Object.entries(ctr).sort((a, b) => a[1] - b[1]).slice(0, top);

  Logger.log('--- Frequencies ---');
  Logger.log('Top 10 in Bible Reading:');
  getMostCommon(bCounter).forEach(([name, cnt]) => Logger.log(`  ${name} (${cnt})`));
  Logger.log('Least 10 in Bible Reading:');
  getLeastCommon(bCounter).forEach(([name, cnt]) => Logger.log(`  ${name} (${cnt})`));
  Logger.log('Missing in Bible Reading:');
  missingInB.length
    ? missingInB.forEach(n => Logger.log(`  ${n}`))
    : Logger.log('  None');

  Logger.log('Top 10 in Reading:');
  getMostCommon(rCounter).forEach(([name, cnt]) => Logger.log(`  ${name} (${cnt})`));
  Logger.log('Least 10 in Reading:');
  getLeastCommon(rCounter).forEach(([name, cnt]) => Logger.log(`  ${name} (${cnt})`));
  Logger.log('Missing in Reading:');
  missingInR.length
    ? missingInR.forEach(n => Logger.log(`  ${n}`))
    : Logger.log('  None');

  Logger.log('Top 10 in Incense:');
  getMostCommon(iCounter).forEach(([name, cnt]) => Logger.log(`  ${name} (${cnt})`));
  Logger.log('Least 10 in Incense:');
  getLeastCommon(iCounter).forEach(([name, cnt]) => Logger.log(`  ${name} (${cnt})`));
  Logger.log('Missing in Incense:');
  missingInI.length
    ? missingInI.forEach(n => Logger.log(`  ${n}`))
    : Logger.log('  None');
}

/**
 * Returns full month name from month number.
 */
function monthName(month) {
  return new Date(2020, month - 1, 1).toLocaleString('default', { month: 'long' });
}

/**
 * Creates three schedule sheets and populates them with assignment data.
 */
function writeCsvSheets(schedule, month, year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const mName = monthName(month).toUpperCase();
  const brSheetName = `BIBLE READING LIST ${mName} ${year}`;
  const rSheetName = `READING LIST ${mName} ${year}`;
  const iSheetName = `INCENSE LIST ${mName} ${year}`;

  [brSheetName, rSheetName, iSheetName].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (sh) ss.deleteSheet(sh);
  });

  const brSheet = ss.insertSheet(brSheetName);
  const rSheet = ss.insertSheet(rSheetName);
  const iSheet = ss.insertSheet(iSheetName);

  const headerRow1_BR = [`ABA BIBLE READING LIST ${mName} ${year}`, '', '', ''];
  const headerRow2 = ['DATE', '6:00 am', '7:30 am', '5:00 pm'];
  const footerRow = ['', 'p : PRESENT', 'a : ABSENT', 'c : CHANGED'];

  brSheet.getRange(1, 1, 1, 4).setValues([headerRow1_BR]);
  brSheet.getRange(2, 1, 1, 4).setNumberFormat('@STRING@').setValues([headerRow2]);

  const headerRow1_R = [`ABA READING LIST ${mName} ${year}`, '', '', ''];
  rSheet.getRange(1, 1, 1, 4).setValues([headerRow1_R]);
  rSheet.getRange(2, 1, 1, 4).setNumberFormat('@STRING@').setValues([headerRow2]);

  const headerRow1_I = [`ABA INCENSE LIST ${mName} ${year}`, '', '', ''];
  iSheet.getRange(1, 1, 1, 4).setValues([headerRow1_I]);
  iSheet.getRange(2, 1, 1, 4).setNumberFormat('@STRING@').setValues([headerRow2]);

  const days = Object.keys(schedule).map(d => parseInt(d, 10)).sort((a, b) => a - b);
  const numRows = days.length;
  const brValues = [];
  const rValues = [];
  const iValues = [];
  for (let idx = 0; idx < days.length; idx++) {
    const day = days[idx];
    const slots = schedule[day];
    const dateStr = day.toString();
    brValues.push([dateStr, slots[0][0], slots[1][0], slots[2][0]]);
    rValues.push([dateStr, slots[0][1], slots[1][1], slots[2][1]]);
    iValues.push([dateStr, slots[0][2], slots[1][2], slots[2][2]]);
  }

  if (numRows > 0) {
    brSheet.getRange(3, 1, numRows, 4).setValues(brValues);
    brSheet.getRange(numRows + 3, 1, 1, 4).setValues([footerRow]);
    rSheet.getRange(3, 1, numRows, 4).setValues(rValues);
    rSheet.getRange(numRows + 3, 1, 1, 4).setValues([footerRow]);
    iSheet.getRange(3, 1, numRows, 4).setValues(iValues);
  }

  copyFormatOnly(numRows.toString(), brSheetName);
  copyFormatOnly(numRows.toString(), rSheetName);
  copyFormatOnly(numRows.toString(), iSheetName);
  iSheet.deleteColumn(2);
  iSheet.getRange(numRows + 3, 1, 1, 3).setValues([['', 'p : PRESENT              a : ABSENT', '          c : CHANGED']]);
  iSheet.setColumnWidths(2, 2, 300);
}
