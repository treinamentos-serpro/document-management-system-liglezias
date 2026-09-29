const crypto = require('node:crypto');
const multer = require('multer');
const express = require('express');
const documentController = require('../controllers/documentController');
const documentRepository = require('../repositories/documentRepository');

const configuredMaxSize = Number.parseInt(process.env.MAX_FILE_SIZE_BYTES, 10);
const maxFileSize = Number.isInteger(configuredMaxSize) && configuredMaxSize > 0
  ? configuredMaxSize
  : 10 * 1024 * 1024;

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      documentRepository.ensureStorageDirectory()
        .then(() => callback(null, documentRepository.storageDirectory))
        .catch(callback);
    },
    filename(req, file, callback) {
      callback(null, crypto.randomUUID());
    },
  }),
  limits: { fileSize: maxFileSize, files: 1 },
});

const router = express.Router();

router.post('/upload', documentController.requireUserId, upload.single('file'), documentController.upload);
router.get('/documents', documentController.requireUserId, documentController.list);
router.get('/documents/:id/download', documentController.requireUserId, documentController.download);

module.exports = router;