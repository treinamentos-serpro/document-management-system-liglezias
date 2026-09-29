import DownloadButton from './DownloadButton.jsx';

function formatSize(size) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(size / 1024);
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function DocumentList({ documents, downloadingId, onDownload }) {
  if (documents.length === 0) {
    return <p className="empty-state">Nenhum documento associado a este usuário.</p>;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td className="document-name">{document.originalName}</td>
              <td>{formatSize(document.size)} KB</td>
              <td>{formatDate(document.uploadedAt)}</td>
              <td className="table-action">
                <DownloadButton
                  document={document}
                  disabled={Boolean(downloadingId)}
                  loading={downloadingId === document.id}
                  onDownload={onDownload}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}