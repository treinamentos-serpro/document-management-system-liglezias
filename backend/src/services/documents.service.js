const documentRepository = require('../repositories/documents.repository');

function createError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function toPublicDocument(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

async function createDocument(file, owner) {
  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  if (file.size === 0) {
    await documentRepository.removeStoredFile(file.filename);
    throw createError(400, 'INVALID_FILE', 'Arquivos vazios não são permitidos.');
  }

  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storedFilename: file.filename,
  };

  try {
    return toPublicDocument(documentRepository.create(document));
  } catch (error) {
    await documentRepository.removeStoredFile(file.filename).catch(() => {});
    throw error;
  }
}

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

async function getDocumentForDownload(id, owner) {
  const document = documentRepository.findByIdAndOwner(id, owner);
  if (!document) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  try {
    const filePath = await documentRepository.assertFileAvailable(document.storedFilename);
    return { document: toPublicDocument(document), filePath };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
    }
    throw error;
  }
}

module.exports = {
  createDocument,
  createError,
  getDocumentForDownload,
  listDocuments,
};