import React, { useState } from "react";
import { History, Search, Trash2, Calendar, FileSpreadsheet, ChevronRight, AlertCircle } from "lucide-react";
import { ScanHistoryItem } from "../types";

interface ScanHistoryProps {
  history: ScanHistoryItem[];
  onSelectResult: (item: ScanHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  activeScanId: string | null;
}

export default function ScanHistory({
  history,
  onSelectResult,
  onDeleteItem,
  onClearAll,
  activeScanId,
}: ScanHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const handleFormatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha desconocida";
    }
  };

  const getDocTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; bg: string; text: string }> = {
      factura: { label: "Factura", bg: "bg-rose-50/70 border border-rose-100", text: "text-rose-700" },
      remito: { label: "Remito", bg: "bg-amber-50/70 border border-amber-150", text: "text-amber-700" },
      recibo: { label: "Recibo", bg: "bg-emerald-50/70 border border-emerald-150", text: "text-emerald-700" },
      presupuesto: { label: "Presupuesto", bg: "bg-blue-50/70 border border-blue-150", text: "text-blue-700" },
      nota_credito: { label: "N. Crédito", bg: "bg-red-50/70 border border-red-150", text: "text-red-700" },
      planilla: { label: "Planilla", bg: "bg-cyan-50/70 border border-cyan-150", text: "text-cyan-700" },
      otro: { label: "Otro", bg: "bg-slate-50 border border-slate-200", text: "text-slate-700" },
    };

    const b = badges[type.toLowerCase()] || { label: "Otro", bg: "bg-slate-50 border border-slate-200", text: "text-slate-700" };
    return (
      <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-tight ${b.bg} ${b.text}`}>
        {b.label}
      </span>
    );
  };

  // Filtrar el historial según la barra de búsqueda y el selector de filtro
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.result.documentoJson.emisor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.result.documentoJson.tipo_documento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.result.documentoJson.total).includes(searchTerm);

    const matchesFilter = filterType === "all" || item.docType === filterType;

    return matchesSearch && matchesFilter;
  });

  return (
    <div id="scan-history" className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between border-b border-slate-150 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <History className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
          <h3 className="text-xs font-extrabold uppercase tracking-tight text-slate-800 font-display">Historial de Escaneos</h3>
          <span className="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
            {history.length}
          </span>
        </div>
        {history.length > 0 && (
          <button
            id="btn-clear-all-history"
            type="button"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que deseas vaciar todo tu historial de digitalización local?")) {
                onClearAll();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-700 font-bold cursor-pointer min-h-[36px] px-2 rounded-lg hover:bg-rose-50 flex items-center justify-center gap-1 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar</span>
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/40 gap-3 py-16">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 stroke-[1.5]" />
          <div>
            <p className="text-xs font-bold text-slate-700">Sin documentos guardados</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
              Sube tus facturas, planillas o remitos para iniciar tu archivo digital local.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Herramientas de búsqueda y filtrado */}
          <div className="space-y-2 shrink-0">
            {/* Input de Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                id="history-search-input"
                type="text"
                placeholder="Buscar por emisor, total o archivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-rose-450 focus:bg-white pl-9 pr-3.5 py-2.5 rounded-xl outline-disabled transition-all font-medium text-slate-800"
              />
            </div>
            
            {/* Selector rápido de tipo */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full">
              {[
                { value: "all", label: "Todos" },
                { value: "factura", label: "Facturas" },
                { value: "remito", label: "Remitos" },
                { value: "recibo", label: "Recibos" },
                { value: "planilla", label: "Planillas" },
              ].map((pill) => (
                <button
                  id={`pill-filter-${pill.value}`}
                  key={pill.value}
                  type="button"
                  onClick={() => setFilterType(pill.value)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap min-h-[28px] ${
                    filterType === pill.value
                      ? "bg-rose-600 border-rose-600 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Items en Scroll lateral/vertical */}
          <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 pr-1">
            {filteredHistory.length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs">
                No se encontraron coincidencias para tu búsqueda.
              </div>
            ) : (
              filteredHistory.map((item) => {
                const isSelected = activeScanId === item.id;
                const emisor = item.result.documentoJson.emisor?.nombre || "Emisor no detectado";
                const totalFormateado = `${item.result.documentoJson.moneda || "$"} ${item.result.documentoJson.total}`;

                return (
                  <div
                    id={`history-item-${item.id}`}
                    key={item.id}
                    className={`group w-full text-left rounded-xl border p-3 flex items-start gap-2.5 cursor-pointer transition-all duration-150 min-h-[64px] ${
                      isSelected
                        ? "bg-rose-50/30 border-rose-300 ring-1 ring-rose-100/50"
                        : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                    onClick={() => onSelectResult(item)}
                  >
                    {/* Icono / Tipo Miniatura de Preview */}
                    <div className="relative aspect-square w-11 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shrink-0 flex items-center justify-center">
                      <img
                        src={item.imageUrl}
                        alt="Mini"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Información Principal del Escaneo */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getDocTypeBadge(item.docType)}
                        <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {handleFormatDate(item.timestamp)}
                        </span>
                      </div>
                      
                      <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                        {emisor}
                      </p>
                      
                      <p className="text-[10px] text-slate-400 truncate max-w-[210px] font-mono">
                        {item.fileName}
                      </p>
                    </div>

                    {/* Total billing u opción de borrado */}
                    <div className="flex flex-col items-end gap-1 shrink-0 self-center">
                      <span className="text-xs font-extrabold text-rose-700 font-mono">
                        {totalFormateado}
                      </span>
                      
                      <button
                        id={`btn-del-history-item-${item.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (window.confirm("¿Quitar este documento del historial local?")) {
                            onDeleteItem(item.id);
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer min-h-[28px] min-w-[28px] flex items-center justify-center"
                        title="Eliminar del historial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
