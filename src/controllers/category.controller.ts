import { Async } from "../lib";
import { Category, UserTrace } from "../models";

export const getCategories = Async(async (req, res) => {
  const { limit, userbased, search, extract } = req.query;
  const incomingUser = req.incomingUser;

  const trace = incomingUser
    ? await UserTrace.findOne({ user: incomingUser._id })
    : { views: [], interests: [] };

  const userViews = trace?.views || [];
  const userInterests = trace?.interests || [];
  const userTrace = Array.from(new Set(userViews.concat(userInterests)));

  const doExtract = extract === "1";

  const queryLimit = limit ? +limit : 1e9;

  const data = await Category.aggregate([
    {
      $match: {
        title: { $regex: search || "", $options: "i" },
        ...(doExtract ? { _id: { $nin: userInterests } } : {}),
      },
    },

    {
      $addFields: {
        sort: {
          $cond: {
            if: {
              $or: [
                {
                  $and: [
                    { $eq: [userbased, "1"] },
                    { $ne: [incomingUser, null] },
                    { $in: ["$_id", userTrace] },
                  ],
                },
                {
                  $and: [
                    { $eq: [userbased, "-1"] },
                    { $ne: [incomingUser, null] },
                    { $not: { $in: ["$_id", userTrace] } },
                  ],
                },
              ],
            },
            then: 1,
            else: 0,
          },
        },
      },
    },

    {
      $sort: { sort: -1 },
    },

    {
      $limit: queryLimit,
    },

    {
      $unset: ["sort", "__v"],
    },
  ]);

  res.status(200).json(data);
});
