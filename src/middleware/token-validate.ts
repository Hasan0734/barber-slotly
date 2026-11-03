import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { timingSafeEqual } from "node:crypto";
import db from "../db/index.js";
import { appointments } from "../db/schema/appointments.js";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { bookingTokenHash } from "../lib/utils.js";


type BookingValidateVariables = {
    Variables: {
        appointmentId: typeof appointments.$inferSelect.id,
    };
};


export const validateBookingToken = createMiddleware<BookingValidateVariables>(async (c, next) => {
    const bookingToken = getCookie(c, "slotly_booking_token");
    const id = c.req.param('id');


    if (!bookingToken) {
        throw new HTTPException(401, { message: "Unauthorized" })
    }

    const tokenHash = bookingTokenHash(bookingToken);

    // console.log(bookingToken, tokenHash)

    const [appointment] = await db.select()
        .from(appointments)
        .where(
            and(
                eq(appointments.id, id as string),
                eq(appointments.bookingTokenHash, tokenHash)
            )
        )
        .limit(1);

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    c.set("appointmentId", appointment.id)
    await next()
})