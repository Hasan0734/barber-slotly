import { Hono } from "hono";
import { authGuard } from "../middleware/auth-guard.js";
import { validate } from "../lib/validate.js";
import {
    appointmentQuerySchema,
    updateAppointmentStatusSchema,
    updateAppointmentSchema,
    switchPaymentMethod
} from "../schemas/appointment.js";
import {
    changeAppointmentStatus,
    changePaymentMethod,
    getAppointment,
    getCustomerAppointments,
    getOwnerAppointments,
    updateAppointment
} from "../services/appointment.js";
import { validateAuth } from "../middleware/validateAuth.js";

const app = new Hono();

app.get('/owner', authGuard, validate('query', appointmentQuerySchema), async (c) => {
    const user = c.get('user');
    const query = c.req.valid('query');
    const { page, limit, status, search, sort } = query;
    const offset = (page - 1) * limit;


    const { data, totalResult } = await getOwnerAppointments({
        offset,
        limit,
        status,
        search,
        sort,
        userId: user.id
    })

    const total = totalResult[0].total;
    return c.json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1
        }
    }, 200)
})

app.get('/', validateAuth, validate('query', appointmentQuerySchema), async (c) => {
    const query = c.req.valid('query');
    const customer = c.get('customer');
    const { page, limit, status, search, sort } = query;
    const offset = (page - 1) * limit;


    const { data, totalResult } = await getCustomerAppointments({
        offset,
        limit,
        status,
        search,
        sort,
        customer
    })

    const total = totalResult[0].total;
    return c.json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page * limit < total,
            hasPreviousPage: page > 1
        }
    }, 200)
})
app.get('/:id', authGuard, async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const appointment = getAppointment(id, user.id)
    return c.json({ success: true, data: appointment }, 200)
})

app.patch("/:id/payment-method", validateAuth, validate('json', switchPaymentMethod), async (c) => {
    const { paymentMethod } = c.req.valid('json');
    const id = c.req.param('id');
    const customer = c.get('customer');

    const appointment = await changePaymentMethod({ id, customer, paymentMethod })
    return c.json({
        success: true,
        message: "Payment method changed",
        data: {
            appointmentId: appointment.id,
            paymentMethod: appointment.paymentMethod
        }
    })

})

app.patch("/:id/cancel", validateAuth, async (c) => {
    const customer = c.get('customer');



    return c.json({
        message: "Appointment cancelled.",
        success: true,
    }, 201)
})

app.patch('/:id/status', authGuard, validate('json', updateAppointmentStatusSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const data = c.req.valid('json');

    const appointment = await changeAppointmentStatus({
        id,
        ownerId: user.id,
        status: data.status
    })

    return c.json({
        success: true,
        message: "Appointment status changed",
        data: appointment
    }, 200)
})

app.patch('/:id', authGuard, validate("json", updateAppointmentSchema), async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');
    const body = c.req.valid('json')

    const appointment = await updateAppointment({ userId: user.id, id, data: body })

    return c.json({
        success: true,
        message: "Appointment successfully updated",
        data: appointment
    }, 200)
})


export default app;