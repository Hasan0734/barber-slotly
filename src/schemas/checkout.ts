import * as z from 'zod';

export  const checkoutSchema = z.object({
    appointmentId: z.uuid()
});



