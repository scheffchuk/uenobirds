import { v } from "convex/values";

export const maskValidator = v.object({
  w: v.number(),
  h: v.number(),
  bits: v.string(),
});
