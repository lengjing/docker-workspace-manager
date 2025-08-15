import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import { Express } from "express";
import { AppDataSource } from "../data-source";

declare global {
  namespace Express {
    // These open interfaces may be extended in an application-specific manner via declaration merging.
    // See for example method-override.d.ts (https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/method-override/index.d.ts)
    interface Request {
      user?: User;
    }
  }
}

const contextUser = (): RequestHandler => {
  return async (req, res, next) => {
    const authorization =
      req.headers["authorization"]?.split(/\s+/)[1] || (req.query.token as string);

    if (authorization) {
      try {
        const decoded = jwt.verify(
          authorization,
          'micmacq'
        ) as jwt.JwtPayload;

        const user = await AppDataSource.getRepository(User).findOneBy({ id: decoded.id })

        if (user?.status === 0) {
          throw Error("The account has been deactivated");
        }

        req.user = user;
      } catch (err) {
        throw Error(err.message);
      }
    }
    next();
  };
};

export default contextUser;
