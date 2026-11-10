
import { betterAuth } from "better-auth";
import pool from "./db";

export const auth = betterAuth({
  database: pool,

  emailAndPassword: {
    enabled: true,
  },

  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
