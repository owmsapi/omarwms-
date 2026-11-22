"use server"

import { desc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import { customers } from "@/db/schema"
import { getSessionUser } from "@/lib/auth"
import { CUSTOMER_IMPORT_LIMIT, validateCustomer, type CustomerInput } from "@/lib/customers"

export async function listCustomers(userId: string) {
  const viewer = await getSessionUser()
  if (!viewer || (viewer.id !== userId && viewer.role !== "admin")) throw new Error("غير مصرح")
  return db.select({ id: customers.id, name: customers.name, phone: customers.phone })
    .from(customers).where(eq(customers.userId, userId)).orderBy(desc(customers.id))
}

export async function saveCustomers(userId: string, input: CustomerInput[]) {
  const viewer = await getSessionUser()
  if (!viewer || (viewer.id !== userId && viewer.role !== "admin")) return { error: "غير مصرح بحفظ عملاء هذا الحساب" }
  if (!Array.isArray(input) || !input.length || input.length > CUSTOMER_IMPORT_LIMIT) {
    return { error: `أضف من عميل واحد إلى ${CUSTOMER_IMPORT_LIMIT} عميل في المرة الواحدة` }
  }
  const rows = input.map(validateCustomer)
  if (rows.some((row) => !row)) return { error: "تحقق من الأسماء والأرقام. استخدم رقمًا دوليًا من 8 إلى 15 خانة مع رمز الدولة." }
  try {
    const inserted = await db.insert(customers)
      .values(rows.map((row) => ({ ...row!, userId })))
      .onConflictDoNothing({ target: [customers.userId, customers.phone] })
      .returning({ id: customers.id })
    revalidatePath(`/users/${userId}/customers`)
    return { added: inserted.length, skipped: rows.length - inserted.length }
  } catch {
    return { error: "تعذر حفظ العملاء. حاول مرة أخرى." }
  }
}
