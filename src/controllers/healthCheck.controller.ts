import { Async } from "../lib";

export const checkHealth = Async(async (_, res) => {
  res.status(200).json({ isAlive: true });
});
