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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
