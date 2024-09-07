import { Schema, model } from "mongoose";
import { Article } from "./";

import {
  CommentT,
  CommentMethodsT,
  CommentModelT,
} from "../types/models/comment.types";

const CommentSchema = new Schema<CommentT, CommentModelT, CommentMethodsT>(
  {
    text: {
      type: String,
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    articleId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Comment = model<CommentT, CommentModelT>("Comments", CommentSchema);

export default Comment;
