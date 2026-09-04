const emails = [
  {"type":"email","status":"verified","email":"info@porta-nyc.com"},
  {"type":"prospect","status":"verified","email":"francesca@porta-nyc.com","position":"Founder & Creative Director at PORTA","firstName":"Francesca","lastName":"del Balzo","companyName":"PORTA NYC"}
];

const mapped = emails
  .filter(entry => entry.type === 'prospect' || (entry.firstName && entry.lastName))
  .map((entry) => {
    return { name: `${entry.firstName} ${entry.lastName}`, email: entry.email };
  });

console.log(mapped);
