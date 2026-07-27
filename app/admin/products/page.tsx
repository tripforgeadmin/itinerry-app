import Link from "next/link";
import { fetchProducts, fetchPriceBooks, fetchEntriesForBook, fetchKitItems, type PriceBookEntryRow } from "@/lib/products";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";
import ProductManager from "./ProductManager";
import PriceBookManager from "./PriceBookManager";
import PriceBookEntryEditor from "./PriceBookEntryEditor";
import KitEditor from "./KitEditor";

export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const lang = await getAdminLang();
  // Include inactive so admins can re-enable (lost-reasons pattern).
  const [products, books, kitItems] = await Promise.all([
    fetchProducts(false),
    fetchPriceBooks(false),
    fetchKitItems(),
  ]);
  const entriesByBook: Record<string, PriceBookEntryRow[]> = Object.fromEntries(
    await Promise.all(books.map(async (b) => [b.id, await fetchEntriesForBook(b.id)]))
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← {t(lang, "กลับ", "Back")}</Link>
          <h1 className="text-xl font-bold text-gray-800">📦 {t(lang, "สินค้า/บริการ และราคา", "Products & pricing")}</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {t(
            lang,
            "จัดการรายการบริการ ค่าธรรมเนียม และราคาใน price book — ใช้เป็นตัวเลือกตอนสร้างใบเสนอราคา การแก้ราคาไม่กระทบใบเสนอราคาที่ออกไปแล้ว (ระบบ snapshot ราคา ณ เวลาเสนอ)",
            "Manage services, fees, and price-book prices — these feed the quote builder. Editing prices never changes issued quotes (prices are snapshotted at quoting time)."
          )}
        </p>

        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            {t(lang, "สินค้า/บริการ", "Products")}
          </h2>
          <ProductManager products={products} kitParentIds={kitItems.map((k) => k.parent_product_id)} lang={lang} />
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Price books
          </h2>
          <PriceBookManager books={books} lang={lang} />
        </section>

        <section className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            {t(lang, "ตั้งราคาต่อ price book", "Prices per book")}
          </h2>
          <PriceBookEntryEditor products={products} books={books} entriesByBook={entriesByBook} lang={lang} />
        </section>

        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            📦 {t(lang, "ชุดแพ็กเกจ (Kit)", "Kits")}
          </h2>
          <KitEditor
            products={products}
            kitItems={kitItems}
            standardEntries={entriesByBook[books.find((b) => b.is_standard)?.id ?? ""] ?? []}
            lang={lang}
          />
        </section>
      </div>
    </main>
  );
}
