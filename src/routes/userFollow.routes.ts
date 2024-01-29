import { Router as ExpressRouter } from "express";
import { checkAuth } from "../middlewares";
import * as userFollowController from "../controllers/userFollow.controller";

const Router = ExpressRouter();

Router.route("/").get(checkAuth, userFollowController.getWhoToFollow);

export default Router;
