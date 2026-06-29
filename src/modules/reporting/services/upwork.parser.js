import ExcelJS from 'exceljs';

/**
 * Classify a single Upwork transaction row into a category.
 */
export function classify_transaction(row) {
  const rawType = String(row.Type || row.type || row['Transaction Type'] || '').toLowerCase();
  const desc = String(row.Description || row.description || row.Title || row.Memo || '').toLowerCase();
  const amount = parseFloat(String(row.Amount || row.amount || row.Debit || row.Credit || '0').replace(/[^0-9.\-]/g, '')) || 0;

  if (rawType.includes('service fee') || desc.includes('service fee')) return 'SERVICE_FEE';
  if (rawType.includes('membership') || rawType.includes('subscription') || desc.includes('subscription') || desc.includes('membership')) return 'SUBSCRIPTION';
  if (rawType.includes('connect') || desc.includes('connect')) return 'CONNECTS';
  if (rawType.includes('tax') || rawType.includes('vat') || desc.includes('tax withhold') || desc.includes('vat')) return 'TAX';
  if (rawType.includes('withdrawal') || desc.includes('withdrawal') || desc.includes('wire transfer')) return 'WITHDRAWAL';
  if (rawType.includes('refund') || desc.includes('refund')) return 'REFUND';
  if (rawType.includes('bonus') || desc.includes('bonus')) return 'BONUS';
  if (rawType.includes('credit card') || rawType.includes('card charge') || desc.includes('payment method')) return 'CARD_PAYMENT';
  if (rawType.includes('id verif') || desc.includes('id verif') || desc.includes('identity')) return 'ID_FEE';
  if (rawType.includes('review') || desc.includes('review')) return 'REVIEW';
  if (rawType.includes('fixed') || rawType.includes('hourly') || rawType.includes('milestone') ||
      rawType.includes('contract') || desc.includes('fixed price') || desc.includes('hourly contract') ||
      (amount > 0 && rawType !== '')) return 'EARNINGS';
  return 'OTHER';
}

export function parse_csv_text(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseRow(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = parseRow(line);
    const row = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] !== undefined ? vals[idx] : ''; });
    if (Object.values(row).some(v => v !== '')) rows.push(row);
  }

  return rows;
}

export async function parse_xlsx_buffer(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows = [];
  const headers = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => { headers[colNumber] = String(cell.value ?? ''); });
    } else {
      const obj = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        obj[headers[colNumber] || colNumber] = cell.value ?? '';
      });
      if (Object.values(obj).some(v => v !== '')) rows.push(obj);
    }
  });
  return rows;
}

export function classify_all(rows) {
  return rows.map(row => ({
    ...row,
    _type: classify_transaction(row),
    _amount: parseFloat(String(row.Amount || row.amount || row.Debit || row.Credit || '0').replace(/[^0-9.\-]/g, '')) || 0,
    _date: row.Date || row.date || row['Transaction Date'] || '',
    _desc: row.Description || row.description || row.Title || row.Memo || '',
  }));
}

export function compute_upwork_totals(classified_rows) {
  const totals = {
    earnings: 0, service_fee: 0, subscription: 0, connects: 0,
    tax: 0, withdrawal: 0, refund: 0, bonus: 0,
    card_payment: 0, id_fee: 0, review: 0, other: 0,
  };

  for (const row of classified_rows) {
    const amount = Math.abs(row._amount || 0);
    switch (row._type) {
      case 'EARNINGS':     totals.earnings     += amount; break;
      case 'SERVICE_FEE':  totals.service_fee  += amount; break;
      case 'SUBSCRIPTION': totals.subscription += amount; break;
      case 'CONNECTS':     totals.connects     += amount; break;
      case 'TAX':          totals.tax          += amount; break;
      case 'WITHDRAWAL':   totals.withdrawal   += amount; break;
      case 'REFUND':       totals.refund       += amount; break;
      case 'BONUS':        totals.bonus        += amount; break;
      case 'CARD_PAYMENT': totals.card_payment += amount; break;
      case 'ID_FEE':       totals.id_fee       += amount; break;
      case 'REVIEW':       totals.review       += amount; break;
      default:             totals.other        += amount;
    }
  }

  return totals;
}
