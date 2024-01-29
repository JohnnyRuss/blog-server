import { Types as MongooseTypes, Document, Model } from "mongoose";

type ArticleT = Document & {
  slug: string;
  _id: MongooseTypes.ObjectId;
  author: MongooseTypes.ObjectId;
  title: string;
  body: string;
  categories: Array<MongooseTypes.ObjectId>;
  views: number;
  likes: Array<MongooseTypes.ObjectId>;
  updatedAt: string;
  createdAt: string;
};

type ArticleMethodsT = {};

type ArticleModelT = Model<ArticleT, {}, ArticleMethodsT>;

export type { ArticleT, ArticleMethodsT, ArticleModelT };
