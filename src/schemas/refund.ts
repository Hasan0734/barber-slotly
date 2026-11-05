import * as z from 'zod';

export const rejectRefundRequestSchema = z.object({
    rejectionReason: z.string().trim().min(1).max(500),
});