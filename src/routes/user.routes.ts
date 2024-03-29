import { Router as ExpressRouter } from "express";
import * as userController from "../controllers/user.controller";
import { checkAuth } from "../middlewares";

const Router = ExpressRouter();

Router.route("/search").get(checkAuth, userController.searchUsers);

Router.route("/:username")
  .get(userController.getUserDetails)
  .patch(checkAuth, userController.updateUser)
  .delete(checkAuth, userController.deleteUser);

Router.route("/:userId/delete").post(checkAuth, userController.deleteUser);

Router.route("/:username/profile")
  .post(checkAuth, userController.fileUpload, userController.updateProfileImage)
  .patch(checkAuth, userController.deleteProfileImage);

export default Router;
