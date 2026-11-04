import { Hono } from "hono";
import { authGuard } from "../middleware/auth-guard.js";
import { deleteCookie, getCookie } from "hono/cookie";
import { validateAuth } from "../middleware/validateAuth.js";
import { claimGuestSessionService, revokeGuestSessionService } from "../services/guest-session.js";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

app.post('/claim', authGuard, validateAuth, async (c) => {
    const user = c.get('user');

    const guestToken = getCookie(c, "slotly_guest_session");
    if (!guestToken) {
        throw new HTTPException(401, {
            message: "Guest session not found",
        });
    }

    const result = await claimGuestSessionService({ guestToken, userId: user.id })

    deleteCookie(c, "slotly_guest_session", {
        path: '/'
    });

    return c.json({
        success: true,
        message: "Guest appointments claimed successfully",
        // claimedAppointments: result.claimedCount,
    })

})

app.post('/revoke', async (c) => {

    const guestToken = getCookie(c, "slotly_guest_session");

    if (!guestToken) {
        deleteCookie(c, "slotly_guest_session", {
            path: "/",
        });

        return c.json({
            message: "Guest session revoked",
        });
    }

    await revokeGuestSessionService(guestToken);

    deleteCookie(c, "slotly_guest_session", {
        path: "/",
    });

    return c.json({
        success: true,
        message: "Guest session revoked successfully",
    });


})

export default app;