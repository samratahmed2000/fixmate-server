import { MongoClient } from "mongodb";

let database;

export const connectToMongoDB = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
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
