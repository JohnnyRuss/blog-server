import mongoose from "mongoose";
import { AppError, Async, API_FeatureUtils } from "../lib";
import { Article, Category, UserTrace, UserList } from "../models";
import { CategoryT as CategoryDocT } from "../types/models/category.types";
import { ArticleT as ArticleDocT } from "../types/models/article.types";

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
  const { slug } = req.params;
  const currUser = req.user;

  const article = await Article.findOne({ slug });

  if (!article) return next(new AppError(404, "Article does not exists"));

  if (article.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized or this operation"));

  const categoryIds = await getCategoryIds(categories as Array<CategoryT>);

  article.title = title;
  article.body = body;
  article.categories = categoryIds;

  await article.save({ validateBeforeSave: true });

  res.status(201).json("Article is updated");
});

export const deleteArticle = Async(async (req, res, next) => {
  const { slug } = req.params;
  const { id } = req.query;
  const currUser = req.user;

  const article = await Article.findOne({ slug });

  if (!article) return next(new AppError(404, "Article does not exists"));

  if (article.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized or this operation"));

  const articleOjectId = new mongoose.Types.ObjectId(id as string);

  await UserList.updateMany(
    { articles: articleOjectId },
    { $pull: { articles: articleOjectId } }
  );

  await UserTrace.updateMany(
    { "history.article": articleOjectId },
    { $pull: { history: { article: articleOjectId } } }
  );

  await article.deleteOne();

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
      select: "_id title color query",
    });

  if (!article) return next(new AppError(404, "Article does not exists"));

  res.status(200).json(article);
});

export const getTopArticle = Async(async (req, res, next) => {
  const incomingUser = req.incomingUser;

  const queryObject: { [key: string]: any } = {};
  let candidateCategories: Array<mongoose.Types.ObjectId> = [];

  if (incomingUser) {
    const userTrace = await UserTrace.findOne({
      user: incomingUser._id,
    }).populate("history.article");

    if (!userTrace) return;

    const userInterests = userTrace.interests.map((interestId) =>
      interestId.toString()
    );
    const userViews = userTrace.views.map((viewId) => viewId.toString());
    const userHistoryCategories = userTrace.history.flatMap(
      (history) =>
        (history.article as unknown as ArticleDocT)?.categories.map(
          (category) => category.toString()
        ) || []
    );

    candidateCategories = Array.from(
      new Set(userInterests.concat(userViews).concat(userHistoryCategories))
    ).map((category) => new mongoose.Types.ObjectId(category));

    queryObject.author = { $ne: new mongoose.Types.ObjectId(incomingUser._id) };
    if (candidateCategories.length > 0)
      queryObject.categories = { $in: candidateCategories };
  }

  let [topArticle] = await Article.aggregate([
    { $match: queryObject },
    {
      $addFields: {
        commonCategories: {
          $size: { $setIntersection: ["$categories", candidateCategories] },
        },
      },
    },
    { $sort: { commonCategories: -1, views: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "author",
        pipeline: [
          {
            $project: { _id: 1, username: 1, avatar: 1, fullname: 1, email: 1 },
          },
        ],
      },
    },
    { $unwind: "$author" },
    {
      $lookup: {
        from: "categories",
        localField: "categories",
        foreignField: "_id",
        as: "categories",
        pipeline: [{ $project: { _id: 1, title: 1, color: 1, query: 1 } }],
      },
    },
  ]);

  if (!topArticle) {
    const articles = await Article.find({ author: { $ne: incomingUser._id } })
      .sort("-createdAt -views")
      .skip(4)
      .limit(1)
      .populate({ path: "categories", select: "_id title color query" })
      .populate({
        path: "author",
        select: "_id username avatar fullname email",
      });

    topArticle = articles[0];
  }

  res.status(200).json(topArticle);
});

export const getAllArticles = Async(async (req, res, next) => {
  const { userbased } = req.query;
  const incomingUser = req.incomingUser;

  const queryUtils = new API_FeatureUtils(
    req.query as { [key: string]: string }
  );

  const paginationObject = queryUtils.getPaginationInfo();
  const sortObject = queryUtils.getAggregationSortQueryObject();
  const filterObject = { ...queryUtils.getArticlesQueryObject() };

  if (incomingUser)
    filterObject.author = {
      $ne: new mongoose.Types.ObjectId(incomingUser._id),
    };

  const userTrace: Array<mongoose.Types.ObjectId> = [];

  if (userbased === "1" && incomingUser) {
    const trace = await UserTrace.findOne({ user: incomingUser._id });

    const userViews = trace?.views || [];
    const userInterests = trace?.interests || [];

    Array.from(new Set(userInterests.concat(userViews))).forEach((c) =>
      userTrace.push(c)
    );
  }

  const categoryLookupStage = {
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
  };

  const authorLookupStage = {
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
  };

  const paginationStage = [
    { ...categoryLookupStage },

    { $match: { ...filterObject } },

    { $group: { _id: null, sum: { $sum: 1 } } },

    { $project: { _id: 0 } },
  ];

  const [data] = await Article.aggregate([
    {
      $facet: {
        pagination: paginationStage,
        articles: [
          { $unset: ["__v", "updatedAt"] },

          { ...categoryLookupStage },

          { $match: { ...filterObject } },

          {
            $addFields: {
              common: {
                $size: { $setIntersection: ["$categories._id", userTrace] },
              },
            },
          },

          { $sort: { ...sortObject } },

          { $skip: paginationObject.skip },

          { $limit: paginationObject.limit },

          { $lookup: authorLookupStage },

          { $unwind: "$author" },

          { $unset: "common" },
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
  const incomingUser = req.incomingUser;

  const article = await Article.findOne({ slug });

  const trace: Array<mongoose.Types.ObjectId> = article?.categories ?? [];

  let data = await Article.aggregate([
    {
      $unset: ["__v", "updatedAt"],
    },

    {
      $match: {
        slug: { $ne: slug },
        author: { $ne: incomingUser._id },
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

  if (data.length < 6) {
    const dataIds = data.map((article) => article._id.toString());

    const dataToFill = await Article.find({
      _id: { $nin: dataIds },
      author: { $ne: incomingUser._id },
    })
      .select("_id author body categories createdAt likes slug title views")
      .populate([
        {
          path: "author",
          select: "_id avatar email fullname username",
        },
        {
          path: "categories",
          select: "_id color query title",
        },
      ])
      .sort("-views")
      .limit(6 - data.length);

    data = data.concat(dataToFill);
  }

  res.status(200).json(data);
});

export const getUserArticles = Async(async (req, res, next) => {
  const { username } = req.params;
  const { limit } = req.query;

  const matchQuery: { [key: string]: string } = { "author.username": username };

  const agregationPipeline: any = [
    {
      $lookup: {
        from: "users",
        as: "author",
        localField: "author",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              username: 1,
              fullname: 1,
              avatar: 1,
              email: 1,
            },
          },
        ],
      },
    },

    { $unwind: "$author" },

    { $match: matchQuery },

    {
      $lookup: {
        from: "categories",
        as: "categories",
        localField: "categories",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              title: 1,
              query: 1,
              color: 1,
              thumbnail: 1,
            },
          },
        ],
      },
    },

    {
      $project: {
        _id: 1,
        slug: 1,
        title: 1,
        body: 1,
        author: 1,
        categories: 1,
        createdAt: 1,
        picked: 1,
        likes: 1,
        commentsCount: 1,
      },
    },

    { $sort: { createdAt: -1 } },
  ];

  if (limit)
    agregationPipeline.push({ $limit: Math.abs(parseInt(limit as string)) });

  const data = await Article.aggregate(agregationPipeline);

  res.status(200).json(data);
});

export const likeArticle = Async(async (req, res, next) => {
  const { articleId } = req.params;
  const currUser = req.user;

  const candidateArticle = await Article.findById(articleId);

  if (!candidateArticle)
    return next(new AppError(404, "Article does  not exists"));

  if (candidateArticle.likes.includes(currUser._id)) {
    candidateArticle.likes = candidateArticle.likes.filter(
      (like) => like.toString() !== currUser._id
    );
  } else {
    candidateArticle.likes.push(currUser._id);
  }

  await candidateArticle.save();

  res.status(201).json("article is liked");
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

        categoryIds.push(
          (newCategory._id as mongoose.Types.ObjectId).toString()
        );
      })
    );

  return categoryIds.map((id) => new mongoose.Types.ObjectId(id));
}
