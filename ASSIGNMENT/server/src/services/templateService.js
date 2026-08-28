export function personalizeTemplate(template, buyer) {
  if (!template) return '';

  const firstName = (buyer.contactName || '').trim().split(/\s+/)[0] || 'there';

  const values = {
    name: buyer.contactName || firstName,
    firstName,
    company: buyer.companyName || 'your company',
    country: buyer.country || '',
    email: buyer.email || '',
    category: buyer.category || '',
  };

  let result = template;

  for (const [key, value] of Object.entries(values)) {
    // {{name}}, {{ name }}, {name}
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value);
    result = result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'), value);
  }

  return result;
}

export function bodyToHtml(body) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      ${body.split('\n').map((line) => `<p>${line || '&nbsp;'}</p>`).join('')}
    </div>
  `;
}
