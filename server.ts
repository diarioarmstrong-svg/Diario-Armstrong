import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import digitalizeHandler from "./api/digitalize";

// Cargar variables de entorno desde el archivo .env si existe
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Incrementar los límites de tamaño para permitir la transmisión de imágenes base64 grandes
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Endpoint de salud básico
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Ruta principal de la API de digitalización (común con el handler de Vercel)
  app.post("/api/digitalize", async (req, res) => {
    try {
      await digitalizeHandler(req, res);
    } catch (err: any) {
      console.error("Error al ejecutar digitalizeHandler en server.ts:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error interno del servidor", details: err?.message || String(err) });
      }
    }
  });

  // Configurar Vite en desarrollo o servir archivos estáticos en producción
  if (process.env.NODE_ENV !== "production") {
    console.log("Iniciando en modo desarrollo con Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Iniciando en modo producción. Sirviendo archivos de dist/...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Servir archivos estáticos del frontend compilado
    app.use(express.static(distPath));
    
    // Para cualquier otra ruta, retornar index.html (SPA fallback)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Servidor] Ejecutándose correctamente en http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Error fatal al iniciar el servidor Express:", error);
  process.exit(1);
});
