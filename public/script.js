const socket = io();
const backendInput = document.getElementById('backendUrl');
const connectBtn = document.getElementById('connect');
const botsEl = document.getElementById('bots');
const statsEl = document.getElementById('stats');
const logEl = document.getElementById('log');
const fileInput = document.getElementById('file');
const uploadBtn = document.getElementById('uploadBtn');

function log(s){ logEl.textContent = (new Date().toLocaleTimeString()) + ' - ' + s + '\n' + logEl.textContent; }

connectBtn.onclick = ()=>{
  const url = backendInput.value.trim() || window.location.origin;
  const s = io(url);
  s.on('connect', ()=>{ log('connected to backend '+s.id); s.emit('register', { type:'dashboard' }) });
  s.on('bots:update', (bots)=>{
    botsEl.innerHTML = '';
    bots.forEach(b=>{
      const d = document.createElement('div'); d.className='bot-item';
      d.innerHTML = `<img src="${b.avatar||'https://placehold.co/64x64'}" /><div><div style="font-weight:600">${b.name}</div><div style="font-size:12px;color:#9fb0c8">id:${b.id} • accounts:${(b.accounts||[]).length}</div></div><div style="margin-left:auto"><button onclick="switchAccount('${b.id}')">Switch</button></div>`;
      botsEl.appendChild(d);
    });
  });
  s.on('stats:update', (st)=>{ statsEl.textContent = 'DMS:'+st.dms+' • Follows:'+st.follows+' • Req:'+st.follow_requests; });
  window._dashSocket = s;
};

function switchAccount(botId){
  if(!window._dashSocket) return alert('connect first');
  window._dashSocket.emit('bot:command', { botId, command:'switch_account', args:{} });
  log('sent switch to '+botId);
}

uploadBtn.onclick = async ()=>{
  if(!fileInput.files.length) return alert('select file');
  const url = backendInput.value.trim() || window.location.origin;
  const form = new FormData(); form.append('media', fileInput.files[0]);
  const res = await fetch(url + '/upload', { method:'POST', body: form });
  const j = await res.json();
  log('uploaded ' + j.filename);
  if(window._dashSocket){
    const sel = document.querySelector('.bot-item button');
    if(sel) window._dashSocket.emit('bot:command', { botId: sel.getAttribute('onclick').match(/'(.+)'/)[1], command:'upload_media', args:{ path:j.path, filename:j.filename } });
  }
};
