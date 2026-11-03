import { Hono } from "hono";
import { validate } from "../lib/validate.js";
import { checkoutSchema } from "../schemas/checkout.js";
import db from "../db/index.js";
import { appointments } from "../db/schema/appointments.js";
import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { createCheckoutSession } from "../stripe.js";
import { validateAuth } from "../middleware/validateAuth.js";
import { createPayment } from "../services/payment.js";
import { payments } from "../db/schema/payments.js";

const app = new Hono();


app.post('/', validateAuth, validate('json', checkoutSchema), async (c) => {
    const { appointmentId } = c.req.valid('json');
    const customer = c.get("customer");


    const customerConditions = customer?.type === "registered"
        ? eq(appointments.customerId, customer.customerId)
        : and(
            eq(appointments.guestSessionId, customer?.guestSessionId as string),
            isNull(appointments.customerId)
        )

    const conditions = [
        customerConditions,
        eq(appointments.id, appointmentId)
    ]

    const [appointment] = await db
        .select()
        .from(appointments)
        .where(
            and(
                ...conditions
            )
        ).limit(1);


    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    if (!appointment.paymentMethod) {
        throw new HTTPException(404, { message: "Please select payment method" })
    }

    const payment = await createPayment({
        appointmentId: appointment.id,
        servicePrice: appointment.servicePrice,
    })

    if (!payment) {
        throw new HTTPException(400, { message: "Failed to payment" })
    }

    const session = await createCheckoutSession({
        appointmentId,
        paymentId: payment.id,
        serviceName: appointment.serviceName,
        servicePrice: appointment.servicePrice
    })


    await db.transaction(async (tx) => {
        await tx.update(payments)
            .set({ providerSessionId: session.id })
            .where(eq(payments.id, payment.id));

        await tx.update(appointments)
            .set({
                paymentMethod: "online",
                paymentStatus: "pending",
                reservationExpiresAt: new Date(session.expires_at * 1000)
            })
            .where(
                and(
                    eq(appointments.id, appointment.id),
                    eq(appointments.paymentStatus, "unpaid")
                )
            )

    })

    return c.json({ url: session.url }, 201)

})


export default app;