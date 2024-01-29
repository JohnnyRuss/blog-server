import * as express from "express";

interface ReqUserT {
  _id: string;
  username: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user: Record<ReqUserT>;
      incomingUser: Record<ReqUserT> | null;
      file: Express.Multer.File;
      editedFileName: string | string[];
      originalFileName: string | string[];
      files: { [key: string]: Express.Multer.File[] } | Express.Multer.File[];
    }
  }
}
