import express from 'express';
import routes from "./routes/index.js"
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import { requestLogger } from "./middlewares/request-logger.middleware.js";
import { errorHandler } from './middlewares/error.middleware.js';

const app = express();

app.use(express.json());
app.use(requestIdMiddleware);
app.use(requestLogger);

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Food Delivery Backend API is running smoothly!' 
  });
});

app.use("/api/v1", routes);

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
    });
});

app.use((_req, _res, next) => {
  next(new Error("Route not found"));
});

app.use(errorHandler)

export default app;