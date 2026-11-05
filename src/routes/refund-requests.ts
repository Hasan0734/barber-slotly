import { Hono } from "hono";
import { validateAuth } from "../middleware/validateAuth.js";
import { getRefundDetails, getRefundDetailsByOwner, getRefundReqeusts, getRefundRequestByOwner, refundApprovedByOwner, refundRejectByOwner } from "../services/refund-request.js";
import { authGuard } from "../middleware/auth-guard.js";
import { validate } from "../lib/validate.js";
import { rejectRefundRequestSchema } from "../schemas/refund.js";

const app = new Hono();


app.get('/', validateAuth, async (c) => {
    const customer = c.get('customer')
    const requests = await getRefundReqeusts(customer)
    return c.json({
        success: true,
        data: requests
    })
})

app.get("/owner", authGuard, async (c) => {
    const user = c.get('user');
    const requests = await getRefundRequestByOwner(user.id);

    return c.json({
        success: true,
        data: requests
    }, 200)
})


app.get('/:id', validateAuth, async (c) => {
    const customer = c.get('customer');
    const id = c.req.param('id')
    const request = await getRefundDetails(customer, id);

    return c.json({
        success: true,
        data: request
    }, 200)
})


app.get('/:id/owner', authGuard, async (c) => {
    const user = c.get('user');
    const id = c.req.param('id')
    const request = await getRefundDetailsByOwner(user.id, id);
    return c.json({
        success: true,
        data: request
    })
})

app.patch('/:id/owner/reject', authGuard, validate('json', rejectRefundRequestSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const { rejectionReason } = c.req.valid('json');

    await refundRejectByOwner(user.id, id, rejectionReason);
    return c.json({
        success: true,
        message: "Refund request rejected"
    })
})

app.patch('/:id/owner/approve', authGuard, async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');

    await refundApprovedByOwner(user.id, id)

    return c.json({
        success: true,
        message: "Approve refund request"
    })
})



export default app;