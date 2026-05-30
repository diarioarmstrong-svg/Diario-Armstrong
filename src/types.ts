export interface DigitalizedItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface EmisorReceptor {
  nombre?: string;
  identificacion_fiscal?: string;
  direccion?: string;
  telefono?: string;
}

export interface DigitalizedJSON {
  tipo_documento: string;
  emisor?: EmisorReceptor;
  receptor?: EmisorReceptor;
  fecha?: string;
  numero_documento?: string;
  moneda?: string;
  items?: DigitalizedItem[];
  subtotal_general?: number;
  impuestos?: number;
  descuentos?: number;
  total: number;
}

export interface DigitalizedResult {
  textoPlano: string;
  documentoJson: DigitalizedJSON;
  documentoCsv: string;
}

export interface ScanHistoryItem {
  id: string;
  name: string;
  timestamp: string; // ISO String of scan date
  docType: string;   // e.g., "factura", "remito", "auto"
  fileName: string;  // Original file name uploaded
  fileType: string;  // Image mimetype or "application/pdf"
  imageUrl: string;  // Preview image URL (base64 or objectUrl)
  result: DigitalizedResult;
}
