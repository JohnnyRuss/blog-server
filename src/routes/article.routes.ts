import { Router as ExpressRouter } from "express";
import { checkAuth, saveUser } from "../middlewares";
import * as articleController from "../controllers/article.controller";

const Router = ExpressRouter();

Router.route("/")
  .post(checkAuth, articleController.createArticle)
  .get(saveUser, articleController.getAllArticles);

Router.route("/top").get(saveUser, articleController.getTopArticle);

Router.route("/related/:slug").get(articleController.getRelatedArticles);

Router.route("/reaction/:articleId").post(
  checkAuth,
  articleController.likeArticle
);

Router.route("/:slug")
  .put(checkAuth, articleController.updateArticle)
  .delete(checkAuth, articleController.deleteArticle)
  .get(articleController.getArticle);

export default Router;
