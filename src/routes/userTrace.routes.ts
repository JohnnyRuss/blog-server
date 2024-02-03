import { Router as ExpressRouter } from "express";
import { saveUser, checkAuth } from "../middlewares";
import * as userTraceController from "../controllers/userTrace.controller";

const Router = ExpressRouter();

Router.route("/").post(saveUser, userTraceController.updateUserTrace);

Router.route("/history").get(checkAuth, userTraceController.getUserHistory);

export default Router;
