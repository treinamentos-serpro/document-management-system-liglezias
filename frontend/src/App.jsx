import { useEffect, useState } from 'react';
import './App.css';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentApi.js';

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('dms.userId') || 'usuario-1');
  const [activeUser, setActiveUser] = useState(() => localStorage.getItem('dms.userId') || 'usuario-1');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listDocuments(activeUser, controller.signal)
      .then((items) => {
        if (current) setDocuments(items);
      })
      .catch((requestError) => {
        if (current && requestError.name !== 'AbortError') setError(requestError.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });

    return () => {
      current = false;
      controller.abort();
    };
  }, [activeUser]);

  function selectUser(event) {
    event.preventDefault();
    const normalizedUser = userId.trim();
    if (!normalizedUser) {
      setError('Informe um identificador de usuário.');
      return;
    }
    localStorage.setItem('dms.userId', normalizedUser);
    setUserId(normalizedUser);
    setActiveUser(normalizedUser);
    setNotice('');
  }

  async function handleUpload(file) {
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const document = await uploadDocument(activeUser, file);
      setDocuments((current) => [document, ...current]);
      setNotice('Documento enviado.');
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setError('');
    try {
      const blob = await downloadDocument(activeUser, document.id);
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = objectUrl;
      link.download = document.originalName;
      link.hidden = true;
      window.document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloadingId('');
    }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <a className="wordmark" href="#inicio" aria-label="Arquivo, início">
          <span className="wordmark__mark" aria-hidden="true">A</span>
          <span>Arquivo</span>
        </a>
        <span className="topbar__caption">GESTÃO DE DOCUMENTOS</span>
      </header>

      <div className="content" id="inicio">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ESPAÇO DE TRABALHO</p>
            <h1 id="page-title">Seus documentos</h1>
            <p className="page-heading__description">
              Envie e acesse seus arquivos em um só lugar.
            </p>
          </div>
          <form className="user-form" onSubmit={selectUser}>
            <label htmlFor="user-id">Identificador</label>
            <div className="user-form__controls">
              <input
                id="user-id"
                value={userId}
                maxLength={128}
                disabled={uploading}
                onChange={(event) => setUserId(event.target.value)}
              />
              <button className="button button--secondary" type="submit" disabled={uploading}>
                Acessar
              </button>
            </div>
          </form>
        </section>

        {error && <p className="message message--error" role="alert">{error}</p>}
        {notice && <p className="message message--success" role="status">{notice}</p>}

        <section className="section" aria-labelledby="upload-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ADICIONAR</p>
              <h2 id="upload-title">Enviar documento</h2>
            </div>
          </div>
          <UploadComponent disabled={uploading} onUpload={handleUpload} />
        </section>

        <section className="section documents-section" aria-labelledby="documents-title">
          <div className="section-heading section-heading--list">
            <div>
              <p className="eyebrow">BIBLIOTECA</p>
              <h2 id="documents-title">Documentos</h2>
            </div>
            <span className="document-count" aria-label={`${documents.length} documentos`}>
              {documents.length.toString().padStart(2, '0')}
            </span>
          </div>
          {loading ? (
            <p className="empty-state" role="status">Carregando documentos...</p>
          ) : (
            <DocumentList
              documents={documents}
              downloadingId={downloadingId}
              onDownload={handleDownload}
            />
          )}
        </section>
      </div>
      <footer className="footer">ARQUIVO LOCAL · DOCUMENTOS DO USUÁRIO {activeUser}</footer>
    </main>
  );
}
