import { and, eq, isNull } from "drizzle-orm";
import db from "../db/index.js";
import { refundRequests } from "../db/schema/refund-request.js";
import type { BookingCustomer } from "../middleware/validateAuth.js";

export async function getRefundReqeusts(customer: BookingCustomer) {

    const customerConditions = customer?.type === "registered"
        ? eq(refundRequests.requestedBy, customer.customerId)
        : and(
            eq(refundRequests.requestedBy, customer?.guestSessionId as string),
        )

    const conditions = [
        customerConditions,
    ]


    const appointments = await db
        .select()
        .from(refundRequests)
        .where(
            and(
                ...conditions
            )
        );

    return appointments;

}

export async function getRefundRequestByOwner() {

}

export async function getRefundDetails() {

}

export async function getRefundDetailsByOwner() {

}

export async function getRefundRejectByOwner() {

}
export async function getRefundApproveByOwner() {

}