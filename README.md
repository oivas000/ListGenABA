# ABA Scheduler & Export Tools
Created by @oivas000. A Google Appscript to generate a schedule from a Google sheet for a custom purpose.

A collection of Google Apps Script functions to:

- Generate weighted schedules (Bible Reading, Reading, Incense) in Google Sheets
- Export sheets as formatted PDFs via a downloader dialog
- Create slide decks from the generated schedules

## Overview

This repository contains three main scripts:

1. **Scheduling Script**  
   - Reads member data and availability from an “ABA” sheet.
   - Builds a weighted assignment schedule for each day of a given month/year.
   - Creates three new sheets:  
     - `BIBLE READING LIST <MONTH> <YEAR>`  
     - `READING LIST <MONTH> <YEAR>`  
     - `INCENSE LIST <MONTH> <YEAR>`
   - Adjusts member weights after each assignment and provides a reset function.

2. **Slide Generation (generateSlidesFromSheets)**  
   - Uses a Slides template to create a poster deck based on the three schedule sheets.
   - Duplicates placeholder slides and fills in data (day, names, etc.) for each date.
   - Saves the new presentation in the same Drive folder as the spreadsheet.

3. **Downloader (Downloader)**  
   - Exports the active sheet as a PDF with predefined margins and formatting.
   - Opens a small modeless dialog prompting the browser to download the file.

4. **Format Copier (copyFormatOnly)**  
   - Copies formatting (cell styles, column widths, row heights) from a sheet in another spreadsheet.
   - Works by copying the source sheet into the destination, transferring formats, then deleting the temporary sheet.

## Setup

1. Open your Google Sheet.  
2. Go to **Extensions → Apps Script**.  
3. Copy and paste each `.gs` file into the script editor (or create new files with the same names and contents).  
4. Save and reload the spreadsheet.

## Usage

- **OnOpen Menu**  
  After reloading, a custom menu named **ABA** will appear with options:  
  - **Generate Lists**  
  - **Generate Slides**  
  - **Download**  
  - **Reset**
  - **Utilities**

- **Generate Lists**  
  1. Click **ABA → Generate Lists**.  
  2. Enter the month and year (e.g. `5 2025`).  
  3. The script builds the assignment sheets and updates member weights.

- **Generate Slides**  
  1. Ensure you have a Slides template (ID configured in the script).  
  2. Click **ABA → Generate Slides**.  
  3. The script copies the template into your Drive folder and populates slides for each day.

- **Download**  
  1. Select a sheet (any schedule sheet).  
  2. Click **ABA → Download**.  
  3. A small dialog appears—allow pop-ups and wait for the PDF to download automatically.

- **Reset**  
  1. Click **ABA → Reset**.  
  2. All non-zero B/R/I weights return to 100, preserving zeros.

- **Utilities [SubMenus]**
  1. **Sorting and Numbering** - Sort the NAME column in ascending order and add serial numbers in the first column.

## Configuration

- **Template ID** (`generateSlidesFromSheets`)  
  Set `TEMPLATE_ID` to your Google Slides template’s file ID.  
- **Source Spreadsheet ID** (`copyFormatOnly`)  
  Set `SOURCE_SPREADSHEET_ID` to the ID of the spreadsheet you wish to copy formatting from.

## License

This repository is provided “as-is” under the MIT License. See LICENSE for details.
