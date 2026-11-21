import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { getDatabase, getMongoClient } from "./db.js";

let auth;

export const getAuth = () => {
  if (!auth) {
    if (!process.env.BETTER_AUTH_SECRET) {
      throw new Error("BETTER_AUTH_SECRET is required to verify sessions");
    }

    auth = betterAuth({
      database: mongodbAdapter(getDatabase(), {
        client: getMongoClient(),
      }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      user: {
        additionalFields: {
          role: {
            type: ["customer", "technician", "admin"],
            required: false,
            defaultValue: "customer",
            input: true,
            transform: {
              input: (value) =>
                value === "technician" ? "technician" : "customer",
            },
          },
        },
      },
      emailAndPassword: {
        enabled: true,
      },
    });
  }

  return auth;
};
