import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

const toIsoString = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const getDashboardOverview = async (role, userId) => {
  const database = getDatabase();

  if (role === "customer") {
    const bookings = database.collection("bookings");
    const [totalRequests, activeJobs, completedJobs] = await Promise.all([
      bookings.countDocuments({ customerId: userId }),
      bookings.countDocuments({
        customerId: userId,
        status: { $regex: "^(in-progress|on-progress)$", $options: "i" },
      }),
      bookings.countDocuments({
        customerId: userId,
        status: { $regex: "^completed$", $options: "i" },
      }),
    ]);

    return [
      { title: "Total Requests", value: totalRequests },
      { title: "Active Jobs", value: activeJobs },
      { title: "Completed Jobs", value: completedJobs },
    ];
  }

  if (role === "technician") {
    const services = database.collection("services");
    const [totalServices, approvedServices, pendingServices] =
      await Promise.all([
        services.countDocuments({ technicianId: userId }),
        services.countDocuments({
          technicianId: userId,
          approvalStatus: { $regex: "^approved$", $options: "i" },
        }),
        services.countDocuments({
          technicianId: userId,
          approvalStatus: { $regex: "^pending$", $options: "i" },
        }),
      ]);

    return [
      { title: "Total Services", value: totalServices },
      { title: "Approved Services", value: approvedServices },
      { title: "Pending Services", value: pendingServices },
    ];
  }

  const users = database.collection("user");
  const services = database.collection("services");
  const [totalUsers, totalTechnicians, pendingServices] = await Promise.all([
    users.countDocuments({ role: { $ne: "admin" } }),
    users.countDocuments({ role: "technician" }),
    services.countDocuments({
      approvalStatus: { $regex: "^pending$", $options: "i" },
    }),
  ]);

  return [
    { title: "Total Users", value: totalUsers },
    { title: "Total Technicians", value: totalTechnicians },
    { title: "Pending Services", value: pendingServices },
  ];
};

export const getDashboardHistory = async (role, userId) => {
  const database = getDatabase();

  if (role === "customer") {
    const bookings = await database
      .collection("bookings")
      .find({ customerId: userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .toArray();
    const serviceCollection = database.collection("services");

    return Promise.all(
      bookings.map(async (booking) => {
        const serviceId = booking.serviceId?.toString();
        const service =
          serviceId && ObjectId.isValid(serviceId)
            ? await serviceCollection.findOne(
                { _id: new ObjectId(serviceId) },
                { projection: { title: 1 } },
              )
            : null;

        return {
          id: booking._id.toString(),
          title: service?.title || "Repair request",
          detail: "Repair booking",
          status: String(booking.status || "requested"),
          createdAt: toIsoString(booking.createdAt),
        };
      }),
    );
  }

  if (role === "technician") {
    const services = await database
      .collection("services")
      .find({ technicianId: userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(6)
      .toArray();

    return services.map((service) => ({
      id: service._id.toString(),
      title: String(service.title || "Untitled service"),
      detail: [service.category, service.serviceArea]
        .filter((value) => typeof value === "string" && value)
        .join(" · "),
      status: String(service.approvalStatus || "Pending"),
      createdAt: toIsoString(service.createdAt),
    }));
  }

  const services = await database
    .collection("services")
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .limit(6)
    .toArray();

  return services.map((service) => ({
    id: service._id.toString(),
    title: String(service.title || "Untitled service"),
    detail: [service.technicianName, service.category]
      .filter((value) => typeof value === "string" && value)
      .join(" · "),
    status: String(service.approvalStatus || "Pending"),
    createdAt: toIsoString(service.createdAt),
  }));
};
