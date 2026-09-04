const entry = { email: 'verifications@go4worldbusiness.com', firstName: undefined, lastName: undefined };
let contactName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
if (!contactName && entry.email) {
  const prefix = entry.email.split('@')[0];
  contactName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
}
console.log("Result:", contactName || 'Unknown');
