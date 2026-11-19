import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);

let database;

export const connectToMongoDB = async () => {
  try {
    await client.connect();

    database = client.db("fixMate");

    console.log("MongoDB connected successfully!");

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export const getDatabase = () => {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
};
