// Step-by-step CSV export guides for each broker
// These help non-technical users export their holdings

export interface ExportGuide {
  broker: string;
  steps: string[];
  tip?: string;
}

export const CSV_EXPORT_GUIDES: Record<string, ExportGuide> = {
  zerodha: {
    broker: 'Zerodha',
    steps: [
      'Open Kite app or kite.zerodha.com',
      'Go to Portfolio → Holdings',
      'Click the download icon (⬇) at the top right',
      'Select "Download as CSV"',
      'Upload the downloaded file here',
    ],
    tip: 'You can also go to Console → Holdings → Download',
  },
  groww: {
    broker: 'Groww',
    steps: [
      'Open Groww app or groww.in',
      'Go to Stocks → Your holdings',
      'Tap the ⋮ menu at the top right',
      'Select "Download Statement" or "Export"',
      'Choose CSV format and download',
      'Upload the downloaded file here',
    ],
    tip: 'If export is not available in the app, try the web version at groww.in',
  },
  upstox: {
    broker: 'Upstox',
    steps: [
      'Open Upstox app or pro.upstox.com',
      'Go to Portfolio → Holdings',
      'Click the download/export button',
      'Download as CSV',
      'Upload the downloaded file here',
    ],
  },
  angelone: {
    broker: 'Angel One',
    steps: [
      'Open Angel One app or angelone.in',
      'Go to Portfolio → Holdings',
      'Tap on "Download" or export icon',
      'Select CSV format',
      'Upload the downloaded file here',
    ],
  },
  fyers: {
    broker: 'FYERS',
    steps: [
      'Login to FYERS web platform',
      'Go to Portfolio → Holdings',
      'Click the Export/Download button',
      'Download as CSV',
      'Upload the downloaded file here',
    ],
  },
  '5paisa': {
    broker: '5paisa',
    steps: [
      'Open 5paisa app or trade.5paisa.com',
      'Go to Portfolio → My Holdings',
      'Click "Download" at the top',
      'Select CSV format',
      'Upload the downloaded file here',
    ],
  },
  dhan: {
    broker: 'Dhan',
    steps: [
      'Open Dhan app or web.dhan.co',
      'Go to Portfolio → Holdings',
      'Click the export icon at top right',
      'Download as CSV',
      'Upload the downloaded file here',
    ],
  },
  kotak: {
    broker: 'Kotak Securities',
    steps: [
      'Login to Kotak Neo or kotaksecurities.com',
      'Go to Portfolio → Holdings/Positions',
      'Click "Export" or download icon',
      'Download as CSV or Excel',
      'Upload the downloaded file here',
    ],
    tip: 'If you download Excel, save it as CSV first',
  },
  icici: {
    broker: 'ICICI Direct',
    steps: [
      'Login to icicidirect.com',
      'Go to Portfolio → Equity Holdings',
      'Click "Download" at the bottom of the page',
      'Select CSV format',
      'Upload the downloaded file here',
    ],
  },
  hdfc: {
    broker: 'HDFC Securities',
    steps: [
      'Login to hdfcsec.com',
      'Go to Portfolio → Holdings',
      'Click the download/export option',
      'Download as CSV',
      'Upload the downloaded file here',
    ],
  },
  motilal: {
    broker: 'Motilal Oswal',
    steps: [
      'Login to motilaloswalonline.com',
      'Go to Portfolio → Holdings',
      'Click "Export to Excel/CSV"',
      'Upload the downloaded file here',
    ],
  },
  sharekhan: {
    broker: 'Sharekhan',
    steps: [
      'Login to sharekhan.com or Trade Tiger',
      'Go to Portfolio → Holdings',
      'Click "Export" button',
      'Download as CSV',
      'Upload the downloaded file here',
    ],
  },
  paytm: {
    broker: 'Paytm Money',
    steps: [
      'Open Paytm Money app',
      'Go to Stocks → Holdings',
      'Tap the share/export icon',
      'Download as CSV or statement',
      'Upload the downloaded file here',
    ],
    tip: 'If direct CSV is unavailable, download the holding statement and upload it',
  },
};
