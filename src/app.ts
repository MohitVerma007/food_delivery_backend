import express from 'express';
import routes from "./routes/index.js"
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(express.json());

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
    });
});

app.use(errorHandler)

export default app;