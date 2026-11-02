import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { createHash, timingSafeEqual } from "node:crypto";
import db from "../db/index.js";
import { appointments } from "../db/schema/appointments.js";
import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

export const bookingTokenValidate = createMiddleware(async (c) => {
    const bookingToken = getCookie(c, "slotly_booking_token");
    const id = c.req.param('id');

    if (!bookingToken) {
        throw new HTTPException(401, { message: "Unauthorized" })
    }

    const tokenHash = createHash("sha256")
        .update(bookingToken)
        .digest("hex");

    const [appointment] = await db.select()
        .from(appointments)
        .where(
            and(
                eq(appointments.id, id as string),
                eq(appointments.bookingTokenHash, bookingToken)

            )

        )
        .limit(1);

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    const storedHash = Buffer.from(appointment.bookingTokenHash, "hex");
    const suppliedHash = Buffer.from(tokenHash, "hex");

    const isValid = storedHash.length === suppliedHash.length && timingSafeEqual(storedHash, suppliedHash);

    if (!isValid) {
        throw new HTTPException(401, { message: "Unauthorized" })
    }


    return c.json({ success: true });
})