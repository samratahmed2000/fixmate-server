import "dotenv/config";
import app from "../src/app.js";
import { connectToMongoDB } from "../src/config/db.js";

let databaseConnection;

export default async function handler(req, res) {
  if (!databaseConnection) {
    databaseConnection = connectToMongoDB();
  }

  await databaseConnection;
  return app(req, res);
}
