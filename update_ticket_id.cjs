const fs = require('fs');

// 1. Update Frontend Contact.jsx
let frontendContent = fs.readFileSync('C:\\Users\\Henna\\Documents\\frontend\\src\\pages\\public\\Contact.jsx', 'utf8');

const oldSubmitBlock = `    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to send');
      
      setIsSubmitting(false);
      setIsSuccess(true);
      setTicketId(\`AI-\${Math.floor(10000 + Math.random() * 90000)}\`);`;

const newSubmitBlock = `    try {
      const generatedTicketId = \`AI-\${Math.floor(10000 + Math.random() * 90000)}\`;
      const payload = { ...formData, ticketId: generatedTicketId };

      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to send');
      
      setIsSubmitting(false);
      setIsSuccess(true);
      setTicketId(generatedTicketId);`;

frontendContent = frontendContent.replace(oldSubmitBlock, newSubmitBlock);
fs.writeFileSync('C:\\Users\\Henna\\Documents\\frontend\\src\\pages\\public\\Contact.jsx', frontendContent);

// 2. Update Backend contact.js
let backendContent = fs.readFileSync('C:\\Users\\Henna\\Documents\\backend\\src\\routes\\contact.js', 'utf8');

backendContent = backendContent.replace(
  'const { role, name, email, message } = req.body;',
  'const { role, name, email, message, ticketId } = req.body;'
);

backendContent = backendContent.replace(
  'subject: `New Support Ticket from ${name} (${role})`,',
  'subject: `[${ticketId}] New Support Ticket from ${name} (${role})`,'
);

backendContent = backendContent.replace(
  '<h2>New Support Request</h2>',
  '<h2>New Support Request (${ticketId})</h2>'
);

fs.writeFileSync('C:\\Users\\Henna\\Documents\\backend\\src\\routes\\contact.js', backendContent);
console.log('Ticket ID fully integrated!');
