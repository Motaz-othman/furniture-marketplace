/**
 * Convert an uploaded file buffer (Excel or CSV) to a CSV string.
 *
 * If the file is already CSV, it is returned as-is.
 * If it is an Excel workbook (.xlsx / .xls), the first sheet is exported
 * as CSV using SheetJS so the adapters receive a consistent format.
 */

import * as XLSX from 'xlsx';

/**
 * @param {Buffer} buffer   - raw file buffer from multer
 * @param {string} filename - original filename, used to detect Excel vs CSV
 * @returns {Buffer}        - CSV buffer ready for csv-parse
 */
export function toCSVBuffer(buffer, filename = '') {
  const ext = filename.split('.').pop().toLowerCase();

  if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet, { blankrows: false });
    return Buffer.from(csv, 'utf8');
  }

  // Already CSV — pass through unchanged
  return buffer;
}
