import { Types as MongooseTypes, Model, Document } from "mongoose";

type CategoryT = {
  title: string;
  query: string;
  color: string;
  thumbnail: string;
};

type CategoryMethodsT = {};

type CategoryModelT = Model<CategoryT, {}, CategoryMethodsT>;

export type { CategoryT, CategoryMethodsT, CategoryModelT };
