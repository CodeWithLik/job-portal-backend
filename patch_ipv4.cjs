const fs = require('fs');
const path = require('path');

const authPath = path.join('C:\\Users\\Henna\\Documents\\backend\\src\\routes', 'auth.js');
let content = fs.readFileSync(authPath, 'utf8');

if (!content.includes("require('dns').setDefaultResultOrder('ipv4first');")) {
  // Put it at the very top after the first requires
  const insertTarget = "const express = require('express');";
  content = content.replace(insertTarget, insertTarget + "\nrequire('dns').setDefaultResultOrder('ipv4first'); // Force IPv4 for Nodemailer Gmail connection issues");
  
  fs.writeFileSync(authPath, content);
  console.log("Added IPv4 force to auth.js");
} else {
  console.log("Already has IPv4 force");
}
