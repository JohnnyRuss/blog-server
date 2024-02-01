import mongoose from "mongoose";
import { Async, AppError } from "../lib";
import { UserList, User } from "../models";

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

  if (limit) query.limit(+limit);

  let lists = await query;

  lists =
    lists[0]?.author._id.toString() === incomingUser._id
      ? lists
      : lists.filter((list) => list.privacy !== "PRIVATE");

  res.status(200).json(lists);
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

  if (!list) return next(new AppError(404, "list does not exists"));
  else if (list.author.toString() !== currUser._id)
    return next(new AppError(403, "You are not authorized for this operation"));

  if (list.articles.some((article) => article.article.toString() === articleId))
    await UserList.findByIdAndUpdate(listId, {
      $pull: { articles: { article: articleId } },
    });
  else
    await UserList.findByIdAndUpdate(listId, {
      $push: { articles: { article: articleId } },
    });

  res.status(204).json("article added to list");
});

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
