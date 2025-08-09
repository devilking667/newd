const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});
const upload = multer({ storage });

// simple in-memory store (persist to file for restart resilience)
const DATA_FILE = path.join(__dirname, 'data.json');
let data = { bots: {}, stats: { dms:0, follows:0, follow_requests:0 } };
try { if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE)); } catch(e){}

function save(){ fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

app.use(express.json());
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok:true, time: new Date().toISOString() }));
app.get('/bots', (req, res) => res.json(Object.values(data.bots)));

app.post('/upload', upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ path: '/uploads/' + req.file.filename, filename: req.file.filename });
});

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  socket.on('register', (payload) => {
    if (!payload || !payload.type) return;
    if (payload.type === 'bot') {
      const botId = payload.botId || socket.id;
      data.bots[botId] = Object.assign({
        id: botId,
        name: payload.name || ('bot_' + botId.slice(0,6)),
        avatar: payload.avatar || null,
        accounts: payload.accounts || [],
        currentAccountIndex: 0,
        stats: { dms:0, follows:0, follow_requests:0 },
        lastSeen: new Date().toISOString()
      }, payload);
      save();
      io.emit('bots:update', Object.values(data.bots));
      socket.join('bots');
      socket.botId = botId;
    } else if (payload.type === 'dashboard') {
      socket.join('dashboards');
      socket.emit('bots:update', Object.values(data.bots));
    }
  });

  socket.on('bot:update', (payload) => {
    const botId = socket.botId || payload.botId;
    if (!botId || !data.bots[botId]) return;
    const bot = data.bots[botId];
    bot.stats = payload.stats || bot.stats;
    bot.currentAccountIndex = payload.currentAccountIndex ?? bot.currentAccountIndex;
    bot.lastSeen = new Date().toISOString();
    if (payload.stats && payload.stats.dms_inc) data.stats.dms += payload.stats.dms_inc;
    if (payload.stats && payload.stats.follows_inc) data.stats.follows += payload.stats.follows_inc;
    if (payload.stats && payload.stats.follow_requests_inc) data.stats.follow_requests += payload.stats.follow_requests_inc;
    save();
    io.emit('bots:update', Object.values(data.bots));
    io.emit('stats:update', data.stats);
  });

  socket.on('bot:command', ({ botId, command, args }) => {
    if (!botId || !command) return;
    io.to('bots').emit('bot:command', { botId, command, args });
    io.to('dashboards').emit('command:sent', { botId, command, args });
  });

  socket.on('disconnect', () => {
    if (socket.botId && data.bots[socket.botId]) {
      data.bots[socket.botId].lastSeen = new Date().toISOString();
      save();
      io.emit('bots:update', Object.values(data.bots));
    }
  });
});

server.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
