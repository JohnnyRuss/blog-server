import {
  UserTraceT,
  UserTraceMethodsT,
  UserTraceModelT,
} from "../types/models/userTrace.types";
import { Schema, model } from "mongoose";

const UserTraceSchema = new Schema<
  UserTraceT,
  UserTraceModelT,
  UserTraceMethodsT
>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  views: {
    type: [Schema.Types.ObjectId],
    ref: "Category",
    default: [],
  },
  history: {
    type: [
      {
        readAt: Date,
        article: { type: Schema.Types.ObjectId, ref: "Article" },
      },
    ],
    default: [],
  },
  interests: {
    type: [Schema.Types.ObjectId],
    ref: "Category",
    default: [],
  },
  savedLists: {
    type: [Schema.Types.ObjectId],
    ref: "UserList",
    default: [],
  },
});

const UserTrace = model<UserTraceT, UserTraceModelT>(
  "UserTrace",
  UserTraceSchema
);

export default UserTrace;
