import { Model, Document } from "mongoose";

interface CategoryT extends Document {
  title: string;
  query: string;
  color: string;
  thumbnail: string;
}

type CategoryMethodsT = {};

type CategoryModelT = Model<CategoryT, {}, CategoryMethodsT>;

export type { CategoryT, CategoryMethodsT, CategoryModelT };
