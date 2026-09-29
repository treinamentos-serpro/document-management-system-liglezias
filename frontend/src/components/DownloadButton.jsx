export default function DownloadButton({ document, disabled, loading, onDownload }) {
  return (
    <button
      className="button button--quiet"
      type="button"
      disabled={disabled}
      onClick={() => onDownload(document)}
      aria-label={`Baixar ${document.originalName}`}
      title="Baixar documento"
    >
      {loading ? 'Baixando...' : 'Baixar'}
    </button>
  );
}