import { Types as MongooseTypes, Model, Document } from "mongoose";

type UserTraceT = Document & {
  user: MongooseTypes.ObjectId;
  views: Array<MongooseTypes.ObjectId>;
  history: Array<{ readAt: Date; article: MongooseTypes.ObjectId }>;
  interests: Array<MongooseTypes.ObjectId>;
  savedLists: Array<MongooseTypes.ObjectId>;
};

type UserTraceMethodsT = {};

type UserTraceModelT = Model<UserTraceT, {}, UserTraceMethodsT>;

export type { UserTraceT, UserTraceMethodsT, UserTraceModelT };
