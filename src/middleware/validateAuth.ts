import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import db from "../db/index.js";
import { appointments } from "../db/schema/appointments.js";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { generateTokenHash } from "../lib/utils.js";
import { guestSessions } from "../db/schema/guest-sessions.js";
import { auth } from "../auth.js";



export type BookingCustomer =
    | {
        type: "registered";
        customerId: string;
    }
    | {
        type: "guest";
        guestSessionId: string;
    };

type BookingValidateVariables = {
    Variables: {
        customer: BookingCustomer;
    };
};


export const validateAuth = createMiddleware<BookingValidateVariables>(async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (session) {
        c.set("customer", {
            type: "registered",
            customerId: session.user.id,
        });

        return await next();
    }

    const guestToken = getCookie(c, "slotly_guest_session");

    if (!guestToken) {
        throw new HTTPException(401, {
            message: "Unauthorized"
        })
    }

    const tokenHash = generateTokenHash(guestToken);

    const [guestSession] = await db
        .select()
        .from(guestSessions)
        .where(
            and(
                eq(guestSessions.tokenHash, tokenHash),
                gt(guestSessions.expiresAt, new Date()),
                isNull(guestSessions.revokedAt),
                isNull(guestSessions.claimedAt)
            )
        )
        .limit(1);

    if (!guestSession) {
        throw new HTTPException(401, {
            message: "Unauthorized"
        })
    }

    c.set("customer", {
        type: "guest",
        guestSessionId: guestSession.id
    })
    await next()
})


