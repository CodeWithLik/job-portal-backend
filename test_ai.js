const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function test() {
  try {
    const formData = new FormData();
    // Use an existing file to test, e.g. the dummy.pdf if it exists, or just create a text file.
    fs.writeFileSync('test.txt', 'This is a test resume.');
    // Actually the python endpoint expects .pdf or .docx. It checks filename.endswith('.pdf')
    fs.writeFileSync('test.pdf', 'Dummy PDF content');
    
    formData.append('resume', fs.createReadStream('test.pdf'));
    
    const res = await axios.post('http://127.0.0.1:8000/parse-resume', formData, {
      headers: formData.getHeaders()
    });
    console.log('SUCCESS:', res.data);
  } catch (err) {
    console.log('ERROR:', err.response ? err.response.data : err.message);
  }
}
test();
