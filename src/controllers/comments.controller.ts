import { AppError, Async } from "../lib";
import { Comment, Article } from "../models";

export const createComment = Async(async (req, res, next) => {
  const { text, author, articleId } = req.body;

  const newComment = await Comment.create({ text, author, articleId });

  await newComment.populate({
    path: "author",
    select: "_id username fullname email avatar",
  });

  await Article.findByIdAndUpdate(articleId, {
    $inc: { commentsCount: 1 },
  });

  res.status(201).json(newComment);
});

export const deleteComment = Async(async (req, res, next) => {
  const currUser = req.user;
  const { articleId, commentId } = req.params;

  const article = await Article.findById(articleId);

  if (!article)
    return next(
      new AppError(404, "Article on which this comment belongs doesn't exists")
    );

  const comment = await Comment.findById(commentId);

  if (
    currUser._id !== comment?.author.toString() &&
    currUser._id !== article.author.toString()
  )
    return next(new AppError(404, "You are not authorized for this operation"));
  else if (!comment) return next(new AppError(404, "Comment doesn't exists"));

  await comment.deleteOne();
  await Article.findByIdAndUpdate(articleId, {
    $inc: { commentsCount: -1 },
  });

  res.status(204).json("Comment is deleted");
});

export const updateComment = Async(async (req, res, next) => {
  const { articleId, commentId } = req.params;
  const { text } = req.body;
  const currUser = req.user;

  const article = await Article.findById(articleId);

  if (!article)
    return next(
      new AppError(404, "Article on which this comment belongs doesn't exists")
    );

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    { text },
    { new: true }
  );

  if (comment?.author.toString() !== currUser._id)
    return next(new AppError(404, "You are not authorized for this operation"));
  else if (!comment) return next(new AppError(404, "Comment doesn't exists"));

  res.status(201).json(comment);
});

export const getArticleComments = Async(async (req, res, next) => {
  const { articleId } = req.params;

  const comments = await Comment.find({ articleId }).populate({
    path: "author",
    select: "_id username fullname email avatar",
  });

  res.status(200).json(comments);
});
