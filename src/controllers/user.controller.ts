import mongoose from "mongoose";
import { Async, AppError, Cloudinary, Email } from "../lib";
import { User } from "../models";

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

  req.user = {
    ...currUser,
    email: user.email,
  };

  res.status(201).json({ key, value });
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

  const base64 = Buffer.from(file.buffer).toString("base64");
  let dataURI = `data:${file.mimetype};base64,${base64}`;

  const { secure_url } = await Cloudinary.uploader.upload(dataURI, {
    resource_type: "image",
    folder: "users",
    format: "webp",
  });

  if (USER_DEFAULT_AVATAR !== user?.avatar) {
    const generatePublicIds = (url: string): string => {
      const fragments = url.split("/");
      return fragments
        .slice(fragments.length - 2)
        .join("/")
        .split(".")[0];
    };

    const imagePublicId = generatePublicIds(user.avatar);

    await Cloudinary.api.delete_resources([imagePublicId], {
      resource_type: "image",
    });
  }

  user.avatar = secure_url;
  await user.save({ validateBeforeSave: false });

  res.status(201).json({ url: secure_url });
});

export const deleteProfileImage = Async(async (req, res, next) => {
  const currUser = req.user;
  const { username } = req.params;
  const { url } = req.body;

  const user = await User.findOne({ username });

  if (!url) return next(new AppError(400, "Please provide us image to delete"));
  else if (!user) return next(new AppError(404, "User does not exists"));
  else if (currUser._id !== user._id.toString())
    return next(new AppError(403, "You are not authorized for this operation"));

  const fragments = url.split("/");
  const imagePublicId = fragments
    .slice(fragments.length - 2)
    .join("/")
    .split(".")[0];

  await Cloudinary.api.delete_resources([imagePublicId], {
    resource_type: "image",
  });

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

  if (currUser._id !== userId || !password)
    return next(new AppError(403, "You are not allowed for this operation"));

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId)
      .select("+password")
      .session(session);

    if (!user)
      return next(new AppError(403, "You are not allowed for this operation"));

    const isValidPassword = await user.checkPassword(
      password as string,
      user.password
    );

    if (!isValidPassword)
      return next(new AppError(403, "You are not allowed for this operation"));

    await User.findByIdAndDelete(userId).session(session);

    res.clearCookie("Authorization");

    await Email.sendDeleteAccount({ to: user.email, username: user.username });

    await session.commitTransaction();
    await session.endSession();

    res.status(204).json("user is deleted");
  } catch (error) {
    await session.abortTransaction();
    return next(new AppError(400, "Failed to delete user"));
  }
});
