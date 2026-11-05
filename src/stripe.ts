import Stripe from 'stripe'
import { env } from './env.js'

export const stripe = new Stripe(env.STRIPE_SECRET_KEY);


type CreateCheckoutSessionInput = {
    appointmentId: string;
    serviceName: string;
    servicePrice: number;
    paymentId: string
};


const expiresAt = Math.floor(Date.now() / 1000) + (32 * 60);

export async function createCheckoutSession({ appointmentId, serviceName, servicePrice, paymentId }: CreateCheckoutSessionInput) {
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: servicePrice,
                    product_data: {
                        name: serviceName
                    }

                }
            }
        ],
        metadata: {
            appointmentId,
            paymentId
        },
        success_url: `${env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_URL}/cancel`,
        expires_at: expiresAt
    },
        {
            idempotencyKey: `checkout-${appointmentId}-${paymentId}`
        }
    )

    return session;
}