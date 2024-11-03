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

Router.route("/interests")
  .get(checkAuth, userTraceController.getUserInterests)
  .post(checkAuth, userTraceController.configureUserInterests);

Router.route("/interests/check").post(
  checkAuth,
  userTraceController.checkIsConfigured
);

Router.route("/interests/:categoryId")
  .patch(checkAuth, userTraceController.addUserInterest)
  .delete(checkAuth, userTraceController.removeUserInterest);

export default Router;
