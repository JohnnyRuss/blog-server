import { Router as ExpressRouter } from "express";
import { checkAuth, checkRole } from "../middlewares";
import * as dashboardController from "../controllers/dashboard.controller";

const Router = ExpressRouter();

Router.route("/categories/:categoryId/thumbnail").post(
  checkAuth,
  checkRole(["ADMIN"]),
  dashboardController.fileUpload,
  dashboardController.uploadCategoryThumbnail
);

Router.route("/articles/:articleId/pick").post(
  checkAuth,
  checkRole(["ADMIN"]),
  dashboardController.pickArticle
);

export default Router;
