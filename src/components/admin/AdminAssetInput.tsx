import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Check, FileText } from 'lucide-react';

interface AdminAssetInputProps {
  value: string;
  onChange: (val: string) => void;
  onUploaded?: (info: { storagePath: string; mimeType: string; size: number }) => void;
  accept?: string;
  visibility?: 'publico' | 'interno' | 'restrito';
  label?: string;
  hint?: string;
}

export const AdminAssetInput: React.FC<AdminAssetInputProps> = ({
  value,
  onChange,
  onUploaded,
  accept = 'application/pdf,image/*',
  visibility = 'publico',
  label = 'Arquivo ou link do documento',
  hint,
}) => {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Create local object URL or read as Data URL for immediate preview
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);

      if (onUploaded) {
        onUploaded({
          storagePath: `documents/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        });
      }
    } catch (err) {
      console.error('Erro ao processar arquivo:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-stone-700">{label}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'url' ? 'bg-[#00A550] text-white font-semibold' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <LinkIcon className="inline w-3 h-3 mr-1" />
            URL / Link
          </button>
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              mode === 'file' ? 'bg-[#00A550] text-white font-semibold' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Upload className="inline w-3 h-3 mr-1" />
            Upload
          </button>
        </div>
      </div>

      {mode === 'url' ? (
        <div className="relative">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://exemplo.com/documento.pdf"
            className="w-full rounded-lg border border-stone-300 bg-stone-50 p-3 text-sm focus:border-[#00A550] focus:ring-1 focus:ring-[#00A550] outline-none"
          />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg border border-stone-300 transition-colors"
          >
            <Upload className="w-4 h-4 text-stone-600" />
            {uploading ? 'Processando...' : 'Selecionar Arquivo'}
          </button>
          {value && (
            <span className="text-xs text-stone-600 truncate max-w-xs flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#00A550]" />
              Arquivo selecionado
            </span>
          )}
        </div>
      )}

      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
};
