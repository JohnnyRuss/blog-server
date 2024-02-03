import mongoose from "mongoose";

import { Async, AppError } from "../lib";
import { User, UserTrace, Article } from "../models";
import { UserT } from "../types/models/user.types";
import { UserTraceT } from "../types/models/userTrace.types";

export const getWhoToFollow = Async(async (req, res, next) => {
  const currUser = req.user;

  const user: UserT = (await User.findById(currUser._id)) as UserT;
  const trace: UserTraceT = (await UserTrace.findOne({
    user: currUser._id,
  })) as UserTraceT;

  const userFollowing = user.following;
  const userTrace = Array.from(
    new Set((trace?.views || []).concat(trace?.interests || []))
  );

  const authors = await Article.aggregate([
    {
      $match: {
        author: {
          $not: {
            $in: [...userFollowing, new mongoose.Types.ObjectId(currUser._id)],
          },
        },
      },
    },
    {
      $group: {
        _id: "$author",
        author: { $first: "$author" },
        categories: { $push: "$categories" },
      },
    },
    {
      $project: {
        _id: 0,
        author: 1,
        categories: {
          $reduce: {
            input: "$categories",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this"] },
          },
        },
      },
    },
    {
      $unwind: "$categories",
    },
    {
      $group: {
        _id: "$author",
        categories: { $addToSet: "$categories" },
      },
    },
    {
      $addFields: {
        common: {
          $size: {
            $setIntersection: ["$categories", userTrace],
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
        localField: "_id",
        as: "author",
        from: "users",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              fullname: 1,
              username: 1,
              email: 1,
              avatar: 1,
              bio: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$author",
    },
    {
      $project: {
        _id: "$author._id",
        fullname: "$author.fullname",
        email: "$author.email",
        bio: "$author.bio",
        username: "$author.username",
        avatar: "$author.avatar",
      },
    },
  ]);

  res.status(200).json(authors);
});

export const getFollowingUsers = Async(async (req, res, next) => {
  const currUser = req.user;

  const user = await User.findById(currUser._id).populate({
    path: "following",
    select: "username fullname email avatar _id",
  });

  if (!user) return next(new AppError(404, "User does not exists"));

  res.status(200).json(user?.following);
});
