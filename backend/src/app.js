// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const documentRoutes = require('./routes/documents.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/', documentRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'MulterError') {
    const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(isTooLarge ? 413 : 400).json({
      error: {
        code: isTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_FILE',
        message: isTooLarge
          ? 'O arquivo excede o tamanho máximo permitido.'
          : 'O arquivo enviado é inválido.',
      },
    });
  }

  const status = error.statusCode || (error.code === 'ENOENT' ? 404 : 500);
  const code = error.code && error.statusCode
    ? error.code
    : status === 404
      ? 'DOCUMENT_NOT_FOUND'
      : 'INTERNAL_ERROR';

  return res.status(status).json({
    error: {
      code,
      message: error.statusCode || status === 404
        ? error.message
        : 'Não foi possível processar a solicitação.',
    },
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`DMS backend ouvindo na porta ${PORT}`);
  });
}

module.exports = app;
