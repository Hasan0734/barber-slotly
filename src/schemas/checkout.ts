import * as z from 'zod';

export  const checkoutSchema = z.object({
    paymentId: z.uuid(),
    appointmentId: z.uuid()
});



