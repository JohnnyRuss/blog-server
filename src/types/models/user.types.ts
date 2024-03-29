import { Model, Document, Types as MongooseTypes } from "mongoose";

export interface UserT extends Document {
  _id: MongooseTypes.ObjectId;
  role: string;
  username: string;
  fullname: string;
  email: string;
  bio: string;
  avatar: string;
  following: Array<MongooseTypes.ObjectId>;
  password: string;
  confirmEmailPin: string;
  emailPinResetAt: string;
  passwordResetToken: string;
  passwordResetAt: string;
}

export interface UserMethodsT {
  checkPassword: (
    candidatePassword: string,
    password: string
  ) => Promise<boolean>;
  createPasswordResetToken: () => Promise<string>;
  createConfirmEmailPin: () => Promise<string>;
}

export type UserModelT = Model<UserT, {}, UserMethodsT>;
