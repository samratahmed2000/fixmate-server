import { getDatabase } from "../config/db.js";

export const getAllCategories = async () => {
  const categoryCollection = getDatabase().collection("categories");
  const categories = await categoryCollection.find().toArray();
  return categories;
};

export const categoryExists = async (category) => {
  if (typeof category !== "string" || !category.trim()) return false;

  const value = category.trim();
  const document = await getDatabase()
    .collection("categories")
    .findOne(
      { $or: [{ title: value }, { slug: value }] },
      { projection: { _id: 1 } },
    );

  return Boolean(document);
};
