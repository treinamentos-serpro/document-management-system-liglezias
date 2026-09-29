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

function userHeaders(userId) {
  return { 'X-User-Id': userId };
}

export async function listDocuments(userId) {
  const response = await readResponse(await fetch(`${apiPrefix}/documents`, {
    headers: userHeaders(userId),
  }));
  return (await response.json()).documents;
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await readResponse(await fetch(`${apiPrefix}/upload`, {
    method: 'POST',
    headers: userHeaders(userId),
    body: formData,
  }));
  return (await response.json()).document;
}

export async function downloadDocument(userId, documentId) {
  const response = await readResponse(await fetch(
    `${apiPrefix}/documents/${encodeURIComponent(documentId)}/download`,
    { headers: userHeaders(userId) },
  ));
  return response.blob();
}