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
      ref: "Category",
    },
    articles: {
      type: [Schema.Types.ObjectId],
      ref: "Article",
    },
    privacy: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PUBLIC",
    },
  },
  { timestamps: true }
);

const UserList = model<UserListT, UserListMethodsT>("UserList", UserListSchema);

export default UserList;
