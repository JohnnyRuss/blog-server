import mongoose from "mongoose";
import { Async, AppError, API_FeatureUtils } from "../lib";
import { UserTrace, Article } from "../models";

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
      const isReadArticle = trace.history.find(
        (history) => history.article.toString() === article._id.toString()
      );

      const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

      const isMoreThenOneDay = () =>
        isReadArticle
          ? Math.abs(Date.now() - new Date(isReadArticle.readAt).getTime()) >
            oneDayInMilliseconds
          : true;

      const isAllowedToPush = !isReadArticle || isMoreThenOneDay();

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

export const clearUserHistory = Async(async (req, res, next) => {});
