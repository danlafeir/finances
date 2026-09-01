import { getCategories } from "@/actions/categories";
import { CategoryManager } from "@/components/categories/CategoryManager";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Categories</h1>
      <CategoryManager initialCategories={categories} />
    </div>
  );
}
