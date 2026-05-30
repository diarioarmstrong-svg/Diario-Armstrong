/**
 * Utilidades para procesar archivos PDF en el lado del cliente.
 * Utiliza la librería PDF.js cargada globalmente desde el CDN.
 */

// Inicializar el worker utilizando el CDN correspondiente a la versión 3.4.120
// @ts-ignore
if (typeof window !== "undefined" && window.pdfjsLib) {
  // @ts-ignore
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

export async function convertPdfToImage(file: File): Promise<{ dataUrl: string; numPages: number }> {
  // @ts-ignore
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("La librería PDF.js no está lista en este momento. Intente recargar la página.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (pdf.numPages === 0) {
      throw new Error("El archivo PDF no contiene ninguna página.");
    }

    // Renderizamos la primera página para la digitalización
    const page = await pdf.getPage(1);
    
    // Usamos una escala de 2.0 para garantizar suficiente nitidez para la IA
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo crear el contexto 2D de canvas.");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Renderizar página del PDF sobre el canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convertir a JPEG para transferencia óptima de bytes
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    
    return {
      dataUrl,
      numPages: pdf.numPages,
    };
  } catch (error: any) {
    console.error("Error al renderizar el archivo PDF:", error);
    throw new Error(`Error en el procesamiento del PDF: ${error.message || error}`);
  }
}
