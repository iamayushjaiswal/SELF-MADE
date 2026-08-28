import { parse } from 'csv-parse/sync';

const COLUMN_ALIASES = {
  companyName: ['companyname', 'company name', 'company', 'organisation', 'organization', 'firm'],
  contactName: ['contactname', 'contact name', 'contact', 'name', 'person', 'full name'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  phone: ['phone', 'telephone', 'mobile', 'phone number'],
  website: ['website', 'web', 'url', 'site'],
  country: ['country', 'nation', 'market'],
  category: ['category', 'industry', 'segment', 'type', 'product'],
};

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '').trim();
}

function normalizeKey(key) {
  return String(key || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function buildRowLookup(row) {
  const lookup = {};
  for (const [key, value] of Object.entries(row)) {
    lookup[normalizeKey(key)] = String(value ?? '').trim();
  }
  return lookup;
}

function pickField(lookup, field) {
  for (const alias of COLUMN_ALIASES[field]) {
    if (lookup[alias]) return lookup[alias];
  }
  return '';
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  if (semicolons > commas) return ';';
  return ',';
}

function parseRecords(cleaned) {
  const delimiter = detectDelimiter(cleaned);
  return parse(cleaned, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
    delimiter,
  });
}

export function parseBuyerCsv(csvText) {
  const cleaned = stripBom(csvText);
  if (!cleaned) {
    throw new Error('CSV file is empty');
  }

  let records;
  try {
    records = parseRecords(cleaned);
  } catch (err) {
    throw new Error(`Invalid CSV format: ${err.message}`);
  }

  if (!records.length) {
    throw new Error('No data rows found in CSV. Include a header row and at least one lead.');
  }

  const rows = [];
  const errors = [];

  records.forEach((row, index) => {
    const lookup = buildRowLookup(row);
    const companyName = pickField(lookup, 'companyName');
    const contactName = pickField(lookup, 'contactName');
    const email = pickField(lookup, 'email').toLowerCase();

    if (!companyName && !email && !contactName) {
      errors.push(`Row ${index + 2}: missing company, contact, and email`);
      return;
    }

    rows.push({
      companyName: companyName || 'Unknown',
      contactName,
      email,
      phone: pickField(lookup, 'phone'),
      website: pickField(lookup, 'website'),
      country: pickField(lookup, 'country'),
      category: pickField(lookup, 'category'),
    });
  });

  if (!rows.length) {
    throw new Error(errors[0] || 'Could not read any valid rows from CSV');
  }

  return { rows, errors, totalParsed: records.length };
}

export const CSV_TEMPLATE = `companyName,contactName,email,phone,website,country,category
Global Textiles Trading Co.,James Smith,james.smith@example.com,+1-555-0101,https://example.com,Germany,textiles
Euro Electronics Imports Ltd.,Anna Mueller,anna.mueller@example.com,+49-555-0102,https://example.com,Germany,electronics`;
