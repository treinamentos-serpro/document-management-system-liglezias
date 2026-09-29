const path = require('node:path');
const documentService = require('../services/documents.service');

const documentIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUserId(req, res, next) {
  const owner = req.get('X-User-Id')?.trim();
  if (!owner || owner.length > 128) {
    return next(documentService.createError(
      400,
      'INVALID_USER_ID',
      'Informe um identificador de usuário válido no cabeçalho X-User-Id.',
    ));
  }

  req.owner = owner;
  return next();
}

async function upload(req, res, next) {
  try {
    const document = await documentService.createDocument(req.file, req.owner);
    return res.status(201).json({ document });
  } catch (error) {
    return next(error);
  }
}

function list(req, res, next) {
  try {
    return res.json({ documents: documentService.listDocuments(req.owner) });
  } catch (error) {
    return next(error);
  }
}

async function download(req, res, next) {
  if (!documentIdPattern.test(req.params.id)) {
    return next(documentService.createError(
      400,
      'INVALID_DOCUMENT_ID',
      'O identificador do documento é inválido.',
    ));
  }

  try {
    const { document, filePath } = await documentService.getDocumentForDownload(
      req.params.id,
      req.owner,
    );
    const downloadName = path.basename(document.originalName.replace(/\\/g, '/'))
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .trim() || 'documento';

    return res.download(filePath, downloadName, (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { download, list, requireUserId, upload };