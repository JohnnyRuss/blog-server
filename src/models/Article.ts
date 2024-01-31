import {
  ArticleT,
  ArticleModelT,
  ArticleMethodsT,
} from "../types/models/article.types";
import { Schema, model } from "mongoose";
import slugify from "slugify";

const ArticleSchema = new Schema<ArticleT, ArticleModelT, ArticleMethodsT>(
  {
    slug: {
      type: String,
      unique: true,
    },

    title: {
      type: String,
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    categories: {
      type: [Schema.Types.ObjectId],
      ref: "Category",
      required: true,
      default: [],
    },

    body: {
      type: String,
      required: true,
    },

    views: {
      type: Number,
      default: 0,
    },

    likes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    picked: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

ArticleSchema.pre("save", async function (next) {
  if (!this.isModified("title")) return next();

  this.slug = slugify(this.title, { lower: true, locale: "en", trim: true });

  next();
});

const Article = model<ArticleT, ArticleModelT>("Article", ArticleSchema);

export default Article;
