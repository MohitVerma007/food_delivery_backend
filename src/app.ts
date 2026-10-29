import express from 'express';
import routes from "./routes/index.js"
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(
    "/api/v1/payment/webhook",
    express.raw({ type: "application/json" })
);
app.use(express.json());

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
    });
});

// 2. Webhook Endpoint
// app.post('/webhook/data', (req, res) => {
//   const webhookData = req.body;

//   // Jo bhi data webhook se aayega woh yahan print ho jayega
//   console.log('Webhook received:', webhookData);

//   // Service ko success response bhejna zaroori hai
//   res.status(200).json({ status: 'success', message: 'Webhook received successfully' });
// });

app.use(errorHandler)

export default app;