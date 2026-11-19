import { getDatabase } from "../config/db.js";

export const getAllCategories = async () => {
  const categoryCollection = getDatabase().collection("categories");

  const categories = await categoryCollection.find().toArray();

  return categories;
};
