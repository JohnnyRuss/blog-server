import multer from "multer";

import { Category, Article } from "../models";
import { Async, AppError, Cloudinary } from "../lib";

export const fileUpload = multer({
  storage: multer.memoryStorage(),
}).single("thumbnail");

export const uploadCategoryThumbnail = Async(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);

  if (!category) return next(new AppError(404, "User does not exists"));

  const file: Express.Multer.File = req.file as unknown as Express.Multer.File;

  if (!file) return next(new AppError(400, "Please provide us your new image"));

  const secure_url = await Cloudinary.updateCategoryThumbnail(
    file,
    category.thumbnail
  );

  category.thumbnail = secure_url;
  await category.save({ validateBeforeSave: false });

  res.status(201).json({ url: secure_url });
});

export const pickArticle = Async(async (req, res, next) => {
  const { articleId } = req.params;
  const { picked } = req.body;

  const article = await Article.findByIdAndUpdate(articleId, {
    $set: { picked },
  });

  if (!article) return next(new AppError(404, "Article does not exists"));

  res.status(201).json("Article is Picked");
});
