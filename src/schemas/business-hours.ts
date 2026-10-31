import { z } from 'zod';


const timeSchema = z.string().regex(
    /^([01]\d|2[0-3]):([0-5]\d)$/,
    "Time must be in HH:mm format"
);

export const businessHourSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    openTime: timeSchema.nullable(),
    closeTime: timeSchema.nullable()
}).superRefine((data, ctx) => {
    if (data.isClosed) {
        if (data.openTime !== null || data.closeTime !== null) {
            ctx.addIssue({
                code: "custom",
                message: "Closed days must have null opening and closing times",
                path: ["opentTime"]
            })
        }
        return
    }
    if (data.openTime === null || data.closeTime === null) {
        ctx.addIssue({
            code: "custom",
            message: "Opening and closing times are required",
            path: ["openTime"]
        })
        return;
    }

    if (data?.openTime >= data?.closeTime) {
        ctx.addIssue({
            code: "custom",
            message: "Opening time must be before closing time",
            path: ["closeTime"]
        })
    }
})

export const updateBusinessHoursSchema = z.object({
    hours: z.array(businessHourSchema).length(7, "Exactly 7 days are required")
}).superRefine((data, ctx) => {
    const days = data.hours.map((hour) => hour.dayOfWeek);
    if (new Set(days).size !== 7) {
        ctx.addIssue({
            code: 'custom',
            message: "Each day of the week must appear exactly once",
            path: ["hours"]
        })
    }
})

export type BusinessHOur = z.infer<typeof businessHourSchema>;
export type UpdateServiceInput = z.infer<typeof updateBusinessHoursSchema>;