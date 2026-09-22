const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function test() {
  try {
    const formData = new FormData();
    fs.writeFileSync('test2.pdf', 'dummy content');
    formData.append('resume', fs.createReadStream('test2.pdf'));
    const res = await axios.post('http://localhost:5000/api/ai/parse-resume', formData, {
      headers: { ...formData.getHeaders(), Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6InNlZWtlciIsImlhdCI6MTc4ODgxMjAyNCwiZXhwIjoxNzg4ODE1NjI0fQ.IV-0gtRMLQ_xftlwhZPQ3_H5E9JBnjS7hbvp6_LlIAU' }
    });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.log('ERROR:', err.response ? err.response.data : err.message);
  }
}
test();
