import { createHash } from "node:crypto"

export const slugify = (text: string) => text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")




export const generateTokenHash = (token: string) => {
    return createHash('sha256')
        .update(token)
        .digest("hex")
}