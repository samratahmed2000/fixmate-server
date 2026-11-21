import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

const activeBookingStatuses = [
  "requested",
  "accepted",
  "in-progress",
  "on-progress",
  "pending",
];

export const findActiveBooking = async (customerId, serviceId) => {
  return getDatabase()
    .collection("bookings")
    .findOne(
      {
        customerId,
        serviceId: new ObjectId(serviceId),
        status: { $in: activeBookingStatuses },
      },
      { projection: { _id: 1 } },
    );
};

export const addBooking = async (bookingData) => {
  const database = getDatabase();
  const serviceObjectId = new ObjectId(bookingData.serviceId);
  const service = await database.collection("services").findOne({
    _id: serviceObjectId,
  });

  if (!service) {
    return { error: "service-not-found" };
  }

  const existingBooking = await findActiveBooking(
    bookingData.customerId,
    bookingData.serviceId,
  );

  if (existingBooking) {
    return { error: "active-booking" };
  }

  const booking = {
    serviceId: serviceObjectId,
    customerId: bookingData.customerId,
    customerName: bookingData.customerName,
    customerEmail: bookingData.customerEmail,
    phone: bookingData.phone,
    bookingDate: bookingData.bookingDate,
    address: bookingData.address,
    problemDescription: bookingData.problemDescription,
    status: "requested",
    paymentStatus: "unpaid",
    createdAt: new Date(),
  };

  const result = await database.collection("bookings").insertOne(booking);
  return {
    booking: {
      ...booking,
      _id: result.insertedId,
    },
  };
};