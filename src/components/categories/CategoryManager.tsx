"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import type { Category } from "@/generated/prisma/client";

interface CategoryManagerProps {
  initialCategories: Category[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [newIcon, setNewIcon] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const cat = await createCategory({ name: newName.trim(), color: newColor, icon: newIcon || undefined });
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewColor("#6366f1");
      setNewIcon("");
      setShowNew(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create");
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    try {
      const updated = await updateCategory(id, { name: editName.trim(), color: editColor, icon: editIcon || undefined });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color ?? "#6366f1");
    setEditIcon(cat.icon ?? "");
  }

  return (
    <div className="space-y-1">
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}

      {categories.map((cat) =>
        editingId === cat.id ? (
          <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
            <Input
              value={editIcon}
              onChange={(e) => setEditIcon(e.target.value)}
              className="w-12 text-center"
              placeholder="🏷️"
            />
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <input
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border"
            />
            <Button size="sm" variant="ghost" onClick={() => handleUpdate(cat.id)}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div
            key={cat.id}
            className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/40 group"
          >
            <div className="flex items-center gap-2">
              <span className="text-base w-6">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.name}</span>
              {cat.color && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
              )}
              {cat.isSystem && (
                <Badge variant="secondary" className="text-xs py-0">
                  system
                </Badge>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(cat)}>
                <Pencil className="h-3 w-3" />
              </Button>
              {!cat.isSystem && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(cat.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )
      )}

      {showNew ? (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 mt-2">
          <Input
            value={newIcon}
            onChange={(e) => setNewIcon(e.target.value)}
            className="w-12 text-center"
            placeholder="🏷️"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
            placeholder="Category name"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-8 w-8 rounded cursor-pointer border"
          />
          <Button size="sm" variant="ghost" onClick={handleCreate}>
            <Check className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full"
          onClick={() => setShowNew(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      )}
    </div>
  );
}
