import { Router as ExpressRouter } from "express";
import { checkAuth } from "../middlewares";
import * as userFollowController from "../controllers/userFollow.controller";

const Router = ExpressRouter();

Router.route("/").get(checkAuth, userFollowController.getFollowingUsers);

Router.route("/suggestions").get(
  checkAuth,
  userFollowController.getWhoToFollow
);

Router.route("/:userId/check").get(
  checkAuth,
  userFollowController.checkIsFollowingUser
);

Router.route("/:userId/follow").post(
  checkAuth,
  userFollowController.followUser
);

export default Router;
