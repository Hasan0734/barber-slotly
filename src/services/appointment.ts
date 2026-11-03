import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, isNull, or, SQL } from "drizzle-orm";
import db from "../db/index.js";
import { shops } from "../db/schema/shops.js";
import { HTTPException } from "hono/http-exception";
import { services } from "../db/schema/services.js";
import { getAvailableSlots } from "./availability.js";
import { appointments } from "../db/schema/appointments.js";
import { randomBytes } from "node:crypto";
import type {
    AppointmentStatusParams,
    ChangePaymentMethodParams,
    CreateAppointmentParams,
    GetAppointmentsParams,
    UpdateAppointmentParams
} from "../types/appointment.js";



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

    if (shop.ownerId === data.customerId) {
        throw new HTTPException(403, {
            message: "Shop owners cannot book appointments at their own shop",
        });
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
    const bookingToken = randomBytes(32).toString('hex');
    // 4. Prepare appointment data
    const appointmentData = {
        shopId: shop.id,
        serviceId: service.id,

        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail ?? null,
        customerNote: data.customerNote ?? null,
        customerId: data.customerId ?? null,
        guestSessionId: data.guestSessionId ?? null,
        serviceName: service.name,
        servicePrice: service.price,
        serviceDuration: service.durationMinutes,
        startAt,
        endAt,


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
            shopAddress: shop.address,
            bookingToken
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

export async function getOwnerAppointments({
    limit, offset,
    userId, status,
    sort, search
}: GetAppointmentsParams) {

    const conditions = [
        eq(appointments.shopId, shops.id)
    ]

    if (userId) {
        conditions.push(eq(shops.ownerId, userId))
    }

    if (status) {
        conditions.push(
            eq(appointments.status, status)
        )
    }

    if (search) {
        conditions.push(
            ilike(appointments.customerName, `${search}`)
        )
    }

    const orderBy = sort === 'asc' ? asc(appointments.startAt) : desc(appointments.startAt)

    const [data, totalResult] = await Promise.all([
        db.select({
            ...getTableColumns(appointments)
        })
            .from(appointments)
            .innerJoin(shops,
                eq(appointments.shopId, shops.id)
            )
            .where(and(...conditions))
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset),
        db.select({ total: count() })
            .from(appointments)
            .innerJoin(
                shops,
                eq(appointments.shopId, shops.id)
            )
            .where(and(...conditions))
    ]);

    return {
        data, totalResult
    }
}
export async function getCustomerAppointments({
    customer, limit,
    offset, status,
    sort, search
}: GetAppointmentsParams) {

    const customerConditions = customer?.type === "registered"
        ? eq(appointments.customerId, customer.customerId)
        : and(
            eq(appointments.guestSessionId, customer?.guestSessionId as string),
            isNull(appointments.customerId)
        )

    const conditions = [
        customerConditions,
    ]

    if (status) {
        conditions.push(
            eq(appointments.status, status)
        )
    }

    if (search) {
        conditions.push(
            ilike(appointments.customerName, `${search}`)
        )
    }

    const orderBy = sort === 'asc' ? asc(appointments.startAt) : desc(appointments.startAt)

    const [data, totalResult] = await Promise.all([
        db.select({
            ...getTableColumns(appointments)
        })
            .from(appointments)
            .where(and(...conditions))
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset),

        db.select({ total: count() })
            .from(appointments)
            .where(and(...conditions))
    ]);

    return {
        data,
        totalResult
    }
}

export async function getAppointment(id: string, userId: string) {

    const [appointment] = await db.select({
        ...getTableColumns(appointments),
        shopName: shops.name,
        shopPhone: shops.phone,
        shopAddress: shops.address

    })
        .from(appointments)
        .innerJoin(shops, eq(appointments.shopId, shops.id))
        .where(
            and(
                eq(appointments.id, id),
                eq(shops.ownerId, userId),
            )
        )
        .limit(1);

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }
}

export async function changePaymentMethod({ customer, id, paymentMethod }: ChangePaymentMethodParams) {

    const condition = customer.type === "registered"
        ? and(
            eq(appointments.id, id),
            eq(appointments.customerId, customer.customerId)
        )
        : and(
            eq(appointments.id, id),
            eq(appointments.guestSessionId, customer.guestSessionId),
            isNull(appointments.customerId)
        )


    const [getAppointment] = await db
        .select()
        .from(appointments)
        .where(condition)
        .limit(1);

    const reservationExpiresAt = paymentMethod === "online"
        ? new Date(Date.now() + 15 * 60 * 1000)
        : null;

    const [appointment] = await db
        .update(appointments)
        .set({ paymentMethod, reservationExpiresAt })
        .where(
            and(
                eq(appointments.id, getAppointment.id),
                eq(appointments.status, "pending"),
                or(
                    eq(appointments.paymentStatus, "unpaid"),
                    eq(appointments.paymentStatus, "failed")
                )

            )
        ).returning();

    if (!appointment) {
        throw new HTTPException(404, { message: "Payment method cannot be changed" })
    }

    return appointment;
}

export async function updateAppointment({ userId, id, data }: UpdateAppointmentParams) {

    const appointment = await db.update(appointments)
        .set(data)
        .from(shops)
        .where(
            and(
                eq(appointments.id, id),
                eq(appointments.shopId, shops.id),
                eq(shops.ownerId, userId),
            )
        ).returning(
            {
                ...getTableColumns(appointments),
                shopName: shops.name,
                shopPhone: shops.phone,
                shopAddress: shops.address
            }
        );

    if (!appointment) {
        throw new HTTPException(404, { message: "Appointment not found" })
    }

    return appointment;
}