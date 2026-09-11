import express from 'express';
import routes from "./routes/index.js"

const app = express();

app.use(express.json());

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
    });
});

export default app;