import { randomBytes } from "node:crypto";
import { generateTokenHash } from "../lib/utils.js";
import db from "../db/index.js";
import { guestSessions } from "../db/schema/guest-sessions.js";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { eq } from "drizzle-orm";


export async function createGuestSession() {
    const token = randomBytes(32).toString('hex');
    const tokenHash = generateTokenHash(token);
    const expiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    const [session] = await db
        .insert(guestSessions)
        .values({
            tokenHash,
            expiresAt
        })
        .returning();

    return {
        session,
        token
    }
}



export async function getOrCreateGuestSession(c: Context) {
    const sessionToken = getCookie(c, "slotly_guest_session");

    if (!sessionToken) {
        const { session, token } = await createGuestSession();

        setCookie(c, "slotly_guest_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "None",
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        })
        return {
            id: session.id,
            token
        }


    }

    const tokenHash = generateTokenHash(sessionToken);
    const [session] = await db
        .select()
        .from(guestSessions)
        .where(
            eq(guestSessions.tokenHash, tokenHash)
        )
        .limit(1);

    if (!session) {
        const { session, token } = await createGuestSession();

        setCookie(c, "slotly_guest_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "None",
            path: '/',
            maxAge: 60 * 60 * 24 * 30,
        })

        return {
            id: session.id,
            token
        }
    }

    return {
        id: session.id,
        token: sessionToken
    }
}