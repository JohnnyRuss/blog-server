import { Router as ExpressRouter } from "express";
import { checkAuth } from "../middlewares";
import * as commentsController from "../controllers/comments.controller";

const Router = ExpressRouter();

Router.route("/:articleId")
  .get(commentsController.getArticleComments)
  .post(checkAuth, commentsController.createComment);

Router.route("/:articleId/:commentId")
  .delete(checkAuth, commentsController.deleteComment)
  .patch(checkAuth, commentsController.updateComment);

export default Router;
