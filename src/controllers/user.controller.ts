import mongoose from "mongoose";
import { Async, AppError, Cloudinary, Email, JWT } from "../lib";
import { User, UserList, Article, UserTrace, Comment } from "../models";

import multer from "multer";
import { USER_DEFAULT_AVATAR } from "../config/config";

export const fileUpload = multer({
  storage: multer.memoryStorage(),
}).single("file");

export const getUserDetails = Async(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) return next(new AppError(404, "User does not exists"));

  const userDetails = {
    _id: user._id,
    email: user.email,
    username: user.username,
    fullname: user.fullname,
    avatar: user.avatar,
    bio: user.bio,
  };

  res.status(200).json(userDetails);
});

export const updateUser = Async(async (req, res, next) => {
  const currUser = req.user;
  const { username } = req.params;
  const { key, value }: { key: string; value: string } = req.body;

  const user = await User.findById(currUser._id);

  if (!user || username !== user.username)
    return next(new AppError(404, "User does not exists"));

  (user as any)[key] = value;

  await user.save();

  const response: { [key: string]: string } = { key, value };

  if (key == "username") {
    const reqUser = {
      ...currUser,
      _id: user._id,
      username: user.username,
      email: user.email,
    };

    const { accessToken } = JWT.assignToken({ signature: reqUser, res });

    response.accessToken = accessToken;
  }

  res.status(201).json(response);
});

export const updateProfileImage = Async(async (req, res, next) => {
  const currUser = req.user;
  const { username } = req.params;

  const user = await User.findOne({ username });

  if (!user) return next(new AppError(404, "User does not exists"));
  else if (currUser._id !== user._id.toString())
    return next(new AppError(403, "You are not authorized for this operation"));

  const file: Express.Multer.File = req.file as unknown as Express.Multer.File;

  if (!file) return next(new AppError(400, "Please provide us your new image"));

  const secure_url = await Cloudinary.updateProfileImage(file, user.avatar);

  user.avatar = secure_url;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ url: secure_url });
});

export const deleteProfileImage = Async(async (req, res, next) => {
  const currUser = req.user;
  const { username } = req.params;
  const { url } = req.body;

  if (!url) return next(new AppError(400, "Please provide us image to delete"));

  const user = await User.findOne({ username });

  if (!user) return next(new AppError(404, "User does not exists"));
  else if (currUser._id !== user._id.toString())
    return next(new AppError(403, "You are not authorized for this operation"));

  await Cloudinary.deleteImage(url);

  user.avatar = USER_DEFAULT_AVATAR;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ url: USER_DEFAULT_AVATAR });
});

export const searchUsers = Async(async (req, res, next) => {
  const { search } = req.query;

  const searchRegex = new RegExp(search as string, "i");

  const users = await User.find({
    $or: [{ username: searchRegex }, { email: searchRegex }],
  }).select("username email avatar _id");

  res.status(200).json(users);
});

export const deleteUser = Async(async (req, res, next) => {
  const { userId } = req.params;
  const { password } = req.body;
  const currUser = req.user;

  // STEP 1 - Validate User and Password

  if (currUser._id !== userId || !password)
    return next(new AppError(403, "You are not allowed for this operation"));

  const user = await User.findById(userId).select("+password");

  if (!user) return next(new AppError(404, "Can't find the user"));

  const isValidPassword = await user.checkPassword(
    password as string,
    user.password
  );

  if (!isValidPassword)
    return next(new AppError(403, "You are not allowed for this operation"));

  // STEP 2 - Create Session for User atomic deletion

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // STEP 3 - Read User Data which must be deleted and are in relation to other documents
    const userLists = await UserList.find({
      author: currUser._id,
    }).session(session);

    const userArticles = await Article.find({
      author: currUser._id,
    }).session(session);

    const getIds = (item: { _id: mongoose.Types.ObjectId }): string =>
      item._id.toString();

    const userListsIds = userLists.map(getIds);
    const userArticlesIds = userArticles.map(getIds);

    // STEP 4 - Start Atomic Deletion

    await UserList.deleteMany({ author: currUser._id }).session(session);
    await Article.deleteMany({ author: currUser._id }).session(session);

    await UserTrace.findOneAndDelete({ user: currUser._id }).session(session);

    await UserList.updateMany({
      $pull: { articles: { article: userArticlesIds } },
    }).session(session);

    await UserTrace.updateMany({
      $pull: {
        savedLists: { $in: userListsIds },
        history: { article: userArticlesIds },
      },
    }).session(session);

    await Comment.deleteMany({
      $or: [{ articleId: { $in: userArticlesIds } }, { author: currUser._id }],
    }).session(session);

    await User.updateMany({
      $pull: { following: currUser._id },
    }).session(session);

    await Cloudinary.deleteImage(user.avatar);

    await User.findByIdAndDelete(currUser._id).session(session);

    res.clearCookie("Authorization");
    res.clearCookie("Session");

    await Email.sendDeleteAccount({ to: user.email, username: user.username });

    await session.commitTransaction();

    res.status(204).json("user is deleted");
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(400, "Failed to delete user"));
  } finally {
    await session.endSession();
  }
});
