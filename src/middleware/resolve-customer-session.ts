import { createMiddleware } from "hono/factory";
import { auth } from "../auth.js";
import type { guestSessions } from "../db/schema/guest-sessions.js";
import { getOrCreateGuestSession } from "../services/guest-session.js";


type Customer = {
    type: "registered" | "guest"
    customerId?: typeof auth.$Infer.Session.user.id;
    guestSessionId?: typeof guestSessions.$inferSelect.id
}

type AuthVariables = {
    Variables: {
        customer: Customer,
    };
};

// type GeustSession = {
//     id: typeof guestSessions.id;
// }



export const resolveCustomerSession = createMiddleware<AuthVariables>(async (c, next) => {

    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (session) {
        c.set("customer", {
            type: "registered",
            customerId: session.user.id
        })
        return await next();

    }

    console.log("session not available")

    const guestSession = await getOrCreateGuestSession(c);

    c.set("customer", {
        type: "guest",
        guestSessionId: guestSession.id
    })

    await next();

})