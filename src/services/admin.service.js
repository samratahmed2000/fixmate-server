import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

const normalizeApprovalStatus = (status) => {
  const value = String(status || "Pending").toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
};

export const getAdminServices = async (status) => {
  const collection = getDatabase().collection("services");
  if (status === "all") {
    return collection
      .aggregate([
        {
          $addFields: {
            approvalOrder: {
              $switch: {
                branches: [
                  {
                    case: {
                      $eq: [
                        {
                          $toLower: {
                            $ifNull: ["$approvalStatus", "pending"],
                          },
                        },
                        "pending",
                      ],
                    },
                    then: 0,
                  },
                  {
                    case: {
                      $eq: [{ $toLower: "$approvalStatus" }, "approved"],
                    },
                    then: 1,
                  },
                ],
                default: 2,
              },
            },
          },
        },
        { $sort: { approvalOrder: 1, createdAt: 1, _id: 1 } },
        { $project: { approvalOrder: 0 } },
      ])
      .toArray();
  }

  return collection
    .find({
      approvalStatus: { $regex: `^${status}$`, $options: "i" },
    })
    .sort(
      status === "pending"
        ? { createdAt: 1, _id: 1 }
        : { updatedAt: -1, createdAt: -1, _id: -1 },
    )
    .toArray();
};

export const updateAdminServiceApproval = async (id, approvalStatus) => {
  const isApproved = approvalStatus === "Approved";
  return getDatabase()
    .collection("services")
    .updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          approvalStatus,
          isActive: isApproved,
          availability: isApproved ? "Active" : "Not-Active",
          approvedAt: isApproved ? new Date() : null,
          rejectedAt: isApproved ? null : new Date(),
          updatedAt: new Date(),
        },
      },
    );
};

export const getAdminUsers = async () =>
  getDatabase()
    .collection("user")
    .find(
      { role: { $ne: "admin" } },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          image: 1,
          role: 1,
          createdAt: 1,
          technicianApplication: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .toArray();

export const approveTechnicianApplication = async (id) => {
  const now = new Date();
  return getDatabase()
    .collection("user")
    .updateOne(
      {
        _id: new ObjectId(id),
        role: "customer",
        "technicianApplication.status": "pending",
      },
      [
        {
          $set: {
            role: "technician",
            area: "$technicianApplication.serviceArea",
            bio: "$technicianApplication.bio",
            updatedAt: now,
            "technicianApplication.status": "approved",
            "technicianApplication.approvedAt": now,
          },
        },
      ],
    );
};

export { normalizeApprovalStatus };
