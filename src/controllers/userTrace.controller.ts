import { Async, AppError } from "../lib";
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
