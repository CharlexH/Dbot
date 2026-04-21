import { StylePreset } from "@/types/dbot";

interface StyleCardProps {
  preset: StylePreset;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function StyleCard({ preset, selected, onSelect }: StyleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(preset.id)}
      className={`group rounded-panel border p-4 text-left shadow-panel transition ${selected ? "border-info bg-panel" : "border-border bg-panel"}`}
    >
      <div className="rounded-[10px] border border-border bg-[radial-gradient(circle_at_top_left,_rgba(49,94,231,0.12),_transparent_42%),linear-gradient(135deg,#ffffff,#f5f8fd_58%,#eef3fb)] p-4">
        <div className="h-32 rounded-[8px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(240,245,255,0.96))] p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]">
          <div className="flex h-full flex-col justify-between">
            <div className="flex gap-2">
              {preset.palette.map((value) => (
                <span key={value} className="h-3 w-3 rounded-full border border-white/80" style={{ backgroundColor: value }} />
              ))}
            </div>
            <div>
              <p className="text-xl font-semibold text-text">{preset.name}</p>
              <p className="mt-1 text-sm text-textSoft">{preset.summary}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {preset.categories.map((category) => (
          <span key={category} className="rounded-[8px] border border-border bg-panelAlt px-2 py-1 text-[11px] font-medium text-muted">
            {category}
          </span>
        ))}
      </div>
    </button>
  );
}
