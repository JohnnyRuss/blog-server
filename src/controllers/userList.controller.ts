import { Async, AppError } from "../lib";
import { UserList } from "../models";

export const getUserLists = Async(async (req, res, next) => {
  res.status(200).json("");
});
