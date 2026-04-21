"use client";

import { StylePreset } from "@/types/dbot";
import { StyleCard } from "@/components/home/style-card";

interface StyleGalleryProps {
  categories: readonly string[];
  selectedCategory: string;
  presets: StylePreset[];
  selectedPresetId: string;
  onCategoryChange: (value: string) => void;
  onPresetSelect: (id: string) => void;
}

export function StyleGallery({
  categories,
  selectedCategory,
  presets,
  selectedPresetId,
  onCategoryChange,
  onPresetSelect
}: StyleGalleryProps) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Style categories">
        {categories.map((category) => {
          const selected = category === selectedCategory;

          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onCategoryChange(category)}
              className={`rounded-[8px] border px-3 py-1.5 text-sm transition ${selected ? "border-info bg-infoSoft text-info" : "border-border bg-panelAlt text-muted hover:text-text"}`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {presets.map((preset) => (
          <StyleCard key={preset.id} preset={preset} selected={preset.id === selectedPresetId} onSelect={onPresetSelect} />
        ))}
      </div>
    </div>
  );
}
