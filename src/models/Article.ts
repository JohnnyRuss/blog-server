import {
  ArticleT,
  ArticleModelT,
  ArticleMethodsT,
} from "../types/models/article.types";
import { Schema, model } from "mongoose";
import { transliterate } from "transliteration";
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

    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        default: [],
      },
    ],

    body: {
      type: String,
      required: true,
    },

    views: {
      type: Number,
      default: 0,
    },

    lastViewedSessions: {
      type: Map,
      of: Date,
      default: {},
    },

    viewBuckets: {
      type: Map,
      of: Number,
      default: {},
    },

    likes: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    picked: {
      type: Boolean,
    },

    commentsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

ArticleSchema.pre("save", async function (next) {
  if (!this.isModified("title")) return next();

  const Model = this.constructor as typeof Article;

  const transliteratedTitle = transliterate(this.title);

  const title = transliteratedTitle.replace(/[^a-zA-Z0-9\s-]/g, "");
  const slug = slugify(title, { lower: true, locale: "en", trim: true });
  let newSlug = slug;

  let slugExists = await Model.findOne({ slug: newSlug });

  if (slugExists) {
    let uniqueSuffix = 1;

    while (slugExists) {
      newSlug = `${slug}-${uniqueSuffix}`;
      slugExists = await Model.findOne({ slug: newSlug });
      uniqueSuffix++;
    }
  }

  this.slug = newSlug;

  next();
});

const Article = model<ArticleT, ArticleModelT>("Article", ArticleSchema);

export default Article;
