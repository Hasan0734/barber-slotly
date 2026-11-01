import * as z from 'zod'


export const createAppointmentSchema = z.object({
    serviceId: z.uuid("Invalid service ID"),
    customerName: z.string()
        .trim()
        .min(2, "Name must be at least 2 characters")
        .max(150, "Name is too long"),
    customerPhone: z.string()
        .trim()
        .min(7, "Invalid phone number")
        .max(30, "Phone number is too long"),
    customerEmail: z.email("Invalid email address")
        .max(255)
        .nullable()
        .optional(),
    customerNote: z.string()
        .trim()
        .max(1000, "Note is too long")
        .nullable()
        .optional(),
    startAt: z.iso.datetime({
        offset: true,
        message: "Invalid appointment date and time"
    })
});


export const updateAppointmentStatusSchema = z.object({
    status: z.enum(["confirmed", "cancelled", "completed", "no_show"])
})

export const updateAppointSchema = z.object({
    customerName: z.string()
        .trim()
        .min(2)
        .max(150)
        .optional(),
    customerPhone: z.string()
        .trim()
        .min(7)
        .max(30)
        .optional(),
    customerEmail: z.email()
        .max(255)
        .nullable()
        .optional(),
    customerNote: z.string()
        .trim()
        .max(1000)
        .nullable()
        .optional()
}).refine((data) => Object.keys(data).length > 0, "At least one field is required");


export const appointmentQuerySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(1),
    limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(10),
    status: z.enum([
        "pending",
        "confirmed",
        "cancelled",
        "completed",
        "no_show"
    ]).optional(),
    date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    search: z.string()
        .trim()
        .max(100)
        .optional(),
    sort: z.enum([
        "asc",
        "desc"
    ]).default("desc")
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointSchema>;
export type AppointmentQuery = z.infer<typeof appointmentQuerySchema>;


