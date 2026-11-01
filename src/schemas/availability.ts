import * as z from 'zod';


export const availabilityQuerySchema = z.object({
    serviceId: z.uuid("Invalid service ID"),
    date: z.string()
        .regex(
            /^\d{4}-\d{2}-\d{2}$/,
            "Date must be is YYYY-MM-DD format"
        ).refine((value) => {
            const date = new Date(`${value}T00:00:00.000Z`);

            return (
                !Number.isNaN(date.getTime()) &&
                date.toISOString().slice(0, 10) === value
            );
        }, "Invalid calendar date")

});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;