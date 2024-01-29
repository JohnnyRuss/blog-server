import { Async } from "../lib";
import { Category, UserTrace } from "../models";

export const getCategories = Async(async (req, res) => {
  const { limit, userbased } = req.query;
  const incomingUser = req.incomingUser;

  const trace = incomingUser
    ? await UserTrace.findOne({ user: incomingUser._id })
    : { views: [], interests: [] };

  const userTrace = Array.from(
    new Set((trace?.views || []).concat(trace?.interests || []))
  );

  const queryLimit = limit ? +limit : 1e9;

  const data = await Category.aggregate([
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
