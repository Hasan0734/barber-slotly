import { createHash, randomBytes } from "node:crypto"

export const slugify = (text: string) => text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")



const bookingToken = randomBytes(32).toString('hex');
export const bookingTokenHash = createHash('sha256').update(bookingToken).digest("hex")