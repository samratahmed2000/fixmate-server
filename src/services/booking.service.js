import { ObjectId } from "mongodb";
import { getDatabase } from "../config/db.js";

const activeBookingStatuses = [
  "requested",
  "accepted",
  "in-progress",
  "on-progress",
  "pending",
];

// Find Active Booking
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

// Bookings By Customer ID
export const getBookingsByCustomerId = async (customerId) => {
  const database = getDatabase();
  const bookings = await database
    .collection("bookings")
    .find({ customerId })
    .sort({ createdAt: -1 })
    .toArray();

  return Promise.all(
    bookings.map(async (booking) => {
      const serviceId =
        booking.serviceId instanceof ObjectId
          ? booking.serviceId
          : typeof booking.serviceId === "string" &&
              ObjectId.isValid(booking.serviceId)
            ? new ObjectId(booking.serviceId)
            : null;

      const service = serviceId
        ? await database.collection("services").findOne(
            { _id: serviceId },
            {
              projection: {
                title: 1,
                serviceImage: 1,
                technicianName: 1,
                basePrice: 1,
              },
            },
          )
        : null;

      return { ...booking, service };
    }),
  );
};

// Cancel Booking By ID
export const cancelBookingById = async (bookingId, customerId) => {
  return getDatabase()
    .collection("bookings")
    .updateOne(
      {
        _id: new ObjectId(bookingId),
        customerId,
        status: { $in: ["requested", "pending"] },
      },
      {
        $set: {
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      },
    );
};

// Booking Add
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
