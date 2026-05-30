import React, { useState } from "react";
import { FileText, Code, Database, Copy, Check, Download, Info, Eye, ChevronDown, ChevronUp, Columns } from "lucide-react";
import Markdown from "react-markdown";
import { DigitalizedResult } from "../types";

interface ScanResultViewerProps {
  result: DigitalizedResult;
  docName: string;
}

export default function ScanResultViewer({ result, docName }: ScanResultViewerProps) {
  // Estado para visibilidad independiente de cada formato (Permite tener múltiples abiertos lado a lado)
  const [showText, setShowText] = useState<boolean>(true);
  const [showJson, setShowJson] = useState<boolean>(true);
  const [showCsv, setShowCsv] = useState<boolean>(true);

  // Estado para colapsar/minimizar el cuerpo interno de cada formato individualmente
  const [collapsedText, setCollapsedText] = useState<boolean>(false);
  const [collapsedJson, setCollapsedJson] = useState<boolean>(false);
  const [collapsedCsv, setCollapsedCsv] = useState<boolean>(false);

  // Estados de retroalimentación de copia
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);

  const handleCopy = async (text: string, type: "text" | "json" | "csv") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "text") {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      } else if (type === "json") {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2000);
      } else if (type === "csv") {
        setCopiedCsv(true);
        setTimeout(() => setCopiedCsv(false), 2000);
      }
    } catch (err) {
      console.error("No se pudo copiar el texto: ", err);
    }
  };

  const handleDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Función para parsear CSV y construir una vista previa en tabla HTML
  const renderCsvPreviewTable = (csvText: string) => {
    if (!csvText) return null;
    const lines = csvText.split("\n").map((line) => line.trim()).filter((line) => line !== "");
    if (lines.length === 0) return null;

    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-slate-50/50">
        <table className="w-full text-left border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-250">
              {lines[0].split(";").map((col, idx) => (
                <th key={idx} className="p-2.5 font-bold text-slate-700 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.slice(1).map((line, rowIdx) => {
              const cells = line.split(";");
              const isSpacerRow = cells.length === 1 && cells[0] === "";
              if (isSpacerRow) {
                return (
                  <tr key={rowIdx} className="h-3 bg-slate-100/45">
                    <td colSpan={10}></td>
                  </tr>
                );
              }
              return (
                <tr
                  key={rowIdx}
                  className="bg-white border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  {cells.map((cell, cellIdx) => (
                    <td key={cellIdx} className="p-2 text-slate-600 font-mono whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const getDownloadPrefix = () => {
    return docName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "documento_digitalizado";
  };

  // Calcular cantidad de formatos activos en este momento para la grilla
  const activeCount = [showText, showJson, showCsv].filter(Boolean).length;

  return (
    <div id="scan-result-viewer" className="bg-white rounded-2xl border border-slate-200/90 shadow-md flex flex-col h-full overflow-hidden">
      
      {/* Cabecera diseño Crucianelli: Rojo marca, Gris metal, Blanco */}
      <div className="bg-slate-900 text-white border-b border-rose-600/80 p-5 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-extrabold tracking-tight font-display text-white">
                Mesa de Datos Digitalizados
              </h3>
              <p className="text-[11px] text-rose-200 font-mono max-w-[280px] sm:max-w-none truncate">
                Archivo: {docName}
              </p>
            </div>
          </div>

          {/* Controlador Grupal de Visualización Avanzada (Toggles de visualización en paralelo) */}
          <div className="flex flex-col gap-1.5 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[9px] uppercase tracking-wider text-rose-400 font-black flex items-center gap-1">
              <Columns className="w-3 h-3" /> Configuración de Vista Paralela
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Texto */}
              <button
                id="toggle-view-text"
                type="button"
                onClick={() => {
                  if (activeCount > 1 || !showText) setShowText(!showText);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[30px] ${
                  showText
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-700 text-slate-350 hover:bg-slate-650"
                }`}
                title={showText ? "Ocultar Texto" : "Mostrar Texto"}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Original</span>
              </button>

              {/* Toggle JSON */}
              <button
                id="toggle-view-json"
                type="button"
                onClick={() => {
                  if (activeCount > 1 || !showJson) setShowJson(!showJson);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[30px] ${
                  showJson
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-700 text-slate-350 hover:bg-slate-650"
                }`}
                title={showJson ? "Ocultar JSON" : "Mostrar JSON"}
              >
                <Code className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>

              {/* Toggle CSV */}
              <button
                id="toggle-view-csv"
                type="button"
                onClick={() => {
                  if (activeCount > 1 || !showCsv) setShowCsv(!showCsv);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[30px] ${
                  showCsv
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-slate-700 text-slate-350 hover:bg-slate-650"
                }`}
                title={showCsv ? "Ocultar CSV" : "Mostrar CSV"}
              >
                <Database className="w-3.5 h-3.5" />
                <span>CSV / Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE CONTENIDOS EN GRID VARIABLE DEPENDIENDO DEL NÚMERO DE COMPONENTES SELECCIONADOS */}
      <div className={`flex-1 p-4 md:p-6 overflow-y-auto max-h-[700px] lg:max-h-[800px] bg-slate-50 gap-6 grid grid-cols-1 ${
        activeCount === 3 
          ? "xl:grid-cols-3" 
          : activeCount === 2 
          ? "md:grid-cols-2" 
          : "grid-cols-1"
      }`}>
        
        {/* FORMATO 1: TEXTO PLANO */}
        {showText && (
          <div id="card-format-text" className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden max-w-full">
            
            {/* Header del Bloque Colapsable */}
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200/90 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">1. Texto Tradicional</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  id="btn-collapse-text"
                  type="button"
                  onClick={() => setCollapsedText(!collapsedText)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title={collapsedText ? "Expandir" : "Colapsar"}
                >
                  {collapsedText ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cuerpo del Bloque */}
            {!collapsedText && (
              <div className="p-4 flex flex-col gap-3 flex-grow bg-white">
                
                {/* Herramientas de Acción del Bloque */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" /> Resumen narrado
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      id="btn-copy-format-text"
                      type="button"
                      onClick={() => handleCopy(result.textoPlano, "text")}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer min-h-[28px]"
                    >
                      {copiedText ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <button
                      id="btn-dl-format-text"
                      type="button"
                      onClick={() => handleDownload(result.textoPlano, `${getDownloadPrefix()}.txt`, "text/plain;charset=utf-8")}
                      className="px-2 py-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer min-h-[28px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>

                {/* Renderizado de Markdown */}
                <div className="prose prose-sm prose-slate max-w-none bg-slate-50/40 border border-slate-150 p-4 rounded-xl overflow-x-auto text-slate-800 leading-relaxed font-sans max-h-[450px]">
                  <div className="markdown-body">
                    <Markdown>{result.textoPlano}</Markdown>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FORMATO 2: JSON ESTRUCTURADO */}
        {showJson && (
          <div id="card-format-json" className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden max-w-full">
            
            {/* Header del Bloque Colapsable */}
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200/90 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Code className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">2. Estructura JSON</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  id="btn-collapse-json"
                  type="button"
                  onClick={() => setCollapsedJson(!collapsedJson)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title={collapsedJson ? "Expandir" : "Colapsar"}
                >
                  {collapsedJson ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cuerpo del Bloque */}
            {!collapsedJson && (
              <div className="p-4 flex flex-col gap-3 flex-grow bg-white">
                
                {/* Herramientas de Acción */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" /> Esquema clave-valor
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      id="btn-copy-format-json"
                      type="button"
                      onClick={() => handleCopy(JSON.stringify(result.documentoJson, null, 2), "json")}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer min-h-[28px]"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <button
                      id="btn-dl-format-json"
                      type="button"
                      onClick={() => handleDownload(JSON.stringify(result.documentoJson, null, 2), `${getDownloadPrefix()}.json`, "application/json;charset=utf-8")}
                      className="px-2 py-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer min-h-[28px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>

                {/* Vista Ejecutiva Rápida */}
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-150 text-[11px] space-y-2 text-left">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-500">Documento:</span>
                    <span className="font-extrabold text-rose-700">{result.documentoJson.tipo_documento}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-bold text-slate-500">Emisor:</span>
                    <span className="font-bold text-slate-800 truncate max-w-[130px]">{result.documentoJson.emisor?.nombre || "No detectado"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-500">Monto Total:</span>
                    <span className="font-mono font-black text-rose-700">
                      {result.documentoJson.moneda || "$"} {result.documentoJson.total}
                    </span>
                  </div>
                </div>

                {/* Pre con JSON estructurado */}
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl overflow-x-auto font-mono text-[10px] max-h-[350px] text-left">
                  <code>{JSON.stringify(result.documentoJson, null, 2)}</code>
                </pre>
              </div>
            )}
          </div>
        )}

        {/* FORMATO 3: CSV PARA EXCEL */}
        {showCsv && (
          <div id="card-format-csv" className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden max-w-full">
            
            {/* Header del Bloque Colapsable */}
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200/90 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Database className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800 truncate uppercase tracking-tight">3. Tabla CSV (Excel)</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  id="btn-collapse-csv"
                  type="button"
                  onClick={() => setCollapsedCsv(!collapsedCsv)}
                  className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer min-w-[32px] min-h-[32px] flex items-center justify-center"
                  title={collapsedCsv ? "Expandir" : "Colapsar"}
                >
                  {collapsedCsv ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cuerpo del Bloque */}
            {!collapsedCsv && (
              <div className="p-4 flex flex-col gap-3 flex-grow bg-white">
                
                {/* Herramientas de Acción */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" /> Delimitador punto y coma
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      id="btn-copy-format-csv"
                      type="button"
                      onClick={() => handleCopy(result.documentoCsv, "csv")}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer min-h-[28px]"
                    >
                      {copiedCsv ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                    <button
                      id="btn-dl-format-csv"
                      type="button"
                      onClick={() => handleDownload(result.documentoCsv, `${getDownloadPrefix()}.csv`, "text/csv;charset=utf-8")}
                      className="px-2 py-1.5 bg-rose-650 hover:bg-rose-700 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer min-h-[28px]"
                    >
                      <Download className="w-3 h-3" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>

                {/* Tabla Interactiva Parseada */}
                <div className="max-h-[220px] overflow-y-auto">
                  {renderCsvPreviewTable(result.documentoCsv)}
                </div>

                {/* Pre plano con CSV */}
                <div className="space-y-1 mt-1 text-left">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">CSV Plano</span>
                  <pre className="bg-slate-900 text-yellow-400 p-3.5 rounded-xl overflow-x-auto font-mono text-[9px] max-h-[140px]">
                    <code>{result.documentoCsv}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
