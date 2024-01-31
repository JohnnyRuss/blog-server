import {
  UserListT,
  UserListMethodsT,
  UserListModelT,
} from "../types/models/userList.types";
import { Schema, model } from "mongoose";

const UserListSchema = new Schema<UserListT, UserListMethodsT, UserListModelT>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    articles: {
      type: [Schema.Types.ObjectId],
      ref: "Article",
      default: [],
    },
    privacy: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
    },
  },
  { timestamps: true }
);

const UserList = model<UserListT, UserListModelT>("UserList", UserListSchema);

export default UserList;
