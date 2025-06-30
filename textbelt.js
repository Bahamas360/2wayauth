require('dotenv').config();
const axios = require('axios');

async function sendSMS(phone, message) {
  return axios
    .post('https://textbelt.com/text', {
      phone,
      message,
      key: process.env.TEXTBELT_API_KEY || 'textbelt'// demo or paid key
    })
    .then(r => r.data)
    .catch(err => ({ success:false, error: err.message }));
}

module.exports = { sendSMS };