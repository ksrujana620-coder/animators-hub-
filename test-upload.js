import fs from 'fs';

const BASE = 'http://localhost:5000';

function log(...s){ console.log(...s); }

async function httpJson(path, method='GET', body=null, token=null){
  const headers = {};
  if (body && typeof body === 'object' && !(body instanceof Buffer)) { headers['Content-Type']='application/json'; body = JSON.stringify(body); }
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, { method, headers, body });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch(e){ data = txt; }
  return { ok: res.ok, status: res.status, data };
}

async function multipartUpload(path, filePath, fields={}, token){
  const fileBuffer = fs.readFileSync(filePath);
  const filename = filePath.split(/\\|\//).pop();
  const mime = 'application/octet-stream';
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2);
  const CRLF = '\r\n';
  const parts = [];

  // file part
  parts.push(Buffer.from(`--${boundary}${CRLF}`));
  parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`));
  parts.push(Buffer.from(`Content-Type: ${mime}${CRLF}${CRLF}`));
  parts.push(fileBuffer);
  parts.push(Buffer.from(CRLF));

  // other fields
  for (const [k,v] of Object.entries(fields)){
    parts.push(Buffer.from(`--${boundary}${CRLF}`));
    parts.push(Buffer.from(`Content-Disposition: form-data; name="${k}"${CRLF}${CRLF}`));
    parts.push(Buffer.from(String(v)));
    parts.push(Buffer.from(CRLF));
  }

  parts.push(Buffer.from(`--${boundary}--${CRLF}`));
  const body = Buffer.concat(parts);

  const headers = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  };
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const res = await fetch(BASE + path, { method: 'POST', headers, body });
  const txt = await res.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch(e){ data = txt; }
  return { ok: res.ok, status: res.status, data };
}

async function run(){
  try {
    log('health ->', await httpJson('/api'));

    // try signup (may already exist)
    const user = { username: 'testnode', email: 'testnode@example.com', password: 'Test12345' };
    const s = await httpJson('/api/signup','POST', user);
    log('signup ->', s.status, s.data);

    const lg = await httpJson('/api/login','POST', { email: user.email, password: user.password });
    log('login ->', lg.status, lg.data);
    if (!lg.ok) { throw new Error('login failed'); }
    const token = lg.data.token;

    const proj = await httpJson('/api/projects','POST',{ title: 'node-upload-test', description: 'auto' }, token);
    log('create project ->', proj.status, proj.data);
    const projectId = proj.data?.project?.id || 1;

    // create file
    const testFile = './test-upload-node.txt';
    fs.writeFileSync(testFile, 'node upload test ' + Date.now());

    const up = await multipartUpload('/api/upload', testFile, { projectId }, token);
    log('upload ->', up.status, up.data);

  } catch (err) {
    console.error('error', err);
  }
}

run();
