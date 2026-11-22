import { CustomersClient } from "@/components/users/customers-client"
import { listCustomers } from "./actions"

export const dynamic = "force-dynamic"

export default async function CustomersPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  try {
    const customers = await listCustomers(userId)
    return <CustomersClient userId={userId} customers={customers} />
  } catch {
    return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">تعذر تحميل العملاء. تحقق من تسجيل الدخول وصلاحية الوصول ثم أعد تحميل الصفحة.</div>
  }
}
