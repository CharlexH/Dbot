import { ComponentPropsWithoutRef, ReactNode } from "react";

interface SectionCardProps extends ComponentPropsWithoutRef<"section"> {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function SectionCard({
  title,
  eyebrow,
  children,
  className = "",
  bodyClassName = "",
  ...sectionProps
}: SectionCardProps) {
  const bodySpacingClass = title || eyebrow ? "mt-3" : "";
  const bodyClasses = [bodySpacingClass, bodyClassName].filter(Boolean).join(" ");

  return (
    <section
      {...sectionProps}
      className={`rounded-panel border border-border bg-panel p-4 shadow-panel ${className}`.trim()}
    >
      {eyebrow ? <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">{eyebrow}</p> : null}
      {title ? <h2 className="mt-2 text-lg font-semibold leading-5 tracking-[-0.03em] text-text">{title}</h2> : null}
      <div className={bodyClasses}>{children}</div>
    </section>
  );
}
