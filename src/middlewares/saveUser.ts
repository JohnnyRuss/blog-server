import { ReqUserT } from "../index";
import { User } from "../models";
import { Async, AppError, JWT } from "../lib";

const saveUser = Async(async function (req, _, next) {
  const authorizationHeader = req.headers.authorization;

  const returnDefault = () => {
    req.incomingUser = null;
    return next();
  };

  if (
    !authorizationHeader ||
    (authorizationHeader && !authorizationHeader.startsWith("Bearer "))
  )
    return returnDefault();

  const token = authorizationHeader.split("Bearer ")[1];

  if (!token) return returnDefault();

  try {
    const verifiedToken = await JWT.verifyToken(token, false);
    const user = await User.findById(verifiedToken._id);

    if (!user) return returnDefault();

    const incomingUser: ReqUserT = {
      role: user.role,
      username: user.username,
      email: user.email,
      _id: user._id.toString(),
    };

    req.incomingUser = incomingUser;
  } catch (error) {
    return returnDefault();
  }

  next();
});

export default saveUser;
