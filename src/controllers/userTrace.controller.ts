import mongoose from "mongoose";
import { Async, AppError, API_FeatureUtils } from "../lib";
import { UserTrace, Article, UserList } from "../models";

export const getUserTrace = Async(async (req, res, next) => {
  res.status(200).json("");
});

export const updateUserTrace = Async(async (req, res, next) => {
  const { target } = req.query;
  const currUser = req.incomingUser;

  const article = await Article.findOneAndUpdate(
    { slug: target },
    { $inc: { views: 1 } },
    { new: true }
  );

  if (!article) return next(new AppError(404, "Article does not exists"));

  if (currUser) {
    const trace = await UserTrace.findOne({ user: currUser._id });

    if (!trace) return next(new AppError(404, "Trace does not exists"));

    const traceQuery: { [key: string]: any } = {
      $addToSet: {
        views: article.categories,
      },
    };

    // update history if is allowed
    if (article.author._id.toString() !== currUser._id.toString()) {
      const articleChronicle = trace.history.filter(
        (history) => history.article.toString() === article._id.toString()
      );

      const lastInChronicle = articleChronicle[articleChronicle.length - 1];

      const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

      const isMoreThenOneDay = () =>
        lastInChronicle &&
        Math.abs(Date.now() - new Date(lastInChronicle.readAt).getTime()) >
          oneDayInMilliseconds;

      const isAllowedToPush = !lastInChronicle || isMoreThenOneDay();

      if (isAllowedToPush)
        traceQuery["$push"] = {
          history: { article: article._id, readAt: new Date() },
        };
    }

    await UserTrace.findOneAndUpdate({ user: currUser._id }, traceQuery);
  }

  res.status(201).json("user trace is updated");
});

export const getUserHistory = Async(async (req, res, next) => {
  const currUser = req.user;

  const queryUtils = new API_FeatureUtils(
    req.query as { [key: string]: string }
  );

  const paginationObject = queryUtils.getPaginationInfo();

  const [data] = await UserTrace.aggregate([
    {
      $facet: {
        pagination: [
          {
            $match: {
              user: new mongoose.Types.ObjectId(currUser._id),
            },
          },

          {
            $project: {
              history: 1,
            },
          },

          {
            $unwind: "$history",
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
        history: [
          {
            $match: {
              user: new mongoose.Types.ObjectId(currUser._id),
            },
          },

          {
            $project: {
              history: 1,
            },
          },

          {
            $unwind: "$history",
          },

          {
            $replaceRoot: {
              newRoot: "$history",
            },
          },

          {
            $sort: {
              readAt: -1,
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
            $project: {
              readAt: "$readAt",
              _id: "$article._id",
              title: "$article.title",
              author: "$article.author",
              categories: "$article.categories",
              body: "$article.body",
              likes: "$article.likes",
              createdAt: "$article.createdAt",
              slug: "$article.slug",
            },
          },
        ],
      },
    },
  ]);

  const { pagination, history } = data;
  const total = pagination[0]?.sum || 0;
  const currentPage = paginationObject.currentPage;
  const pagesCount = Math.ceil(total / paginationObject.limit);

  res.status(200).json({
    currentPage,
    data: history,
    hasMore: currentPage < pagesCount,
  });
});

export const clearUserHistory = Async(async (req, res, next) => {
  const currUser = req.user;

  await UserTrace.findOneAndUpdate(
    { user: currUser._id },
    { $set: { history: [] } }
  );

  res.status(204).json("user reading history is cleared");
});

export const saveList = Async(async (req, res, next) => {
  const { listId } = req.params;
  const currUser = req.user;

  const candidateList = await UserList.findById(listId);

  if (!candidateList) return next(new AppError(404, "list does not  exists"));

  const userListWithCurrentId = await UserList.findOne({
    author: currUser._id,
    _id: listId,
  });

  if (userListWithCurrentId)
    return next(new AppError(400, "you cant save your own list"));

  if (candidateList.privacy === "PRIVATE")
    return new AppError(400, "You are not allowed for this operation");

  await UserTrace.findOneAndUpdate(
    { user: currUser._id },
    { $addToSet: { savedLists: listId } }
  );

  res.status(201).json("list is saved successfully");
});

export const removeSavedList = Async(async (req, res, next) => {
  const { listId } = req.params;
  const currUser = req.user;

  await UserTrace.findOneAndUpdate(
    { user: currUser._id },
    { $pull: { savedLists: listId } }
  );

  res.status(204).json("list is removed successfully");
});

export const getSavedLists = Async(async (req, res, next) => {
  const { userId } = req.params;

  const [data] = await UserTrace.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $project: { savedLists: 1 } },
    {
      $lookup: {
        localField: "savedLists",
        foreignField: "_id",
        from: "userlists",
        as: "savedLists",
        pipeline: [
          { $match: { privacy: "PUBLIC" } },
          {
            $lookup: {
              localField: "author",
              foreignField: "_id",
              from: "users",
              as: "author",
              pipeline: [
                { $project: { avatar: 1, _id: 1, fullname: 1, username: 1 } },
              ],
            },
          },
          {
            $unwind: "$author",
          },
          {
            $lookup: {
              localField: "articles.article",
              foreignField: "_id",
              from: "articles",
              as: "articleDetails",
              pipeline: [{ $project: { title: 1, _id: 1, body: 1 } }],
            },
          },
          {
            $addFields: {
              articles: {
                $map: {
                  input: "$articles",
                  as: "article",
                  in: {
                    article: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$articleDetails",
                            as: "articleDetail",
                            cond: {
                              $eq: ["$$articleDetail._id", "$$article.article"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                    savedAt: "$$article.savedAt",
                  },
                },
              },
            },
          },
          {
            $project: {
              articles: 1,
              author: 1,
              title: 1,
              description: 1,
              privacy: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json(data.savedLists);
});

export const getSavedListsIds = Async(async (req, res, next) => {
  const currUser = req.user;

  const userTrace = await UserTrace.findOne({ user: currUser._id });

  const userSavedListsIds = userTrace?.savedLists || [];

  res.status(200).json(userSavedListsIds);
});
