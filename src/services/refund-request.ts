import { and, eq, isNull } from "drizzle-orm";
import db from "../db/index.js";
import { refundRequests } from "../db/schema/refund-request.js";
import type { BookingCustomer } from "../middleware/validateAuth.js";
import { HTTPException } from "hono/http-exception";
import { appointments } from "../db/schema/appointments.js";
import { payments } from "../db/schema/payments.js";
import { shops } from "../db/schema/shops.js";
import { refundStripe } from "../stripe.js";
import type Stripe from "stripe";

export async function getRefundReqeusts(customer: BookingCustomer) {

    const customerConditions = customer?.type === "registered"
        ? eq(refundRequests.requestedBy, customer.customerId)
        : and(
            eq(refundRequests.requestedBy, customer?.guestSessionId as string),
        )

    const conditions = [
        customerConditions,
    ]


    const requests = await db
        .select()
        .from(refundRequests)
        .where(
            and(
                ...conditions
            )
        );

    return requests;

}

export async function getRefundRequestByOwner(ownerId: string) {
    const requests = await db
        .select({
            // Refund request
            id: refundRequests.id,
            amount: refundRequests.amount,
            currency: refundRequests.currency,
            reason: refundRequests.reason,
            status: refundRequests.status,
            createdAt: refundRequests.createdAt,

            // Appointment
            appointmentId: appointments.id,
            customerName: appointments.customerName,
            customerPhone: appointments.customerPhone,
            customerEmail: appointments.customerEmail,
            serviceName: appointments.serviceName,
            startAt: appointments.startAt,
            endAt: appointments.endAt,

            // Payment
            paymentId: payments.id,
            paymentStatus: payments.status,
        })
        .from(refundRequests)
        .innerJoin(appointments,
            eq(refundRequests.appointmentId, appointments.id)
        )
        .innerJoin(payments,
            eq(refundRequests.paymentId, payments.id)
        )
        .innerJoin(shops,
            eq(appointments.shopId, shops.id)
        )
        .where(
            eq(shops.ownerId, ownerId)
        );


    return requests;
}

export async function getRefundDetails(customer: BookingCustomer, id: string) {
    const customerConditions = customer?.type === "registered"
        ? eq(refundRequests.requestedBy, customer.customerId)
        : and(
            eq(refundRequests.requestedBy, customer?.guestSessionId as string),
        )

    const conditions = [
        customerConditions,
        eq(refundRequests.id, id)
    ]

    const [request] = await db
        .select()
        .from(refundRequests)
        .where(
            and(
                ...conditions
            )
        ).limit(1);

    if (!request) {
        throw new HTTPException(404, { message: "Refund request not found" })
    }


    return request;
}

export async function getRefundDetailsByOwner(ownerId: string, id: string) {
    const [request] = await db
        .select({
            // Refund request
            id: refundRequests.id,
            amount: refundRequests.amount,
            currency: refundRequests.currency,
            reason: refundRequests.reason,
            status: refundRequests.status,
            createdAt: refundRequests.createdAt,

            // Appointment
            appointmentId: appointments.id,
            customerName: appointments.customerName,
            customerPhone: appointments.customerPhone,
            customerEmail: appointments.customerEmail,
            serviceName: appointments.serviceName,
            startAt: appointments.startAt,
            endAt: appointments.endAt,

            // Payment
            paymentId: payments.id,
            paymentStatus: payments.status,
        })
        .from(refundRequests)
        .innerJoin(appointments,
            eq(refundRequests.appointmentId, appointments.id)
        )
        .innerJoin(payments,
            eq(refundRequests.paymentId, payments.id)
        )
        .innerJoin(shops,
            eq(appointments.shopId, shops.id)
        )
        .where(
            and(
                eq(refundRequests.id, id),
                eq(shops.ownerId, ownerId)
            )
        )
        .limit(1);

    if (!request) {
        throw new HTTPException(404, {
            message: "Refund request not found."
        })
    }

    return request;
}

export async function refundRejectByOwner(ownerId: string, id: string, rejectionReason: string) {

    return await db.transaction(async (tx) => {
        const [request] = await tx
            .select({
                id: refundRequests.id,
                status: refundRequests.status
            })
            .from(refundRequests)
            .innerJoin(appointments,
                eq(refundRequests.appointmentId, appointments.id)
            )
            .innerJoin(shops,
                eq(appointments.shopId, shops.id)
            )
            .where(
                and(
                    eq(refundRequests.id, id),
                    eq(shops.ownerId, ownerId)
                )
            )
            .for('update')
            .limit(1);

        if (!request) {
            throw new HTTPException(404, {
                message: "Refund request not found."
            })
        }

        if (request.status !== "pending") {
            throw new HTTPException(409, {
                message: "This refund request has already benn processed"
            })
        }

        const [rejectedRequest] = await tx
            .update(refundRequests)
            .set({
                status: 'rejected',
                rejectionReason,
                processedBy: ownerId,
                updatedAt: new Date()
            })
            .where(
                and(
                    eq(refundRequests.id, id),
                    eq(refundRequests.status, 'pending')
                )
            )
            .returning();

        return rejectedRequest;
    })



}

export async function refundApprovedByOwner(ownerId: string, id: string) {

    const request = await db.transaction(async (tx) => {
        const [result] = await tx
            .select({
                refundRequest: refundRequests,
                payment: payments
            })
            .from(refundRequests)
            .innerJoin(
                appointments,
                eq(refundRequests.appointmentId, appointments.id)
            )
            .innerJoin(shops,
                eq(appointments.shopId, shops.id)
            )
            .innerJoin(payments,
                eq(refundRequests.paymentId, payments.id)
            )
            .where(
                and(
                    eq(refundRequests.id, id),
                    eq(shops.ownerId, ownerId)
                )
            )
            .for('update')
            .limit(1);

        if (!result) {
            throw new HTTPException(404, {
                message: "Refund request not found"
            })
        }
        if (result.refundRequest.status !== "pending") {
            throw new HTTPException(400, {
                message: "Refund request is not pending"
            })
        }

        if (result.payment.status !== "succeeded" ||
            !result.payment.providerPaymentIntentId
        ) {
            throw new HTTPException(400, {
                message: "Payment is not eligible for refund"
            })
        }
        const [updated] = await tx
            .update(refundRequests)
            .set({
                status: 'processing',
                processedBy: ownerId,
                updatedAt: new Date()
            })
            .where(
                eq(refundRequests.id, id)
            )
            .returning();

        return {
            refundRequest: updated,
            payment: result.payment
        }

    })

    const refund = await refundStripe(request.payment.providerPaymentIntentId!, request.refundRequest.amount, id);

    if (!refund) {
        return null;
    }
    await db
        .update(refundRequests)
        .set({
            providerRefundId: refund.id,
            updatedAt: new Date()
        })
        .where(
            eq(refundRequests.id, id)
        )
}

export async function handleRefundWebhook(refund: Stripe.Refund) {
    const refundRequestId = refund.metadata?.refundRequestId;

    if (!refundRequestId) {
        throw new Error("Refund request ID missing from stripe metadata")
    }

    const paymentIntentId =
        typeof refund.payment_intent === "string"
            ? refund.payment_intent
            : refund.payment_intent?.id;

    if (!paymentIntentId) {
        throw new Error("PaymentIntent ID missing from refund");
    }

    const refundStatus = refund.status === "succeeded"
        ? "succeeded"
        : refund.status === "failed"
            || refund.status === "canceled"
            ? "failed"
            : "processing"



    return await db.transaction(async (tx) => {

        const [request] = await tx
            .select()
            .from(refundRequests)
            .where(
                eq(refundRequests.id, refundRequestId)
            )
            .for('update')
            .limit(1)

        if (!request) {
            throw new Error("Refund request not found")
        }

        if (request.status === "succeeded" ||
            request.status === "failed" ||
            request.status === "rejected") {
            return request;
        }

        if (request.status !== "processing") {
            throw new Error("Refund request is not processing");
        }

        const [payment] = await tx
            .select()
            .from(payments)
            .where(eq(payments.id, request.paymentId))
            .limit(1);

        if (!payment) {
            throw new Error("Payment not found")
        }


        if (payment.providerPaymentIntentId !== paymentIntentId) {
            throw new Error("PaymentIntent ID mismatch")
        }


        if (refund.amount !== request.amount
            || refund.currency.toLowerCase()
            !== request.currency.toLowerCase()) {
            throw new Error("Refund amount or currency mismatch")
        }

        if (request.providerRefundId && request.providerRefundId !== refund.id) {
            throw new Error("Stripe Refund ID mismatch")
        }


        const [updatedRequest] = await tx
            .update(refundRequests)
            .set({
                status: refundStatus,
                providerRefundId: refund.id,
                updatedAt: new Date()
            })
            .where(
                eq(refundRequests.id, refundRequestId),
            )
            .returning();

        if (!updatedRequest) {
            throw new Error("Failed to update refund request")
        }
        if (refundStatus === "succeeded") {
            await tx
                .update(payments)
                .set({
                    status: 'refunded',
                    updatedAt: new Date()
                })
                .where(
                    eq(payments.id, payment.id)
                );
            await tx
                .update(appointments)
                .set({
                    paymentStatus: 'refunded'
                })
                .where(
                    eq(appointments.id, request.appointmentId)
                )
        }

        return   updatedRequest;
    })
}