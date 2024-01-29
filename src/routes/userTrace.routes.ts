import { Router as ExpressRouter } from "express";
import { saveUser } from "../middlewares";
import * as userTraceController from "../controllers/userTrace.controller";

const Router = ExpressRouter();

Router.route("/").post(saveUser, userTraceController.updateUserTrace);

export default Router;
