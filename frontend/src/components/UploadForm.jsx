import { useRef, useState } from 'react';

export default function UploadForm({ disabled, onUpload }) {
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || disabled) return;
    const uploaded = await onUpload(file);
    if (uploaded) {
      setFile(null);
      inputRef.current.value = '';
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label className="file-picker">
        <span className="file-picker__label">Arquivo</span>
        <input
          ref={inputRef}
          type="file"
          required
          disabled={disabled}
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>
      <button className="button button--primary" type="submit" disabled={!file || disabled}>
        {disabled ? 'Enviando...' : 'Enviar documento'}
      </button>
    </form>
  );
}