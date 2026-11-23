import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

export const getTechnicianApplication = async (userId) =>
  getDatabase()
    .collection("user")
    .findOne(
      { _id: new ObjectId(userId) },
      { projection: { technicianApplication: 1 } },
    );

export const submitTechnicianApplication = async (
  userId,
  application,
) => {
  const submittedAt = new Date();
  const result = await getDatabase()
    .collection("user")
    .updateOne(
      {
        _id: new ObjectId(userId),
        role: "customer",
        technicianApplication: { $exists: false },
      },
      {
        $set: {
          technicianApplication: {
            ...application,
            status: "pending",
            submittedAt,
          },
        },
      },
    );

  return { result, submittedAt };
};

export const getUserRole = async (userId) => {
  const user = await getDatabase()
    .collection("user")
    .findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
  return user?.role ?? null;
};
