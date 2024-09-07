import mongoose from "mongoose";
import { Async, AppError, API_FeatureUtils } from "../lib";
import { UserList, Article, UserTrace } from "../models";
import { ListArticleT } from "../types/models/userList.types";

export const createList = Async(async (req, res, next) => {
  const currUser = req.user;
  const { title, description, privacy } = req.body;

  const list = await new UserList({
    author: currUser._id,
    title,
    privacy,
    description,
  }).save();

  res.status(201).json(list);
});

export const updateList = Async(async (req, res, next) => {
  const body = req.body;
  const { listId } = req.params;
  const currUser = req.user;

  const list = await UserList.findById(listId);

  if (!list) return next(new AppError(404, "List does not exists"));
  else if (list.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized for this operation"));

  const updatedList = await UserList.findByIdAndUpdate(
    listId,
    { $set: { ...body } },
    { new: true }
  );

  res.status(200).json({
    title: updatedList!.title,
    privacy: updatedList!.privacy,
    description: updatedList!.description,
  });
});

export const deleteList = Async(async (req, res, next) => {
  const { listId } = req.params;
  const currUser = req.user;

  const list = await UserList.findById(listId);

  if (!list) return next(new AppError(404, "list does not exists"));
  else if (list.author.toString() !== currUser._id)
    return next(new AppError(403, "you are not authorized for this operation"));

  await list.deleteOne();

  await UserTrace.updateMany(
    { savedLists: listId },
    { $pull: { savedLists: listId } }
  );

  res.status(204).json("list is deleted");
});

export const getUserLists = Async(async (req, res, next) => {
  const { limit } = req.query;
  const { userId } = req.params;
  const incomingUser = req.incomingUser;

  const query = UserList.find({ author: userId })
    .populate({
      path: "author",
      select: "_id email username fullname avatar",
    })
    .populate({
      path: "articles.article",
      select: "_id slug title body author categories createdAt picked",
      populate: [
        { path: "author", select: "_id username fullname avatar" },
        { path: "categories", select: "_id title query color thumbnail" },
      ],
      options: { limit: 3 },
    });

  let lists = await query;

  lists =
    lists[0]?.author._id.toString() === incomingUser?._id
      ? lists
      : lists.filter((list) => list.privacy !== "PRIVATE");

  res.status(200).json(lists.slice(0, limit ? +limit : lists.length));
});

export const getListsToAdd = Async(async (req, res, next) => {
  const currUser = req.user;
  const lists = await UserList.find({ author: currUser._id });

  res.status(200).json(lists);
});

export const addToList = Async(async (req, res, next) => {
  const currUser = req.user;
  const { listId } = req.params;
  const { articleId } = req.body;

  const list = await UserList.findById(listId);

  const article = await Article.findById(articleId)
    .populate({
      path: "author",
      select: "_id email username fullname avatar",
    })
    .populate({
      path: "categories",
      select: "_id title query color thumbnail",
    })
    .select("_id slug title body author categories createdAt picked likes");

  if (!list) return next(new AppError(404, "list does not exists"));
  else if (list.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized for this operation"));
  else if (!article) return next(new AppError(404, "list does not exists"));

  if (list.articles.some((article) => article.article.toString() === articleId))
    list.articles = list.articles.filter(
      (article) => article.article.toString() !== articleId
    ) as Array<ListArticleT>;
  else
    list.articles = [
      ...list.articles,
      {
        article: new mongoose.Types.ObjectId(articleId),
        savedAt: new Date().toString(),
      },
    ];

  await list.populate({
    path: "articles.article",
    select: "_id slug title body author categories createdAt picked",
    populate: [
      { path: "author", select: "_id username fullname avatar" },
      { path: "categories", select: "_id title query color thumbnail" },
    ],
    // options: { limit: 3 },
  });

  await list.save();

  res.status(201).json(list.articles);
});

export const getRecentlySavedArticles = Async(async (req, res, next) => {
  const currUser = req.user;

  const articles = await UserList.aggregate([
    {
      $match: { author: new mongoose.Types.ObjectId(currUser._id) },
    },

    {
      $project: { articles: 1 },
    },

    {
      $unwind: "$articles",
    },

    {
      $group: {
        _id: "$articles.article",
        savedAt: { $first: "$articles.savedAt" },
      },
    },

    {
      $sort: {
        savedAt: -1,
      },
    },

    {
      $limit: 4,
    },

    {
      $lookup: {
        from: "articles",
        localField: "_id",
        foreignField: "_id",
        as: "article",
        pipeline: [
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
                    fullname: 1,
                    email: 1,
                    bio: 1,
                    username: 1,
                    avatar: 1,
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
                    __v: 0,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$author",
          },
        ],
      },
    },

    {
      $project: {
        article: 1,
      },
    },

    {
      $unwind: "$article",
    },

    {
      $project: {
        _id: "$article._id",
        title: "$article.title",
        author: "$article.author",
        categories: "$article.categories",
        body: "$article.body",
        slug: "$article.slug",
        createdAt: "$article.createdAt",
      },
    },
  ]);

  res.status(200).json(articles);
});

export const getListDetails = Async(async (req, res, next) => {
  const { listId } = req.params;
  const incomingUser = req.incomingUser;

  const list = await UserList.findById(listId)
    .populate({
      path: "author",
      select: "_id username fullname email avatar",
    })
    .select("-__v -articles");

  if (!list) return next(new AppError(404, "List does not exists"));
  else if (
    list.author._id.toString() !== incomingUser?._id &&
    list.privacy === "PRIVATE"
  )
    return next(new AppError(403, "You are not authorized for this operation"));

  res.status(200).json(list);
});

export const getListArticles = Async(async (req, res, next) => {
  const { listId } = req.params;
  const incomingUser = req.incomingUser;

  const list = await UserList.findById(listId);

  if (!list) return next(new AppError(404, "List does not exists"));
  else if (
    list.author.toString() !== incomingUser?._id &&
    list.privacy === "PRIVATE"
  )
    return next(
      new AppError(
        403,
        "You are not authorized for this operation. \n User has deleted the list or change its privacy."
      )
    );

  const queryUtils = new API_FeatureUtils(
    req.query as { [key: string]: string }
  );

  const paginationObject = queryUtils.getPaginationInfo();

  const [data] = await UserList.aggregate([
    {
      $facet: {
        pagination: [
          {
            $match: {
              _id: new mongoose.Types.ObjectId(listId),
            },
          },

          {
            $project: { articles: 1 },
          },

          {
            $unwind: "$articles",
          },

          {
            $group: {
              _id: null,
              sum: { $sum: 1 },
            },
          },
        ],
        articles: [
          {
            $match: {
              _id: new mongoose.Types.ObjectId(listId),
            },
          },

          {
            $project: { articles: 1 },
          },

          {
            $unwind: "$articles",
          },

          {
            $replaceRoot: {
              newRoot: "$articles",
            },
          },

          {
            $sort: {
              savedAt: -1,
            },
          },

          // pagination placement

          {
            $lookup: {
              from: "articles",
              as: "article",
              localField: "article",
              foreignField: "_id",
              pipeline: [
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
              ],
            },
          },

          {
            $unwind: "$article",
          },

          {
            $replaceRoot: {
              newRoot: "$article",
            },
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

export const getSavedArticlesIds = Async(async (req, res, next) => {
  const currUser = req.user;

  const userLists = await UserList.find({ author: currUser._id });

  const savedArticlesIds = userLists
    .flatMap((list) => list.articles)
    .map((article) => article.article.toString());

  const savedArticlesIdsSet = Array.from(new Set(savedArticlesIds));

  res.status(200).json(savedArticlesIdsSet);
});
