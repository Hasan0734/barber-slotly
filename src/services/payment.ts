import { HTTPException } from "hono/http-exception";
import db from "../db/index.js";
import { payments } from "../db/schema/payments.js";
import type Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { appointments } from "../db/schema/appointments.js";


type CreatePaymentInput = {
    appointmentId: string,
    servicePrice: number
}

export async function createPayment({ appointmentId, servicePrice }: CreatePaymentInput) {
    try {

        const [payment] = await db.insert(payments)
            .values({
                appointmentId,
                provider: "stripe",
                amount: servicePrice,
                currency: "usd",
            })
            .returning()

        return payment;
    }
    catch (err) {
        console.error((err as Error).message);
        throw new HTTPException(500, { message: (err as Error).message })
    }
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) {
        throw new Error("Payment ID missing from Stripe metadata")
    }

    const [payment] = await db
        .select()
        .from(payments)
        .where(
            eq(payments.id, paymentId)
        )
        .limit(1);

    if (!payment) {
        throw new Error("Payment record not found")
    }

    if (payment.providerSessionId !== session.id) {
        throw new Error("Stripe session mismatch")
    }
    if (session.payment_status !== "paid") {
        throw new Error("Payment is not completed")
    }

    if (session.amount_total !== payment.amount || session.currency !== payment.currency.toLowerCase()) {
        throw new Error("Payment amount or currency mismatch")
    }

    if (payment.status === "succeeded") {
        return payment
    }
    if (payment.status !== "pending") {
        throw new Error("Payment is not in pending state")
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id
        ?? null

    return await db.transaction(async (tx) => {
        const [updatedPayment] = await tx
            .update(payments)
            .set({
                status: 'succeeded',
                providerPaymentIntentId: paymentIntentId,
                paidAt: new Date()
            })
            .where(
                and(
                    eq(payments.id, paymentId),
                    eq(payments.status, "pending")
                )
            )
            .returning();


        if (!updatedPayment) {
            return null;
        }

        await tx
            .update(appointments)
            .set({
                paymentStatus: 'paid',
                status: "confirmed",
                reservationExpiresAt: null
            })
            .where(
                and(
                    eq(appointments.id, payment.appointmentId),
                    eq(appointments.paymentStatus, "pending"),
                    eq(appointments.status, "pending"),
                )
            );

        return updatedPayment;
    })


}

export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) {
        throw new Error("Payment ID missing from Stripe metadata")
    }

    const [payment] = await db
        .select()
        .from(payments)
        .where(
            eq(payments.id, paymentId)
        )
        .limit(1);

    if (!payment) {
        throw new Error("Payment record not found")
    }

    if (payment.providerSessionId !== session.id) {
        throw new Error("Stripe session mismatch")
    }

    return await db.transaction(async (tx) => {
        const [updatedPayment] = await tx
            .update(payments)
            .set({ status: 'failed' })
            .where(
                and(
                    eq(payments.id, paymentId),
                    eq(payments.status, "pending")
                )
            )
            .returning();

        if (!updatedPayment) {
            return null;
        }

        await tx
            .update(appointments)
            .set({ paymentStatus: 'failed' })
            .where(
                and(
                    eq(appointments.id, payment.appointmentId),
                    eq(appointments.paymentStatus, "pending")
                )
            );
        return updatedPayment;

    })
}

export async function handlePaymentFailed(session: Stripe.Checkout.Session) {
    const paymentId = session.metadata?.paymentId;
    if (!paymentId) {
        throw new Error("Payment ID missing from Stripe metadata")
    }

    const [payment] = await db
        .select()
        .from(payments)
        .where(
            eq(payments.id, paymentId)
        )
        .limit(1);

    if (!payment) {
        throw new Error("Payment record not found")
    }

    if (payment.providerSessionId !== session.id) {
        throw new Error("Stripe session mismatch")
    }


    return await db.transaction(async (tx) => {
        const [updatedPayment] = await tx
            .update(payments)
            .set({ status: 'failed' })
            .where(
                and(
                    eq(payments.id, paymentId),
                    eq(payments.status, "pending")
                )
            )
            .returning();

        if (!updatedPayment) {
            return null;
        }

        await tx
            .update(appointments)
            .set({ paymentStatus: 'failed' })
            .where(
                and(
                    eq(appointments.id, payment.appointmentId),
                    eq(appointments.paymentStatus, "pending")
                )
            );
        return updatedPayment;


    })

}