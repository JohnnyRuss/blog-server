import { Types as MongooseTypes, Model, Document } from "mongoose";

type UserListT = Document & {
  author: MongooseTypes.ObjectId;
  title: string;
  description: string;
  articles: [{ article: MongooseTypes.ObjectId; savedAt: string }];
  privacy: string;
};

type UserListMethodsT = {};

type UserListModelT = Model<UserListT, {}, UserListMethodsT>;

export type { UserListT, UserListMethodsT, UserListModelT };
