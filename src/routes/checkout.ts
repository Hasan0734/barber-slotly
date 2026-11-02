import { Hono } from "hono";
import { validate } from "../lib/validate.js";
import { checkoutSchema } from "../schemas/checkout.js";
import db from "../db/index.js";
import { payments } from "../db/schema/payments.js";
import { appointments } from "../db/schema/appointments.js";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { createCheckoutSession } from "../stripe.js";

const app = new Hono();


app.post('/', validate('json', checkoutSchema), async (c) => {
    const { paymentId, appointmentId } = c.req.valid('json');


    const [payment] = await db
        .select({
            paymentId: payments.id,
            appointmentId: appointments.id,
            serviceName: appointments.serviceName,
            servicePrice: appointments.servicePrice
        })
        .from(payments)
        .innerJoin(appointments, eq(payments.appointmentId, appointments.id))
        .where(
            and(
                eq(payments.id, paymentId),
                eq(appointments.id, appointmentId)
            )
        ).limit(1);

    console.log(payment)

    if (!payment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    const session = await createCheckoutSession({
        appointmentId,
        paymentId,
        serviceName: payment.serviceName,
        servicePrice: payment.servicePrice
    })

    return c.json({ url: session.url }, 201)

})


export default app;