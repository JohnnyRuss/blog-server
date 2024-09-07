import { Router as ExpressRouter } from "express";
import { checkAuth, saveUser } from "../middlewares";
import * as userListController from "../controllers/userList.controller";

const Router = ExpressRouter();

Router.route("/")
  .get(checkAuth, userListController.getListsToAdd)
  .post(checkAuth, userListController.createList);

Router.route("/saved/articles").get(
  checkAuth,
  userListController.getSavedArticlesIds
);

Router.route("/user/saved").get(
  checkAuth,
  userListController.getRecentlySavedArticles
);

Router.route("/user/:userId").get(saveUser, userListController.getUserLists);

Router.route("/:listId/articles").get(
  saveUser,
  userListController.getListArticles
);

Router.route("/:listId/details").get(
  saveUser,
  userListController.getListDetails
);

Router.route("/:listId")
  .post(checkAuth, userListController.addToList)
  .put(checkAuth, userListController.updateList)
  .delete(checkAuth, userListController.deleteList);

export default Router;
