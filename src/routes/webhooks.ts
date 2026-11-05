import { Hono } from "hono";
import type Stripe from "stripe";
import { stripe } from "../stripe.js";
import { env } from "../env.js";
import { handleCheckoutCompleted, handleCheckoutExpired, handlePaymentFailed } from "../services/payment.js";

const app = new Hono();


app.post('/', async (c) => {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
        return c.text("Missing stripe-signature", 400)
    }

    const body = await c.req.text();
    let event: Stripe.Event;

    try {
        event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            env.STRIPE_WEBHOOK_SECRET
        )
    } catch (error) {
        console.error(`Webhook signature verifation failed: `, (error as Error).message)
        return c.text("Invalid signature", 400)
    }

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;

                if (session.payment_status === 'paid') {

                    await handleCheckoutCompleted(session)
                }
                break;
            }
            case "checkout.session.async_payment_failed": {
                const session = event.data.object;
                await handlePaymentFailed(session)
                break;
            }
            case "checkout.session.expired": {
                const session = event.data.object;
                await handleCheckoutExpired(session)
                break;
            }
            case "charge.refunded": {
                const session = event.data.object;
            }
        }

        return c.text('ok', 200)
    } catch (error) {
        console.error("Stripe webhooks processing failed: ", (error as Error).message)
        return c.json({ error: "Webhook processing failed" }, 500)
    }
})

export default app;