import { Router as ExpressRouter } from "express";
import { saveUser } from "../middlewares";
import * as categoryController from "../controllers/category.controller";

const Router = ExpressRouter();

Router.route("/").get(saveUser, categoryController.getCategories);

export default Router;
