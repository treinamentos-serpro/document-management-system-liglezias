const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage'),
);
const documents = new Map();

async function ensureStorageDirectory() {
  await fs.mkdir(storageDirectory, { recursive: true });
}

function create(document) {
  documents.set(document.id, { ...document });
  return { ...document };
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map((document) => ({ ...document }));
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);
  return document && document.owner === owner ? { ...document } : null;
}

async function removeStoredFile(storedFilename) {
  try {
    await fs.unlink(getFilePath(storedFilename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function getFilePath(storedFilename) {
  if (path.basename(storedFilename) !== storedFilename) {
    throw new Error('Nome físico de arquivo inválido.');
  }
  return path.join(storageDirectory, storedFilename);
}

module.exports = {
  create,
  ensureStorageDirectory,
  findByIdAndOwner,
  findByOwner,
  getFilePath,
  removeStoredFile,
  storageDirectory,
};