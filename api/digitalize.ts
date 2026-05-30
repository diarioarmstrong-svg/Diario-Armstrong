import { GoogleGenAI, Type } from "@google/genai";

// Inicialización diferida (Lazy initialization) para evitar crasheos si la API Key no está lista aún
let aiClient: GoogleGenAI | null = null;

function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("La API Key de Gemini (GEMINI_API_KEY) no está configurada en las variables de entorno.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

export default async function handler(req: any, res: any) {
  // Asegurar que sea una petición POST
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Método ${req.method} no permitido.` });
  }

  try {
    const { image, mimeType, docType } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Falta la imagen base64 en la petición." });
    }

    if (!mimeType) {
      return res.status(400).json({ error: "Falta especificar el tipo MIME de la imagen (mimeType)." });
    }

    // Normalizar la cadena base64 en caso de que venga con el prefijo "data:image/..."
    let cleanBase64 = image;
    if (image.includes(";base64,")) {
      cleanBase64 = image.split(";base64,").pop() || "";
    }

    const ai = getAi();

    // Crear el prompt optimizado según la selección del usuario y el idioma español
    const docTypeStr = docType && docType !== "auto" ? `un(a) ${docType}` : "un documento comercial/administrativo (factura, remito, nota, presupuesto, informe, recibo, planilla, etc.)";

    const promptText = `
      Eres un experto en digitalización de documentos administrativos y comerciales.
      Analiza detenidamente la imagen adjunta correspondiente a ${docTypeStr}.
      Extrae toda la información relevante con la máxima precisión y genera una respuesta en español en tres formatos distintos (Texto plano formatado, estructura JSON completa y un archivo CSV compatible con Excel).

      Sigue rigurosamente estas pautas para cada formato:
      1. textoPlano: Debe ser un reporte ordenado e informativo del documento. Utiliza markdown claro. Incluye:
         - Tipo de documento detectado y emisor / receptor.
         - Fecha, número de comprobante y totales.
         - Tabla de ítems con sus descripciones, cantidades, precios unitarios y totales.
         - Observaciones o datos adicionales si corresponde.
      
      2. documentoJson: Debe ser un objeto estructurado según el esquema provisto. Extrae todos los datos que identifiques (nombre del emisor, identificación fiscal -CUIT, RUT, RFC, NIF-, dirección, datos del receptor, fecha, número de comprobante, listado de ítems con descripción, precio unitario, cantidad y total, subtotales, impuestos y monto total final).
      
      3. documentoCsv: Una representación plana en formato CSV para que el usuario pueda copiar y pegar directamente a Excel.
         - Utiliza punto y coma (';') como separador de columnas (muy importante en entornos Excel en español).
         - Incluye filas de encabezado con los datos principales (Fecha;Número de Comprobante;Emisor;Receptor;Moneda;Total).
         - Agrega una línea en blanco y luego la tabla de ítems con columnas como (Ítem/Descripción;Cantidad;Precio Unitario;Subtotal).
         - Asegúrate de codificar los saltos de línea de forma estándar (\\n).
    `;

    // Realizar la llamada multimodal al modelo gemini-2.5-flash-lite (corresponde a Gemini 3.1 Flash Lite en el SDK)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        promptText,
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textoPlano: {
              type: Type.STRING,
              description: "Resumen detallado y lectura legible del documento en español, formateado en Markdown claro y amigable.",
            },
            documentoJson: {
              type: Type.OBJECT,
              description: "Estructura de datos JSON con todos los datos extraídos del comprobante.",
              properties: {
                tipo_documento: { type: Type.STRING, description: "Tipo de documento detectado (ej. Factura, Recibo, Remito, Presupuesto, Nota de Crédito, Planilla, etc.)" },
                emisor: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING },
                    identificacion_fiscal: { type: Type.STRING, description: "Identificación tributaria nacional (CUIT, RUT, RFC, NIF, DNI, etc.)" },
                    direccion: { type: Type.STRING },
                    telefono: { type: Type.STRING },
                  },
                },
                receptor: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING },
                    identificacion_fiscal: { type: Type.STRING },
                    direccion: { type: Type.STRING },
                  },
                },
                fecha: { type: Type.STRING, description: "Fecha de emisión del documento en formato YYYY-MM-DD (o el que figure)" },
                numero_documento: { type: Type.STRING, description: "Número de comprobante o factura" },
                moneda: { type: Type.STRING, description: "Moneda detectada ($ o ARS, USD, EUR, etc.)" },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      descripcion: { type: Type.STRING },
                      cantidad: { type: Type.NUMBER },
                      precio_unitario: { type: Type.NUMBER },
                      subtotal: { type: Type.NUMBER },
                    },
                  },
                },
                subtotal_general: { type: Type.NUMBER },
                impuestos: { type: Type.NUMBER, description: "Monto de IVA u otros tributos aplicados" },
                descuentos: { type: Type.NUMBER },
                total: { type: Type.NUMBER },
              },
              required: ["tipo_documento", "total"],
            },
            documentoCsv: {
              type: Type.STRING,
              description: "Planilla CSV estructurada con delimitador de punto y coma ';' ideal para copiar a Excel.",
            },
          },
          required: ["textoPlano", "documentoJson", "documentoCsv"],
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No se obtuvo respuesta del analizador de Gemini.");
    }

    // Parsear el string JSON obtenido de Gemini para retornarlo limpio al frontend
    const parsedData = JSON.parse(outputText);

    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.error("Error en digitalize API handler:", error);
    return res.status(500).json({
      error: "Ocurrió un error al procesar el documento.",
      details: error.message || String(error),
    });
  }
}
