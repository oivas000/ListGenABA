function Downloader() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const ssId = ss.getId();
  const sheetId = sheet.getSheetId();
  const sheetName = sheet.getName();

  // Choose side margin based on sheet name
  let side_width;
  if (sheetName.indexOf("INCENSE") !== -1) {
    side_width = 2.5 / 2.54;
  } else {
    side_width = 1.28 / 2.54;
  }

  const base = "https://docs.google.com/spreadsheets/d/" + ssId + "/export";
  const urlParams = [
    "exportFormat=pdf",
    "format=pdf",
    "gid=" + sheetId,
    "size=A4",
    "portrait=true",
    "fitw=true",
    "top_margin=" + 0.8 / 2.54,
    "bottom_margin=" + 0.5 / 2.54,
    "left_margin=" + side_width,
    "right_margin=" + side_width,
    "gridlines=false",
    "printtitle=false",
    "sheetnames=false",
    "pagenumbers=false",
    "horizontal_alignment=CENTER", // center horizontally
    "vertical_alignment=TOP"       // align to top
  ];
  const exportUrl = base + "?" + urlParams.join("&");

  // Load the HTML template
  const template = HtmlService.createTemplateFromFile("downloading");
  // Insert the export URL
  template.exportUrl = exportUrl;
  const html = template
    .evaluate()
    .setWidth(10)
    .setHeight(10)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);

  // Show a modeless dialog for download
  SpreadsheetApp.getUi().showModelessDialog(
    html,
    "Downloading... allow the pop-up! & try again, if not downloaded.   "
  );
}
