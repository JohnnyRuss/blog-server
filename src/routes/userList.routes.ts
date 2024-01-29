import { Router as ExpressRouter } from "express";
import { checkAuth } from "../middlewares";
import * as userListController from "../controllers/userList.controller";

const Router = ExpressRouter();

Router.route("/").get(checkAuth, userListController.getUserLists);

export default Router;
