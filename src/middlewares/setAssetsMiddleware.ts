import express from "express";
import path from "path";

const assetsMiddleware = express.Router();

assetsMiddleware.use(
  "/assets",
  express.static(path.join(__dirname, "public/assets")),
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins
    next();
  }
);

export default assetsMiddleware;
