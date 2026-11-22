"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Download, FileSpreadsheet, Search, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CUSTOMER_IMPORT_LIMIT, validateCustomer, type CustomerInput, type CustomerRow } from "@/lib/customers"
import { saveCustomers } from "@/app/users/[userId]/customers/actions"

type PreviewRow = { row: number; customer: CustomerInput | null; duplicate: boolean }

export function CustomersClient({ userId, customers }: { userId: string; customers: CustomerRow[] }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [filename, setFilename] = useState("")
  const validRows = preview.filter((r) => r.customer && !r.duplicate)
  const invalidRows = preview.filter((r) => !r.customer)
  const duplicates = preview.filter((r) => r.duplicate).length
  const filtered = customers.filter((c) => c.name.includes(search.trim()) || c.phone.includes(search.trim()))

  async function save(rows: CustomerInput[], manual = false) {
    setBusy(true); setNotice(""); setError("")
    try {
      const result = await saveCustomers(userId, rows)
      if (result.error) { setError(result.error); return }
      setNotice(`تمت إضافة ${result.added} عميل. تم تجاوز ${result.skipped} رقم مكرر.`)
      if (manual) { setName(""); setPhone("") }
      else { setPreview([]); setFilename(""); if (fileInput.current) fileInput.current.value = "" }
      router.refresh()
    } catch { setError("تعذر الاتصال. حاول مرة أخرى.") }
    finally { setBusy(false) }
  }

  function addManual(event: FormEvent) {
    event.preventDefault()
    const customer = validateCustomer({ name, phone })
    if (!customer) { setError("أدخل اسمًا ورقمًا دوليًا صحيحًا من 8 إلى 15 خانة مع رمز الدولة."); return }
    void save([customer], true)
  }

  async function readFile(file?: File) {
    setPreview([]); setFilename(""); setError(""); setNotice("")
    if (!file) return
    if (!/\.(xlsx|xls|csv)$/i.test(file.name) || file.size > 5 * 1024 * 1024) {
      setError("اختر ملف Excel أو CSV بحجم لا يتجاوز 5 ميجابايت."); return
    }
    setBusy(true)
    try {
      const XLSX = await import("xlsx")
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", sheetRows: CUSTOMER_IMPORT_LIMIT + 3 })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new Error("empty")
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "", blankrows: true })
      const headers = (rows[0] || []).map((h) => String(h).trim().toLowerCase())
      const nameIndex = headers.findIndex((h) => ["الاسم", "اسم العميل", "name", "customer name"].includes(h))
      const phoneIndex = headers.findIndex((h) => ["الهاتف", "رقم الهاتف", "رقم الجوال", "الرقم", "phone", "mobile"].includes(h))
      if (nameIndex < 0 || phoneIndex < 0) {
        setError('يجب أن يحتوي الصف الأول على عمود «الاسم» وعمود «رقم الهاتف». يمكنك تنزيل النموذج.'); return
      }
      const populated = rows.slice(1).map((cells, i) => ({ cells, row: i + 2 })).filter(({ cells }) => cells.some((c) => String(c).trim()))
      const fullRange = sheet["!fullref"] || sheet["!ref"]
      const totalRows = fullRange ? XLSX.utils.decode_range(fullRange).e.r : 0
      if (totalRows > CUSTOMER_IMPORT_LIMIT || populated.length > CUSTOMER_IMPORT_LIMIT) {
        setError(`الحد الأقصى ${CUSTOMER_IMPORT_LIMIT} صف بعد العناوين. قسّم الملف إلى ملفات أصغر.`); return
      }
      if (!populated.length) { setError("الملف لا يحتوي على عملاء."); return }
      const seen = new Set(customers.map((c) => c.phone))
      setPreview(populated.map(({ cells, row }) => {
        const customer = validateCustomer({ name: String(cells[nameIndex] || ""), phone: String(cells[phoneIndex] || "") })
        const duplicate = !!customer && seen.has(customer.phone)
        if (customer) seen.add(customer.phone)
        return { row, customer, duplicate }
      }))
      setFilename(file.name)
    } catch { setError("تعذر قراءة الملف. تأكد من أنه ملف Excel أو CSV صالح وغير محمي بكلمة مرور.") }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = "" }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx")
    const sheet = XLSX.utils.aoa_to_sheet([["الاسم", "رقم الهاتف"], ["أحمد محمود", "201012345678"]])
    sheet["!cols"] = [{ wch: 25 }, { wch: 22 }]
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, "العملاء")
    XLSX.writeFile(book, "customers-template.xlsx")
  }

  return <div dir="rtl" className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium text-emerald-700">دليل التواصل</p><h1 className="text-2xl font-bold text-slate-900">العملاء</h1><p className="mt-2 text-sm text-slate-500">أضف أسماء عملائك وأرقامهم يدويًا أو استوردها من ملف إكسيل.</p></div>
      <span className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm"><Users className="h-5 w-5 text-emerald-600" />{customers.length} عميل محفوظ</span>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border bg-white p-5 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 font-bold"><UserPlus className="h-5 w-5 text-emerald-600" />إضافة عميل يدويًا</h2>
        <form onSubmit={addManual} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="customer-name">اسم العميل</Label><Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} required autoComplete="name" disabled={busy} /></div>
          <div className="space-y-2"><Label htmlFor="customer-phone">رقم الهاتف</Label><Input id="customer-phone" type="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+201012345678" maxLength={40} required autoComplete="tel" disabled={busy} /><p className="text-xs text-slate-500">اكتب الرقم مع رمز الدولة، مثل 201012345678.</p></div>
          <Button type="submit" disabled={busy} className="bg-emerald-700 hover:bg-emerald-800">حفظ العميل</Button>
        </form>
      </section>
      <section className="rounded-2xl border bg-white p-5 sm:p-6">
        <h2 className="mb-5 flex items-center gap-2 font-bold"><FileSpreadsheet className="h-5 w-5 text-emerald-600" />استيراد من إكسيل</h2>
        <p className="mb-4 text-sm leading-7 text-slate-500">الصف الأول للعناوين: «الاسم» و«رقم الهاتف». تُقرأ الورقة الأولى فقط. نسّق عمود الهاتف كنص واكتب رمز الدولة للحفاظ على الرقم كاملًا.</p>
        <Label htmlFor="customers-file" className="mb-2 block">اختيار ملف العملاء</Label>
        <Input ref={fileInput} id="customers-file" type="file" accept=".xlsx,.xls,.csv" disabled={busy} onChange={(e) => void readFile(e.target.files?.[0])} />
        <p className="mt-2 text-xs text-slate-500">XLSX، XLS، CSV · حتى 5 ميجابايت و{CUSTOMER_IMPORT_LIMIT} عميل في كل ملف</p>
        <Button variant="outline" className="mt-5 gap-2" disabled={busy} onClick={() => void downloadTemplate().catch(() => setError("تعذر تنزيل النموذج. حاول مرة أخرى."))}><Download className="h-4 w-4" />تنزيل نموذج إكسيل</Button>
      </section>
    </div>
    {busy && <p role="status" className="animate-pulse rounded-xl bg-slate-100 p-4 text-sm">جارٍ معالجة البيانات…</p>}
    {preview.length > 0 && <section className="rounded-2xl border border-emerald-200 bg-white p-5">
      <h2 className="font-bold">معاينة الاستيراد: <bdi>{filename}</bdi></h2>
      <p className="my-3 text-sm text-slate-600">{validRows.length} جاهز للحفظ · {duplicates} مكرر سيتم تجاوزه · {invalidRows.length} غير صالح سيتم تجاوزه</p>
      {invalidRows.length > 0 && <p className="mb-3 text-sm text-red-700">راجع الاسم والرقم الدولي في الصفوف: {invalidRows.map((r) => r.row).join("، ")}</p>}
      <div className="mb-4 max-h-60 overflow-auto"><table className="w-full text-right text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">الصف</th><th className="p-2">الاسم</th><th className="p-2">رقم الهاتف</th></tr></thead><tbody>{validRows.slice(0, 50).map((r) => <tr key={r.row} className="border-b"><td className="p-2">{r.row}</td><td className="p-2">{r.customer!.name}</td><td className="p-2"><bdi>{r.customer!.phone}</bdi></td></tr>)}</tbody></table></div>
      {validRows.length > 50 && <p className="mb-3 text-xs text-slate-500">تُعرض أول 50 نتيجة. سيتم حفظ جميع النتائج الصالحة.</p>}
      <div className="flex gap-3"><Button disabled={busy || !validRows.length} className="bg-emerald-700 hover:bg-emerald-800" onClick={() => void save(validRows.map((r) => r.customer!))}>حفظ {validRows.length} عميل</Button><Button variant="outline" disabled={busy} onClick={() => { setPreview([]); setFilename("") }}>إلغاء</Button></div>
    </section>}
    <section className="overflow-hidden rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><h2 className="font-bold">قائمة العملاء</h2><div className="relative w-full sm:w-72"><Search aria-hidden="true" className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><Input aria-label="البحث بالاسم أو رقم الهاتف" placeholder="ابحث بالاسم أو رقم الهاتف" className="pr-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div></div>
      {filtered.length ? <div className="max-h-[600px] overflow-auto"><table className="w-full text-right text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th scope="col" className="px-5 py-3">اسم العميل</th><th scope="col" className="px-5 py-3">رقم الهاتف</th></tr></thead><tbody>{filtered.map((c) => <tr key={c.id} className="border-t hover:bg-slate-50"><td className="px-5 py-4 font-medium">{c.name}</td><td className="px-5 py-4"><bdi>{c.phone}</bdi></td></tr>)}</tbody></table></div> : <div className="px-5 py-14 text-center"><Users className="mx-auto mb-3 h-9 w-9 text-slate-300" /><p className="font-medium text-slate-700">{customers.length ? "لا توجد نتائج مطابقة" : "دليل عملائك يبدأ هنا"}</p><p className="mt-2 text-sm text-slate-500">{customers.length ? "جرّب اسمًا أو رقمًا آخر." : "أضف أول عميل أو ارفع ملف إكسيل من الأعلى."}</p></div>}
    </section>
  </div>
}
