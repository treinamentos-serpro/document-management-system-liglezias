const { test } = require('node:test');
const assert = require('node:assert/strict');

const documentRepository = require('../src/repositories/documents.repository');
const documentService = require('../src/services/documents.service');

test('serviço retorna somente os dados públicos do documento', () => {
  const document = {
    id: 'a7f3c5d1-7e9b-4a2c-8f6d-1b3e5c7d9f01',
    originalName: 'relatorio.txt',
    size: 12,
    uploadedAt: '2026-01-01T00:00:00.000Z',
    owner: 'usuario-teste',
    storedFilename: 'arquivo-fisico',
  };
  documentRepository.create(document);

  assert.deepEqual(documentService.listDocuments(document.owner), [{
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  }]);
});
