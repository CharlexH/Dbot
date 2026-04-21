import { StageItem } from "@/types/dbot";

interface StatusStageStripProps {
  items: StageItem[];
}

export function StatusStageStrip({ items }: StatusStageStripProps) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map((item) => (
        <article
          key={item.label}
          className={`rounded-[10px] border px-3.5 py-3 ${
            item.status === "complete"
              ? "border-success bg-successSoft"
              : item.status === "current"
                ? "border-info bg-infoSoft"
                : "border-border bg-panel"
          }`}
        >
          <p
            className={`text-[10px] font-medium uppercase tracking-[0.12em] ${
              item.status === "complete" ? "text-success" : item.status === "current" ? "text-info" : "text-muted"
            }`}
          >
            {item.status}
          </p>
          <p className="mt-2 text-base font-semibold leading-5 text-text md:text-sm">{item.label}</p>
        </article>
      ))}
    </div>
  );
}
