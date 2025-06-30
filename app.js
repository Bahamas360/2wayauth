require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const saltRounds = 10;
const users = [];
const algo = 'aes-256-cbc';
const key = crypto.createHash('sha256').update('your-secret-key').digest(); // fixed key
const iv = Buffer.alloc(16, 0); // fixed IV (for development only)
const usersFile = path.join(__dirname, 'userInfo.json');
const otpStore = {};
const OTP_LIFETIME_MS = 5 * 60 * 1000; 

if (fs.existsSync(usersFile)) {
  const data = fs.readFileSync(usersFile, 'utf8');
  users.push(...JSON.parse(data));
}

if (!fs.existsSync(usersFile)) {
  console.log('User data file not found, creating new one...');
  fs.writeFileSync(usersFile, '[]', 'utf8');
}

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

function encrypt(text) {
  const cipher = crypto.createCipheriv(algo, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

app.post('/register', async (req, res) => {
  const { username, password, phone } = req.body;

  if (!username || !password || !phone) {
    return res.status(400).json({ error: 'All fields required' });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const encryptPhone = encrypt(phone);

  const newUser = {
    username,
    password: hashedPassword,
    phone: encryptPhone
  };

  users.push(newUser);

 try {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf8');
  console.log('User saved:', newUser.username);
} catch (err) {
  console.error('Failed to write to userInfo.json:', err);
}
  //res.json({ message: 'User registered successfully!' });
});
function decrypt(hex) {
  const decipher = crypto.createDecipheriv(algo, key, iv);
  let txt = decipher.update(hex, 'hex', 'utf8');
  return txt + decipher.final('utf8');
}
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if(!username && !password) {
    return res.send(`<script>alert('Please input a username and password'); window.location.href = '/index.html';</script>`);
  }
  if(!username) {
    return res.send(`<script>alert('Please input a username'); window.location.href = '/index.html';</script>`);
  }
    if(!password) {
    return res.send(`<script>alert('Please input a password'); window.location.href = '/index.html';</script>`);
  }
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.send(`<script>alert('Invalid username'); window.location.href = '/index.html';</script>`);
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.send(`<script>alert('Incorrect password'); window.location.href = '/index.html';</script>`);
  }else{
    const otp = Math.floor(100000 + Math.random() * 900000).toString();// 6 digit opt
    otpStore[username] = { code: otp, exp: Date.now() + OTP_LIFETIME_MS };
    const phone = decrypt(user.phone);
    const result = await sendSMS(phone, `Your login code is: ${otp}`);
    if (!result.success) {
      console.error(result.error);
      return res.send('Could not send OTP SMS. Try again later.');
    }
    return res.send(`  <link rel="stylesheet" href="style.css">
      <h2>Enter the 6-digit code sent to phone</h2>
      <form action="/verify" method="POST" novalidate>
        <input type="hidden" name="username" value="${username}">
        <input name="code" maxlength="6" required>
        <button type="submit">Verify</button>
      </form>
    `);
  }
});
app.post('/verify', (req, res) => {
  const { username, code } = req.body;
  const entry = otpStore[username];
  if(!entry){
    return res.send('No pending verification. Please log in again.');
  }
  if(Date.now() > entry.exp){
    return res.send('Code expired. Start over.');
  }
  if(code !== entry.code){
    return res.send('Incorrect code.');
  }
  delete otpStore[username];
  res.redirect('/home.html');
});
const { sendSMS } = require('./textbelt');
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
