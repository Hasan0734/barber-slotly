import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"
import db from "../db/index.js";
import { services } from "../db/schema/services.js";
import { businessHours } from "../db/schema/business-hours.js";
import { shops } from "../db/schema/shops.js";
import { appointments } from "../db/schema/appointments.js";

const SLOT_INTERVAL_MINUTES = 15;
const nowTime = new Date();

function timeToMinutes(time: string): number {
    const [hour, minute] = time.split(":").map(Number);
    return hour * 60 + minute;
}

type AvailabilityInput = {
    slug: string;
    serviceId: string;
    date: string
}

export async function getAvailableSlots({
    slug,
    serviceId,
    date
}: AvailabilityInput) {
    const [shop] = await db
        .select({ id: shops.id, timezone: shops.timezone })
        .from(shops)
        .where(eq(shops.slug, slug))
        .limit(1);

    if (!shop) {
        throw new HTTPException(404, {
            message: "Shop not found"
        })
    }

    const timezone = shop.timezone || "Asia/Dhaka";

    const [service] = await db.select({
        id: services.id,
        durationMinutes: services.durationMinutes
    })
        .from(services)
        .where(
            and(
                eq(services.id, serviceId),
                eq(services.shopId, shop.id),
                eq(services.isActive, true)
            )
        ).limit(1);

    if (!service) {
        throw new HTTPException(404, {
            message: "Service not found or unavailable"
        })
    }

    const localDate = new Date(`${date}T12:00:00.000Z`);
    const dayOfWeek = localDate.getUTCDay();

    const [hours] = await db
        .select()
        .from(businessHours)
        .where(
            and(
                eq(businessHours.shopId, shop.id),
                eq(businessHours.dayOfWeek, dayOfWeek)
            )
        )
        .limit(1);

    if (!hours || hours.isClosed || !hours.openTime || !hours.closeTime) {
        return [];
    }

    const openTime = hours.openTime.slice(0, 5);
    const closeTime = hours.closeTime.slice(0, 5);

    const [year, month, day] = date.split('-').map(Number);

    const nextDate = new Date(
        Date.UTC(year, month - 1, day + 1)
    ).toISOString().slice(0, 10)

    const dayStart = fromZonedTime(`${date}T00:00:00`, timezone);
    const dayEnd = fromZonedTime(`${nextDate}T00:00:00`, timezone);


    const existingAppointments = await db
        .select({
            startAt: appointments.startAt,
            endAt: appointments.endAt
        })
        .from(appointments)
        .where(
            and(
                eq(appointments.shopId, shop.id),
                lt(appointments.startAt, dayEnd),
                gt(appointments.endAt, dayStart),

                or(
                    eq(appointments.status, "confirmed"),
                    and(
                        eq(appointments.status, "pending"),
                        eq(appointments.paymentMethod, "pay_at_shop")

                    ),
                    and(
                        eq(appointments.status, "pending"),
                        isNull(appointments.paymentMethod),
                        gt(appointments.reservationExpiresAt, nowTime)
                    ),
                    and(
                        eq(appointments.status, "pending"),
                        eq(appointments.paymentMethod, "online"),
                        eq(appointments.paymentStatus, "pending"),
                        gt(appointments.reservationExpiresAt, nowTime)
                    )
                )
            )
        );

    console.log(existingAppointments)

    const openingMinutes = timeToMinutes(openTime);
    const closingMinutes = timeToMinutes(closeTime);

    const availableSlots = [];
    const now = new Date();

    for (let startMinutes = openingMinutes;
        startMinutes + service.durationMinutes <= closingMinutes;
        startMinutes += SLOT_INTERVAL_MINUTES) {

        const hour = Math.floor(startMinutes / 60);
        const minute = startMinutes % 60;
        const localStartTime =
            `${String(hour).padStart(2, "0")}:` +
            `${String(minute).padStart(2, "0")}`;

        const startAt = fromZonedTime(
            `${date}T${localStartTime}:00`,
            timezone,
        );
        const endAt = new Date(
            startAt.getTime() +
            service.durationMinutes * 60 * 1000,
        );

        if (startAt <= now) continue;
        const hasConflict = existingAppointments.some((appointment) => {
            return (
                appointment.startAt < endAt && appointment.endAt > startAt
            )
        })

        if (hasConflict) continue;

        availableSlots.push({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            localStartTime: formatInTimeZone(
                startAt,
                timezone,
                "HH:mm"
            ),
            localEndTime: formatInTimeZone(
                endAt,
                timezone,
                "HH:mm"
            )
        })

    }

    return availableSlots;

}

