import type { BookingCustomer } from "../middleware/validateAuth.js";

export type CreateAppointmentParams = {
    shopSlug: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerNote?: string | null;
    startAt: string;
    customerId: string | null | undefined;
    guestSessionId: string | null | undefined;
}

export type GetAppointmentsParams = {
    userId?: string,
    status: "pending" | "confirmed" | "cancelled" | "completed" | "no_show" | undefined
    limit: number,
    offset: number,
    search: string | undefined,
    sort: "asc" | "desc",
    customer?: BookingCustomer | undefined

}

export type AppointmentStatusParams = {
    id: string
    ownerId: string;
    status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show"
}

export type ChangePaymentMethodParams = {
    customer: BookingCustomer,
    id: string,
    paymentMethod: "online" | "pay_at_shop"
}


type UpdateAppointmentInput = {

    customerName?: string | undefined,
    customerPhone?: string | undefined,
    customerEmail?: string | null | undefined,
    customerNote?: string | null | undefined,

}

export type UpdateAppointmentParams = {
    userId: string,
    id: string,
    data: UpdateAppointmentInput
}

export type CancelAppointmentParams = {
    customer: BookingCustomer | undefined;
    id: string;
    reason: string;
}