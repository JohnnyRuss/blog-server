import { Types as MongooseTypes, Document, Model } from "mongoose";

interface CommentT extends Document {
  text: string;
  author: MongooseTypes.ObjectId;
  articleId: string;
  createdAt: string;
}

type CommentMethodsT = {};

type CommentModelT = Model<CommentT, {}, CommentMethodsT>;

export type { CommentT, CommentMethodsT, CommentModelT };
