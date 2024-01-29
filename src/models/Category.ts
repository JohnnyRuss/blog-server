import { Schema, model } from "mongoose";
import {
  CategoryT,
  CategoryMethodsT,
  CategoryModelT,
} from "../types/models/category.types";

const CategorySchema = new Schema<CategoryT, CategoryModelT, CategoryMethodsT>({
  title: {
    type: String,
    required: true,
    unique: true,
  },
  query: {
    type: String,
    required: true,
  },
  color: {
    type: String,
    required: true,
  },
  thumbnail: {
    type: String,
    default: "",
  },
});

const Category = model<CategoryT, CategoryModelT>("Category", CategorySchema);

export default Category;
