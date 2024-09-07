import path from "path";
import morgan from "morgan";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import hpp from "hpp";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";

import { AppError } from "./lib";
import { NODE_MODE } from "./config/env";
import { setHeaders, setCors } from "./middlewares/index";
import errorController from "./controllers/errorController";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import articleRoutes from "./routes/article.routes";
import categoryRoutes from "./routes/category.routes";
import userListRoutes from "./routes/userList.routes";
import userTraceRoutes from "./routes/userTrace.routes";
import userFollowRoutes from "./routes/userFollow.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import commentRoutes from "./routes/comments.routes";

const App = express();

App.set("view engine", "pug");
App.set("views", path.join(__dirname, "/views"));

App.use(express.json());
App.use(express.urlencoded({ extended: true }));
App.use(express.static(path.join(__dirname, "public")));

App.use(cookieParser());
App.use(setCors());
App.use(setHeaders);
App.use(compression());
App.use(hpp());
App.use(helmet());
App.use(mongoSanitize());

NODE_MODE === "DEV" && App.use(morgan("dev"));

App.use("/api/v1/auth", authRoutes);
App.use("/api/v1/users", userRoutes);
App.use("/api/v1/follow", userFollowRoutes);
App.use("/api/v1/articles", articleRoutes);
App.use("/api/v1/categories", categoryRoutes);
App.use("/api/v1/lists", userListRoutes);
App.use("/api/v1/trace", userTraceRoutes);
App.use("/api/v1/dashboard", dashboardRoutes);
App.use("/api/v1/comments", commentRoutes);

App.get("/views", async (req, res, next) => {
  res.status(200).render("welcome", {
    username: "",
    subHead: "",
  });
});

App.all("*", (req, _, next) => {
  next(new AppError(404, `can't find ${req.originalUrl} on this server`));
});

App.use(errorController);

export default App;
