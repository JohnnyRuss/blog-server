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
      type: [
        {
          article: { type: Schema.Types.ObjectId, ref: "Article" },
          savedAt: { type: Date, default: new Date() },
        },
      ],
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
