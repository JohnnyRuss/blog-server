import { Router as ExpressRouter } from "express";
import { checkHealth } from "../controllers/healthCheck.controller";

const Router = ExpressRouter();

Router.route("/").post(checkHealth);

export default Router;
