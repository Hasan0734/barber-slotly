import { randomBytes } from "node:crypto";
import { generateTokenHash } from "../lib/utils.js";
import db from "../db/index.js";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { and, eq, gt, isNull } from "drizzle-orm";
import { guestSessions } from "../db/schema/guest-sessions.js";
import { HTTPException } from "hono/http-exception";
import { appointments } from "../db/schema/appointments.js";


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

type ClaimGuestSessionParams = {
    guestToken: string;
    userId: string;
};

export async function claimGuestSessionService({
    guestToken,
    userId
}: ClaimGuestSessionParams) {
    const tokenHash = generateTokenHash(guestToken);
    const nowDate = new Date();

    return db.transaction(async (tx) => {

        const [guestSession] = await tx
            .update(guestSessions)
            .set({
                customerId: userId,
                claimedAt: nowDate,
                revokedAt: nowDate
            })
            .where(
                and(
                    eq(guestSessions.tokenHash, tokenHash),
                    gt(guestSessions.expiresAt, nowDate),
                    isNull(guestSessions.claimedAt),
                    isNull(guestSessions.revokedAt)

                )
            )
            .returning({
                id: guestSessions.id,
            });

        if (!guestSession) {
            throw new HTTPException(401, {
                message: "Invalid or expired guest session"
            })
        }

        const claimedAppointments = await tx.update(appointments)
            .set({
                customerId: userId
            })
            .where(
                and(
                    eq(appointments.guestSessionId, guestSession.id),
                    isNull(appointments.customerId)
                )
            )
            .returning({
                id: appointments.id,
            });

        return {
            claimedCount: claimedAppointments.length,
        }
    })
}