const apiPrefix = '/api';

async function readResponse(response) {
  if (response.ok) {
    return response;
  }

  const body = await response.json().catch(() => null);
  const error = new Error(body?.error?.message || 'Não foi possível concluir a solicitação.');
  error.code = body?.error?.code;
  throw error;
}

async function readJsonResponse(response, property) {
  const body = await response.json().catch(() => null);
  if (!body || typeof body !== 'object' || !(property in body)) {
    throw new Error('A resposta do servidor está em formato inválido.');
  }
  return body[property];
}

function userHeaders(userId) {
  return { 'X-User-Id': userId };
}

export async function listDocuments(userId, signal) {
  const response = await readResponse(await fetch(`${apiPrefix}/documents`, {
    headers: userHeaders(userId),
    signal,
  }));
  const documents = await readJsonResponse(response, 'documents');
  if (!Array.isArray(documents)) {
    throw new Error('A resposta de documentos está em formato inválido.');
  }
  return documents;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await readResponse(await fetch(`${apiPrefix}/upload`, {
    method: 'POST',
    headers: userHeaders(userId),
    body: formData,
  }));
  const document = await readJsonResponse(response, 'document');
  if (!document || typeof document !== 'object') {
    throw new Error('A resposta de upload está em formato inválido.');
  }
  return document;
}

export async function downloadDocument(userId, documentId) {
  const response = await readResponse(await fetch(
    `${apiPrefix}/documents/${encodeURIComponent(documentId)}/download`,
    { headers: userHeaders(userId) },
  ));
  return response.blob();
}