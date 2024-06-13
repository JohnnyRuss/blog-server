import { Router as ExpressRouter } from "express";
import { saveUser, checkAuth } from "../middlewares";
import * as userTraceController from "../controllers/userTrace.controller";

const Router = ExpressRouter();

Router.route("/").post(saveUser, userTraceController.updateUserTrace);

Router.route("/history")
  .get(checkAuth, userTraceController.getUserHistory)
  .delete(checkAuth, userTraceController.clearUserHistory);

Router.route("/lists/ids").get(checkAuth, userTraceController.getSavedListsIds);

Router.route("/lists/user/:userId").get(userTraceController.getSavedLists);

Router.route("/lists/:listId")
  .post(checkAuth, userTraceController.saveList)
  .delete(checkAuth, userTraceController.removeSavedList);

export default Router;
