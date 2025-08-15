import { RequestHandler } from "express";

const needLogin = (): RequestHandler => {
  return async (req, res, next) => {
    if (!req.user) {
      res.status(401)
      throw new Error('Unauthorized');
    }
    next();
  };
};

export default {
  needLogin
};
