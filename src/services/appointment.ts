import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import db from "../db/index.js";
import { shops } from "../db/schema/shops.js";
import { HTTPException } from "hono/http-exception";
import { services } from "../db/schema/services.js";
import { getAvailableSlots } from "./availability.js";
import { appointments } from "../db/schema/appointments.js";

type CreateAppointmentParams = {
    shopSlug: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerNote?: string | null;
    startAt: string

}
export async function createAppointment(data: CreateAppointmentParams) {
    // 1. Find shop
    const [shop] = await db.select()
        .from(shops)
        .where(
            eq(shops.slug, data.shopSlug)
        ).limit(1);

    if (!shop) {
        throw new HTTPException(404, { message: "Shop not found" })
    }

    const timezone = shop.timezone || "Asia/Dhaka"

    // 2. Find service belonging to this shop
    const [service] = await db.select().from(services)
        .where(
            and(
                eq(services.id, data.serviceId),
                eq(services.shopId, shop.id),
                eq(services.isActive, true)
            )
        );

    if (!service) {
        throw new HTTPException(404, { message: "Service not found or unavailable" })
    }

    // 3. Validate appointment time
    const startAt = new Date(data.startAt);


    if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
        throw new HTTPException(400, { message: "Appointment must be in the future" })
    }
    const endAt = new Date(
        startAt.getTime() + (service.durationMinutes * 60 * 1000)
    )

    const localDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(startAt)

    // 3 checking slot avalability 
    const slots = await getAvailableSlots({
        slug: data.shopSlug,
        serviceId: data.serviceId,
        date: localDate
    })

    const isAvailable = slots.some((slot) => new Date(slot.startAt).getTime() === startAt.getTime());


    if (!isAvailable) {
        throw new HTTPException(409, {
            message: "This appointment slot is no longer available"
        })
    }

    // 4. Prepare appointment data
    const appointmentData = {
        shopId: shop.id,
        serviceId: service.id,

        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail ?? null,
        customerNote: data.customerNote ?? null,

        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.durationMinutes,

        startAt,
        endAt
    };


    // 6. Create appointment
    try {
        const [appointment] = await db
            .insert(appointments)
            .values(appointmentData)
            .returning();

        return {
            ...appointment,
            shopName: shop.name,
            shopPhone: shop.phone,
            shopAddress: shop.address
        };

    } catch (err) {
        const dbError = err as {
            code?: string;
            cause?: { code?: string }
        };
        if (dbError.code === "23P01" || dbError.cause?.code === "23P01") {
            throw new HTTPException(409, {
                message: "This appointment slot is already booked"
            })
        }
        throw err;

    }
}

const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled", "no_show"],
    cancelled: [],
    completed: [],
    no_show: []
} as const

type AppointmentStatusParams = {
    id: string
    ownerId: string;
    status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
}

export async function changeAppointmentStatus(data: AppointmentStatusParams) {


    const appointment = await db.update(appointments).set({ status: data.status })
        .from(shops)
        .where(
            and(
                eq(appointments.id, data.id),
                eq(appointments.shopId, shops.id),
                eq(shops.ownerId, data.ownerId),
                inArray(appointments.status,
                    Object.entries(allowedTransitions)
                        .filter(([_, nextStatuses]) =>
                            nextStatuses.includes(data.status as never)
                        )
                        .map(([currentStatus]) => currentStatus as typeof appointments.$inferSelect.status)
                )
            )
        ).returning({
            ...getTableColumns(appointments),
            shopName: shops.name,
            shopPhone: shops.phone,
            shopAddress: shops.address
        });

    if (!appointment.length) {
        throw new HTTPException(409, {
            message: "Invalid status transition or appointment not found",
        });
    }

    return appointment;
}