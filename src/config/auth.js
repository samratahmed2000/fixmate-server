import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
import { getDatabase, getMongoClient } from "./db.js";

let auth;

export const getAuth = () => {
  if (!auth) {
    if (!process.env.BETTER_AUTH_SECRET) {
      throw new Error("BETTER_AUTH_SECRET is required to verify sessions");
    }

    const trustedOrigins = [
      process.env.CLIENT_URL,
      process.env.BETTER_AUTH_URL,
    ]
      .filter(Boolean)
      .map((origin) => new URL(origin).origin);
    const socialProviders = {};
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      socialProviders.google = {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      };
    }

    auth = betterAuth({
      database: mongodbAdapter(getDatabase(), {
        client: getMongoClient(),
      }),
      secret: process.env.BETTER_AUTH_SECRET,
      baseURL: process.env.BETTER_AUTH_URL,
      trustedOrigins,
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
          phone: {
            type: "string",
            required: false,
            input: true,
          },
          area: {
            type: "string",
            required: false,
            input: true,
          },
          bio: {
            type: "string",
            required: false,
            input: true,
          },
        },
      },
      emailAndPassword: {
        enabled: true,
      },
      plugins: [
        jwt({
          jwt: {
            audience: "fixmate-api",
            definePayload: ({ user }) => ({
              email: user.email,
              name: user.name,
              role: user.role,
            }),
            expirationTime: "15m",
            issuer: "fixmate",
          },
        }),
      ],
      socialProviders,
    });
  }

  return auth;
};
