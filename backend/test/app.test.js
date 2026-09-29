const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';

const app = require('../src/app');
let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  fs.rmSync(storageDirectory, { recursive: true, force: true });
});

function uploadFile(owner, name, content) {
  const form = new FormData();
  form.append('file', new Blob([content]), name);
  return fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: owner ? { 'X-User-Id': owner } : {},
    body: form,
  });
}

test('gerencia documentos locais isolados por usuário', async () => {
  const missingOwner = await uploadFile('', 'document.txt', 'conteúdo');
  assert.equal(missingOwner.status, 400);
  assert.equal((await missingOwner.json()).error.code, 'INVALID_USER_ID');

  const missingFile = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'usuario-a' },
  });
  assert.equal(missingFile.status, 400);
  assert.equal((await missingFile.json()).error.code, 'FILE_REQUIRED');

  const uploaded = await uploadFile('usuario-a', 'relatorio.txt', 'conteúdo do documento');
  assert.equal(uploaded.status, 201);
  const { document } = await uploaded.json();
  assert.equal(document.originalName, 'relatorio.txt');
  assert.equal(document.owner, 'usuario-a');
  assert.equal(document.size, Buffer.byteLength('conteúdo do documento'));
  assert.match(document.uploadedAt, /^\d{4}-\d\d-\d\dT/);

  const ownList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-a' },
  });
  assert.equal(ownList.status, 200);
  assert.deepEqual((await ownList.json()).documents.map(({ id }) => id), [document.id]);

  const otherList = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'usuario-b' },
  });
  assert.deepEqual((await otherList.json()).documents, []);

  const unauthorizedDownload = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'usuario-b' } },
  );
  assert.equal(unauthorizedDownload.status, 404);

  const download = await fetch(`${baseUrl}/documents/${document.id}/download`, {
    headers: { 'X-User-Id': 'usuario-a' },
  });
  assert.equal(download.status, 200);
  assert.equal(await download.text(), 'conteúdo do documento');
  assert.match(download.headers.get('content-disposition'), /relatorio\.txt/);

  const tooLarge = await uploadFile('usuario-a', 'grande.txt', 'x'.repeat(2048));
  assert.equal(tooLarge.status, 413);
  assert.equal((await tooLarge.json()).error.code, 'FILE_TOO_LARGE');

  const empty = await uploadFile('usuario-a', 'vazio.txt', '');
  assert.equal(empty.status, 400);
  assert.equal((await empty.json()).error.code, 'INVALID_FILE');
});
