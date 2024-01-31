import multer from "multer";

import { Category, Article } from "../models";
import { Async, AppError, Cloudinary } from "../lib";

export const fileUpload = multer({
  storage: multer.memoryStorage(),
}).single("thumbnail");

export const uploadCate4goryThumbnail = Async(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await Category.findById(categoryId);

  if (!category) return next(new AppError(404, "User does not exists"));

  const file: Express.Multer.File = req.file as unknown as Express.Multer.File;

  if (!file) return next(new AppError(400, "Please provide us your new image"));

  const base64 = Buffer.from(file.buffer).toString("base64");
  let dataURI = `data:${file.mimetype};base64,${base64}`;

  const { secure_url } = await Cloudinary.uploader.upload(dataURI, {
    resource_type: "image",
    folder: "images",
    format: "webp",
  });

  if (category.thumbnail) {
    const generatePublicIds = (url: string): string => {
      const fragments = url.split("/");
      return fragments
        .slice(fragments.length - 2)
        .join("/")
        .split(".")[0];
    };

    const imagePublicId = generatePublicIds(category.thumbnail);

    await Cloudinary.api.delete_resources([imagePublicId], {
      resource_type: "image",
    });
  }

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
