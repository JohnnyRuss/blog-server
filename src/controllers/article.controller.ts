import mongoose from "mongoose";
import { AppError, Async, API_FeatureUtils } from "../lib";
import { Article, Category, UserTrace } from "../models";
import { CategoryT as CategoryDocT } from "../types/models/category.types";

type CategoryT = CategoryDocT & { isNew?: boolean; _id: string };

export const createArticle = Async(async (req, res, next) => {
  const { title, categories, body } = req.body;
  const currUser = req.user;

  if (
    !body ||
    !title ||
    !categories ||
    (Array.isArray(categories) && categories.length <= 0)
  )
    return next(new AppError(400, "Invalid data"));

  const categoryIds = await getCategoryIds(categories as Array<CategoryT>);

  await new Article({
    body,
    title,
    author: currUser._id,
    categories: categoryIds,
  }).save();

  res.status(201).json("Article is created");
});

export const updateArticle = Async(async (req, res, next) => {
  const { title, categories, body } = req.body;
  const { articleId } = req.params;
  const currUser = req.user;

  const article = await Article.findById(articleId);

  if (!article) return next(new AppError(404, "Article does not exists"));

  if (article.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized or this operation"));

  const categoryIds = await getCategoryIds(categories as Array<CategoryT>);

  article.title = title;
  article.body = body;
  article.categories = categoryIds;

  article.save({ validateBeforeSave: true });

  res.status(201).json("Article is updated");
});

export const deleteArticle = Async(async (req, res, next) => {
  const { articleId } = req.params;
  const currUser = req.user;

  const article = await Article.findById(articleId);

  if (!article) return next(new AppError(404, "Article does not exists"));

  if (article.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized or this operation"));

  await Article.findByIdAndDelete(articleId);

  res.status(204).json("Article is deleted");
});

export const getArticle = Async(async (req, res, next) => {
  const { slug } = req.params;

  const article = await Article.findOne({ slug })
    .populate({
      path: "author",
      select: "_id username avatar fullname",
    })
    .populate({
      path: "categories",
      select: "_id title color",
    });

  if (!article) return next(new AppError(404, "Article does not exists"));

  res.status(200).json(article);
});

export const getTopArticle = Async(async (req, res, next) => {
  const incomingUser = req.incomingUser;

  const queryObject = incomingUser
    ? {
        author: {
          $ne: incomingUser
            ? new mongoose.Types.ObjectId(incomingUser._id)
            : "",
        },
      }
    : {};

  const [article] = await Article.find(queryObject)
    .sort("-views")
    .limit(1)
    .populate({
      path: "author",
      select: "_id username avatar fullname email",
    })
    .populate({
      path: "categories",
      select: "_id title color query",
    });

  if (!article) return next(new AppError(404, "Article does not exists"));

  res.status(200).json(article);
});

export const getAllArticles = Async(async (req, res, next) => {
  const { userbased } = req.query;
  const incomingUser = req.incomingUser;

  const queryUtils = new API_FeatureUtils(
    req.query as { [key: string]: string }
  );

  const paginationObject = queryUtils.getPaginationInfo();
  const sortObject = queryUtils.getAggregationSortQueryObject();
  const filterObject = {
    ...queryUtils.getArticlesQueryObject(),
    author: {
      $ne:
        incomingUser && userbased === "1"
          ? new mongoose.Types.ObjectId(incomingUser._id)
          : "",
    },
  };

  const userTrace: Array<mongoose.Types.ObjectId> = [];

  if (userbased === "1" && incomingUser) {
    const trace = await UserTrace.findOne({ user: incomingUser._id });

    Array.from(
      new Set((trace?.views || []).concat(trace?.interests || []))
    ).forEach((c) => userTrace.push(c));
  }

  const [data] = await Article.aggregate([
    {
      $facet: {
        pagination: [
          {
            $match: {
              ...filterObject,
            },
          },

          {
            $group: {
              _id: null,
              sum: { $sum: 1 },
            },
          },

          {
            $project: {
              _id: 0,
            },
          },
        ],
        articles: [
          {
            $unset: ["__v", "updatedAt"],
          },

          {
            $match: {
              ...filterObject,
            },
          },

          {
            $addFields: {
              common: {
                $size: {
                  $setIntersection: ["$categories", userTrace],
                },
              },
            },
          },

          {
            $sort: {
              ...sortObject,
            },
          },

          {
            $skip: paginationObject.skip,
          },

          {
            $limit: paginationObject.limit,
          },

          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "author",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    email: 1,
                    avatar: 1,
                    username: 1,
                    fullname: 1,
                  },
                },
              ],
            },
          },

          {
            $lookup: {
              from: "categories",
              localField: "categories",
              foreignField: "_id",
              as: "categories",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    title: 1,
                    color: 1,
                    query: 1,
                  },
                },
              ],
            },
          },

          {
            $unwind: "$author",
          },

          {
            $unset: "common",
          },
        ],
      },
    },
  ]);

  const { pagination, articles } = data;
  const total = pagination[0]?.sum || 0;
  const currentPage = paginationObject.currentPage;
  const pagesCount = Math.ceil(total / paginationObject.limit);

  res.status(200).json({
    currentPage,
    data: articles,
    hasMore: currentPage < pagesCount,
  });
});

export const getRelatedArticles = Async(async (req, res, next) => {
  const { slug } = req.params;

  const article = await Article.findOne({ slug });

  const trace: Array<mongoose.Types.ObjectId> = article?.categories ?? [];

  const data = await Article.aggregate([
    {
      $unset: ["__v", "updatedAt"],
    },

    {
      $match: {
        slug: { $ne: slug },
        categories: { $in: trace },
      },
    },

    {
      $addFields: {
        common: {
          $size: {
            $setIntersection: ["$categories", trace],
          },
        },
      },
    },

    {
      $sort: {
        common: -1,
      },
    },

    {
      $limit: 6,
    },

    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: {
              _id: 1,
              email: 1,
              avatar: 1,
              username: 1,
              fullname: 1,
            },
          },
        ],
      },
    },

    {
      $lookup: {
        from: "categories",
        localField: "categories",
        foreignField: "_id",
        as: "categories",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              color: 1,
              query: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: "$author",
    },

    {
      $unset: "common",
    },
  ]);

  res.status(200).json(data);
});

// UTILS

async function getCategoryIds(
  categories: Array<CategoryT>
): Promise<Array<mongoose.Types.ObjectId>> {
  const newCategories =
    categories?.filter((category: CategoryT) => category.isNew) || [];

  const categoryIds: Array<string> = categories
    .filter((category) => !category.isNew)
    .map((category) => category._id);

  if (newCategories.length > 0)
    await Promise.all(
      newCategories.map(async (c: CategoryT) => {
        const newCategory = await new Category({
          color: c.color,
          query: c.query,
          title: c.title,
        }).save();

        categoryIds.push(newCategory._id.toString());
      })
    );

  return categoryIds.map((id) => new mongoose.Types.ObjectId(id));
}
