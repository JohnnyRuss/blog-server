import { Types as MongooseTypes, Model, Document } from "mongoose";

type UserListT = Document & {
  author: MongooseTypes.ObjectId;
  title: string;
  description: string;
  articles: Array<ListArticleT>;
  privacy: string;
};

type UserListMethodsT = {};

type UserListModelT = Model<UserListT, {}, UserListMethodsT>;

type ListArticleT = {
  article: MongooseTypes.ObjectId;
  savedAt: string;
};

export type { UserListT, UserListMethodsT, UserListModelT, ListArticleT };
