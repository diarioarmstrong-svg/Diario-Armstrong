import React, { useState, useEffect } from "react";
import { FileSpreadsheet, Loader2, Sparkles, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import FileUploader from "./components/FileUploader";
import ScanResultViewer from "./components/ScanResultViewer";
import ScanHistory from "./components/ScanHistory";
import { ScanHistoryItem, DigitalizedResult } from "./types";

export default function App() {
  // Estados de carga de Archivos
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);

  // Estados de configuración de escaneo
  const [selectedDocType, setSelectedDocType] = useState<string>("auto");
  const [activeResult, setActiveResult] = useState<DigitalizedResult | null>(null);
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Historial persistido localmente
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // 1. Cargar historial y estado de digitalización activa al iniciar (Persistencia automática)
  useEffect(() => {
    try {
      // Cargar historial
      const storedHistory = localStorage.getItem("digitalizer_history");
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }

      // Recuperar estado de la última digitalización activa cargada/procesada
      const lastActiveResult = localStorage.getItem("digitalizer_active_result");
      const lastFileName = localStorage.getItem("digitalizer_active_filename");
      const lastBase64 = localStorage.getItem("digitalizer_active_base64");
      const lastMimeType = localStorage.getItem("digitalizer_active_mimetype");
      const lastFileType = localStorage.getItem("digitalizer_active_filetype");
      const lastSelectedDocType = localStorage.getItem("digitalizer_active_selecteddoctype");
      const lastActiveScanId = localStorage.getItem("digitalizer_active_scan_id");

      if (lastActiveResult) {
        setActiveResult(JSON.parse(lastActiveResult));
      }
      if (lastFileName) setFileName(lastFileName);
      if (lastBase64) setBase64Data(lastBase64);
      if (lastMimeType) setMimeType(lastMimeType);
      if (lastFileType) setFileType(lastFileType);
      if (lastSelectedDocType) setSelectedDocType(lastSelectedDocType);
      if (lastActiveScanId) setActiveScanId(lastActiveScanId);

    } catch (err) {
      console.error("Error al recuperar los estados guardados de localStorage:", err);
    }
  }, []);

  // Guardar en historial cuando cambie
  const saveHistoryToLocalStorage = (newHistory: ScanHistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("digitalizer_history", JSON.stringify(newHistory));
    } catch (err) {
      console.error("Error al guardar el historial en localStorage:", err);
    }
  };

  // 2. Guardar automáticamente el estado activo / digitalización actual cuando cambie para que no se pierda al recargar
  useEffect(() => {
    try {
      if (activeResult) {
        localStorage.setItem("digitalizer_active_result", JSON.stringify(activeResult));
      } else {
        localStorage.removeItem("digitalizer_active_result");
      }
    } catch (e) {
      console.error("Error persistiendo activeResult", e);
    }
  }, [activeResult]);

  useEffect(() => {
    if (fileName) {
      localStorage.setItem("digitalizer_active_filename", fileName);
    } else {
      localStorage.removeItem("digitalizer_active_filename");
    }
  }, [fileName]);

  useEffect(() => {
    if (base64Data) {
      localStorage.setItem("digitalizer_active_base64", base64Data);
    } else {
      localStorage.removeItem("digitalizer_active_base64");
    }
  }, [base64Data]);

  useEffect(() => {
    if (mimeType) {
      localStorage.setItem("digitalizer_active_mimetype", mimeType);
    } else {
      localStorage.removeItem("digitalizer_active_mimetype");
    }
  }, [mimeType]);

  useEffect(() => {
    if (fileType) {
      localStorage.setItem("digitalizer_active_filetype", fileType);
    } else {
      localStorage.removeItem("digitalizer_active_filetype");
    }
  }, [fileType]);

  useEffect(() => {
    if (selectedDocType) {
      localStorage.setItem("digitalizer_active_selecteddoctype", selectedDocType);
    } else {
      localStorage.removeItem("digitalizer_active_selecteddoctype");
    }
  }, [selectedDocType]);

  useEffect(() => {
    if (activeScanId) {
      localStorage.setItem("digitalizer_active_scan_id", activeScanId);
    } else {
      localStorage.removeItem("digitalizer_active_scan_id");
    }
  }, [activeScanId]);

  const handleFileLoaded = (base64: string, mime: string, name: string, type: string) => {
    setBase64Data(base64);
    setMimeType(mime);
    setFileName(name);
    setFileType(type);
    setServerError(null);
  };

  const handleClearFile = () => {
    setBase64Data(null);
    setMimeType(null);
    setFileName(null);
    setFileType(null);
    setActiveResult(null);
    setActiveScanId(null);
    setServerError(null);

    // Limpiar localStorage del estado activo actual
    localStorage.removeItem("digitalizer_active_result");
    localStorage.removeItem("digitalizer_active_filename");
    localStorage.removeItem("digitalizer_active_base64");
    localStorage.removeItem("digitalizer_active_mimetype");
    localStorage.removeItem("digitalizer_active_filetype");
    localStorage.removeItem("digitalizer_active_selecteddoctype");
    localStorage.removeItem("digitalizer_active_scan_id");
  };

  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    setActiveResult(item.result);
    setActiveScanId(item.id);
    
    // Sincronizar states del uploader con el ítem seleccionado para que el usuario visualice qué archivo es
    setBase64Data(item.imageUrl);
    setFileName(item.fileName);
    setMimeType(item.fileType.startsWith("image/") ? item.fileType : "image/jpeg");
    setFileType(item.fileType);
    setSelectedDocType(item.docType);
    setServerError(null);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((x) => x.id !== id);
    saveHistoryToLocalStorage(updated);
    if (activeScanId === id) {
      handleClearFile();
    }
  };

  const handleClearAllHistory = () => {
    saveHistoryToLocalStorage([]);
    handleClearFile();
  };

  // Función principal: Enviar datos del comprobante a Gemini
  const handleDigitalize = async () => {
    if (!base64Data || !mimeType) {
      setServerError("Por favor, sube una foto, imagen o archivo PDF antes de iniciar.");
      return;
    }

    setIsLoading(true);
    setServerError(null);

    try {
      const response = await fetch("/api/digitalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Data,
          mimeType: mimeType,
          docType: selectedDocType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Error desconocido al procesar el documento.");
      }

      // Validar respuesta estructurada
      if (!data.textoPlano || !data.documentoJson || !data.documentoCsv) {
        throw new Error("La IA no retornó los formatos correctos requeridos (Texto, JSON y CSV). Intente nuevamente.");
      }

      // Resultado exitoso
      setActiveResult(data);

      // Mapear dinámicamente el tipo de documento según la detección inteligente de Gemini
      let mappedType = selectedDocType;
      if (selectedDocType === "auto") {
        const detected = (data.documentoJson.tipo_documento || "").toLowerCase();
        if (detected.includes("factura")) mappedType = "factura";
        else if (detected.includes("remito")) mappedType = "remito";
        else if (detected.includes("recibo")) mappedType = "recibo";
        else if (detected.includes("presupuesto")) mappedType = "presupuesto";
        else if (detected.includes("planilla") || detected.includes("reporte")) mappedType = "planilla";
        else if (detected.includes("nota")) mappedType = "nota_credito";
        else mappedType = "otro";
      }

      // Generar ID único seguro
      const uniqueId = crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);

      // Crear nuevo registro en el historial
      const newHistoryItem: ScanHistoryItem = {
        id: uniqueId,
        name: `Digitalización - ${data.documentoJson.emisor?.nombre || data.documentoJson.tipo_documento || "Documento"}`,
        timestamp: new Date().toISOString(),
        docType: mappedType,
        fileName: fileName || "documento_desconocido",
        fileType: fileType || "image/jpeg",
        imageUrl: base64Data, // Almacenar el preview de forma local
        result: data,
      };

      const updatedHistory = [newHistoryItem, ...history];
      saveHistoryToLocalStorage(updatedHistory);
      setActiveScanId(uniqueId);

    } catch (err: any) {
      console.error(err);
      setServerError(
        err.message || 
        "Hubo un inconveniente en el canal de comunicación del servidor. Verifique si configuró correctamente su API Key."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-rose-100 selection:text-rose-800">
      
      {/* HEADER DE LA APLICACIÓN - Estilo Crucianelli: Rojo vibrante, Gris metal, Tecnología y Precisión */}
      <header className="bg-slate-900 border-b-4 border-rose-600 sticky top-0 z-50 py-4 px-6 md:px-12 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo y título */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-950/50">
              <FileSpreadsheet className="w-6.5 h-6.5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white font-display">
                  CRUCIANELLI <span className="text-rose-500 font-medium">DIGITAL</span>
                </h1>
                <span className="bg-rose-950 text-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-800/50">
                  <Sparkles className="w-2.5 h-2.5 fill-rose-400" /> IA Gemini 3.1 Lite
                </span>
              </div>
              <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">
                Digitalización de Precisión • Facturas y Contratos
              </p>
            </div>
          </div>

          {/* Información complementaria de privacidad/seguridad */}
          <div className="hidden md:flex items-center gap-2 text-xs text-rose-200 font-bold bg-slate-800 border border-slate-700/60 p-2.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Procesamiento Seguro de Alta Velocidad</span>
          </div>

        </div>
      </header>

      {/* CUERPO PRINCIPAL DEL DIGITALIZADOR */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">
        
        {/* PANEL IZQUIERDO: Subida, Opciones de Escaneo, Historial local (Columna de ancho 5 en LG, completo en móvil) */}
        <section className="lg:col-span-12 xl:col-span-5 space-y-6">
          
          {/* Tarjeta Informativa de Ayuda al Usuario */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl shadow-md border-l-4 border-rose-600 text-left relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-rose-600/10 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white font-display mb-2 flex items-center gap-1.5">
              <span className="w-1.5 h-3 bg-rose-600 inline-block rounded-full"></span> 
              Instrucciones de Operación
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              1. Selecciona opcionalmente qué tipo de papel quieres leer debajo.<br />
              2. Sube una foto de tu factura/remito o carga un archivo PDF directamente.<br />
              3. Haz clic en el botón rojo de **Procesar Digitalización**.<br />
              4. Controla y visualiza la información en paralelo, copia a tu software contable o descarga en Excel.
            </p>
          </div>

          {/* Componente Modular de Subida de Archivos */}
          <FileUploader
            onFileLoaded={handleFileLoaded}
            onClear={handleClearFile}
            isLoading={isLoading}
            selectedDocType={selectedDocType}
            setSelectedDocType={setSelectedDocType}
          />

          {/* Botón de envío principal */}
          <div className="flex flex-col gap-3">
            <button
              id="btn-trigger-digitalize"
              type="button"
              onClick={handleDigitalize}
              disabled={isLoading || !base64Data}
              className={`w-full py-4 rounded-xl text-sm font-black uppercase tracking-tight transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md select-none ${
                isLoading
                  ? "bg-slate-200 text-slate-500 border border-slate-300 shadow-none cursor-not-allowed"
                  : base64Data
                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-950/20 hover:scale-[1.01] active:translate-y-0.5"
                  : "bg-slate-150 text-slate-400 border border-slate-200 shadow-none cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando por Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5 fill-white" />
                  <span>Procesar Digitalización</span>
                </>
              )}
            </button>

            {/* Error del servidor o envío */}
            {serverError && (
              <div id="error-banner" className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-2.5 text-left text-rose-800 text-xs shadow-xs">
                <AlertTriangle className="w-4.5 h-4.5 text-rose-650 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block mb-1 uppercase tracking-tight">Falla en la respuesta</span>
                  <span>{serverError}</span>
                </div>
              </div>
            )}
          </div>

          {/* Historial de escaneos guardados en LocalStorage */}
          <ScanHistory
            history={history}
            onSelectResult={handleSelectHistoryItem}
            onDeleteItem={handleDeleteHistoryItem}
            onClearAll={handleClearAllHistory}
            activeScanId={activeScanId}
          />

        </section>

        {/* PANEL DERECHO: Visor de Resultados Digitalizados (Columna de ancho 7 en LG, completo en móvil) */}
        <section className="lg:col-span-12 xl:col-span-7 h-full">
          
          {activeResult ? (
            <ScanResultViewer
              result={activeResult}
              docName={fileName || "comprobante_digital.jpg"}
            />
          ) : (
            /* Pantalla informativa en Blanco (Empty State) style Crucianelli */
            <div id="result-empty-state" className="bg-white rounded-2xl border border-slate-200/95 p-8 text-center flex flex-col items-center justify-center h-full min-h-[460px] gap-5 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 stroke-[1.8] border border-rose-100 shadow-inner">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="space-y-1.5Packed">
                <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-800 font-display">
                  Mesa de Trabajo Digital
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1.5 mx-auto leading-relaxed font-semibold">
                  Sube un comprobante, remito o planilla contable a la izquierda para procesar. Obtendrás un informe detallado narrativo, un bloque JSON para sistemas y una tabla CSV automatizada compatible con Excel.
                </p>
              </div>
              <div className="flex items-center gap-1.5 p-2 bg-slate-900 rounded-lg text-[10px] font-extrabold text-rose-200 uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Sistemas de Precisión Contable</span>
              </div>
            </div>
          )}

        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-[11px] text-slate-500 shrink-0 font-sans mt-12">
        <p className="font-extrabold text-slate-400 uppercase tracking-wider">© 2026 Crucianelli Digital Co. - Excelencia en Automatización.</p>
        <p className="mt-1 font-semibold text-slate-500">Mapeado contable inteligente seguro mediante Gemini AI.</p>
      </footer>

    </div>
  );
}
