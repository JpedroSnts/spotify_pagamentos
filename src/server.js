import "dotenv/config";
import express, { json, urlencoded } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import webhookRoutes from "./routes/webhook.routes.js";
import userRoutes from "./routes/user.routes.js";
import { gerarPagamentoParaTodos } from "./config/gerarPagamentoMensal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../public')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.use("/api", userRoutes);
app.use("/api/webhook", webhookRoutes);

app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: "Erro interno do servidor",
        message: err.message,
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 ${process.env.APP_URL}:${PORT}`);
    console.log(`🔔 Webhook URL: ${process.env.APP_URL}/api/webhook`);

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
        console.warn(
            "⚠️  MERCADOPAGO_ACCESS_TOKEN não configurado! Configure o arquivo .env"
        );
    }
});

export default app;
