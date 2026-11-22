export type CustomerInput = { name: string; phone: string }
export type CustomerRow = CustomerInput & { id: number }
export const CUSTOMER_IMPORT_LIMIT = 1000

export function normalizeCustomerPhone(value: string) {
  return value.trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[\s()\-]/g, "")
    .replace(/^\+/, "")
    .replace(/^00/, "")
}

export function validateCustomer(input: unknown): CustomerInput | null {
  if (!input || typeof input !== "object") return null
  const { name, phone } = input as Record<string, unknown>
  if (typeof name !== "string" || typeof phone !== "string") return null
  const cleanName = name.trim()
  const cleanPhone = normalizeCustomerPhone(phone)
  if (!cleanName || cleanName.length > 150 || !/^[1-9]\d{7,14}$/.test(cleanPhone)) return null
  return { name: cleanName, phone: cleanPhone }
}
