import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

import db from "../db/index.js";
import { services } from "../db/schema/services.js";
import { businessHours } from "../db/schema/business-hours.js";
import { shops } from "../db/schema/shops.js";
import { appointments } from "../db/schema/appointments.js";

const SLOT_INTERVAL_MINUTES = 15;

function timeToMinutes(time: string): number {
    const [hour, minutes] = time.split(":").map(Number);
    return hour * 60 + minutes;
}

function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(remainingMinutes).padStart(2, "0")}`
}


function getNextDate(date: string) {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(Date.UTC(year, month - 1, day + 1))
        .toISOString()
        .slice(0, 10);
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

    const dayOfWeek = new Date(`${date}T12:00:00.000Z`).getUTCDay();

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

    const openingMinutes = timeToMinutes(hours.openTime);
    const closingMinutes = timeToMinutes(hours.closeTime);


    const dayStart = fromZonedTime(
        `${date}T00:00:00`,
        shop.timezone
    );

    const dayEnd = fromZonedTime(
        `${getNextDate(date)}T00:00:00`,
        shop.timezone);

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
                inArray(appointments.status, [
                    "pending",
                    "confirmed"
                ])
            )
        );

    const availableSlots = [];
    const now = new Date();

    for (let start = openingMinutes; start + service.durationMinutes <= closingMinutes; start += SLOT_INTERVAL_MINUTES) {
        const startTime = minutesToTime(start);

        const startAt = fromZonedTime(`${date}T${startTime}:00`, shop.timezone);
        const endAt = new Date(startAt.getTime() + service.durationMinutes * 60 * 1000);

        if (startAt <= now) {
            continue;
        }

        if (formatInTimeZone(endAt, shop.timezone, "yyyy-MM-dd") !== date) {
            continue;
        }

        const endTime = formatInTimeZone(endAt, shop.timezone, 'HH:mm');

        if (timeToMinutes(endTime) > closingMinutes) {
            continue;
        }

        const hasConflict = existingAppointments.some((appointment) => {
            return (
                appointment.startAt < endAt && appointment.endAt > startAt
            )
        })

        if (hasConflict) {
            continue;
        }

        availableSlots.push({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            startTime: formatInTimeZone(
                startAt,
                shop.timezone,
                "HH:mm"
            ),
            endTime
        })

    }

    return availableSlots;

}