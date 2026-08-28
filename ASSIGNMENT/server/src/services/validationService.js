import dns from 'dns/promises';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmailFormat(email) {
  return EMAIL_REGEX.test(String(email || '').trim());
}

export async function validateEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();

  if (!normalized) {
    return { email: normalized, status: 'invalid', notes: 'Email is empty' };
  }

  if (!isValidEmailFormat(normalized)) {
    return { email: normalized, status: 'invalid', notes: 'Invalid email format' };
  }

  const domain = normalized.split('@')[1];

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords?.length) {
      return { email: normalized, status: 'invalid', notes: 'No MX records found' };
    }
    return {
      email: normalized,
      status: 'mx-valid',
      notes: `MX verified (${mxRecords.length} record(s))`,
    };
  } catch {
    return { email: normalized, status: 'risky', notes: 'Could not verify MX records' };
  }
}

export async function validateEmails(emails) {
  return Promise.all(emails.map((email) => validateEmail(email)));
}
