import { Async, AppError } from "../lib";
import { UserList, User } from "../models";

export const getUserLists = Async(async (req, res, next) => {
  const { userId } = req.params;
  const incomingUser = req.incomingUser;

  let lists = await UserList.find({ author: userId })
    .populate({
      path: "author",
      select: "_id email username fullname avatar",
    })
    .populate({
      path: "articles",
      select: "_id slug title body author categories createdAt picked",
      populate: [
        { path: "author", select: "_id username fullname avatar" },
        { path: "categories", select: "_id title query color thumbnail" },
      ],
    });

  lists =
    lists[0]?.author === incomingUser._id
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

  if (list.articles.some((article) => article.toString() === articleId))
    await UserList.findByIdAndUpdate(articleId, {
      $pull: { articles: articleId },
    });
  else
    await UserList.findByIdAndUpdate(articleId, {
      $push: { articles: articleId },
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
