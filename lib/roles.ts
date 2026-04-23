export const allowedRoles = ["ADMIN", "ORDERING", "RECEIVING", "DELIVERY"] as const

export type AppRole = (typeof allowedRoles)[number]

export const defaultRole: AppRole = "ORDERING"
