import React, { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { convertPdfToImage } from "../utils/pdfHelper";

interface FileUploaderProps {
  onFileLoaded: (base64Data: string, mimeType: string, fileName: string, fileType: string) => void;
  onClear: () => void;
  isLoading: boolean;
  selectedDocType: string;
  setSelectedDocType: (type: string) => void;
}

export default function FileUploader({
  onFileLoaded,
  onClear,
  isLoading,
  selectedDocType,
  setSelectedDocType,
}: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [conversionLoading, setConversionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; size: string; type: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypes = [
    { value: "auto", label: "📄 Autodetectar Tipo" },
    { value: "factura", label: "🧾 Factura" },
    { value: "remito", label: "🚚 Remito" },
    { value: "recibo", label: "💰 Recibo" },
    { value: "presupuesto", label: "📋 Presupuesto" },
    { value: "nota_credito", label: "🔄 Nota de Crédito" },
    { value: "planilla", label: "📊 Planilla / Reporte" },
    { value: "otro", label: "📝 Nota u Otro" },
  ];

  const handleFormatSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setConversionLoading(true);

    try {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const isImg = file.type.startsWith("image/");

      if (!isPdf && !isImg) {
        throw new Error("Formato no soportado. Por favor, sube una imagen (PNG, JPG) o un archivo PDF.");
      }

      setFileMeta({
        name: file.name,
        size: handleFormatSize(file.size),
        type: isPdf ? "PDF" : "Imagen",
      });

      if (isPdf) {
        // Renderizar PDF a imagen en el lado del cliente
        const result = await convertPdfToImage(file);
        setPreviewUrl(result.dataUrl);
        onFileLoaded(result.dataUrl, "image/jpeg", file.name, "application/pdf");
      } else {
        // Leer imagen directamente como base64
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          setPreviewUrl(base64);
          onFileLoaded(base64, file.type, file.name, file.type);
        };
        reader.onerror = () => {
          throw new Error("No se pudo leer el archivo de imagen.");
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Error al procesar el archivo seleccionado.");
      setFileMeta(null);
      setPreviewUrl(null);
    } finally {
      setConversionLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setFileMeta(null);
    setPreviewUrl(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClear();
  };

  return (
    <div id="file-uploader-container" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
      
      {/* Selector de Tipo de Documento */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="doc-type-select" className="text-xs font-extrabold text-slate-800 uppercase tracking-tight font-display">
          Tipo de documento a procesar
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4">
          {documentTypes.map((type) => (
            <button
              id={`btn-doc-type-${type.value}`}
              key={type.value}
              type="button"
              onClick={() => setSelectedDocType(type.value)}
              className={`px-3 py-2.5 rounded-xl text-left text-xs font-bold border transition-all duration-150 flex items-center gap-1.5 w-full cursor-pointer min-h-[44px] ${
                selectedDocType === type.value
                  ? "bg-rose-50 border-rose-300 text-rose-700 shadow-sm"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="truncate">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone al estilo Crucianelli (Rojo marca, gris industrial) */}
      <div
        id="dropzone-area"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 transition-all duration-200 ${
          dragActive
            ? "border-rose-505 bg-rose-50/40 scale-[0.99] shadow-inner"
            : "border-slate-300 bg-slate-50 hover:bg-slate-100/50 hover:border-slate-400"
        }`}
      >
        <input
          id="file-input-field"
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleInputChange}
          disabled={isLoading || conversionLoading}
        />

        {conversionLoading ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 className="w-10 h-10 text-rose-600 animate-spin" />
            <h3 className="font-extrabold text-slate-800 text-sm">Procesando y digitalizando archivo...</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              Renderizando las páginas del archivo PDF para legibilidad multimodal.
            </p>
          </div>
        ) : previewUrl ? (
          <div className="w-full flex flex-col gap-4">
            {/* Vista previa de imagen */}
            <div className="relative aspect-[4/3] w-full max-h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Vista previa comercial"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-2 right-2 bg-slate-900/85 backdrop-blur-xs text-white px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider">
                {fileMeta?.type}
              </div>
            </div>

            {/* Metadatos y Gestión */}
            <div className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-xl gap-2 text-left shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {fileMeta?.type === "PDF" ? (
                  <FileText className="w-8 h-8 text-rose-600 shrink-0" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-rose-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{fileMeta?.name}</p>
                  <p className="text-[11px] text-slate-500">{fileMeta?.size}</p>
                </div>
              </div>
              <button
                id="btn-remove-file"
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Quitar archivo"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 mb-2 border border-rose-100">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <button
                id="btn-trigger-upload"
                type="button"
                onClick={onButtonClick}
                disabled={isLoading}
                className="text-sm font-bold text-rose-650 hover:text-rose-700 underline focus:outline-hidden cursor-pointer min-h-[44px]"
              >
                Haz clic para subir un archivo
              </button>
              <span className="text-sm text-slate-500 font-medium"> o arrastra y suelta aquí</span>
            </div>
            <p className="text-xs text-slate-400 max-w-xs font-sans">
              Admite fotos, imágenes (PNG, JPG, WEBP) o archivos PDF de facturas, remitos, etc.
            </p>
          </div>
        )}
      </div>

      {/* Manejo de Errores local */}
      {errorMsg && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-rose-800 text-xs text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Ocurrió un inconveniente</span>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
