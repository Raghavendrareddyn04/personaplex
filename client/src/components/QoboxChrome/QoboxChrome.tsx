import { FC, ReactNode } from "react";

const TAB_LABELS = [
  "Voice Bot Flow Draft",
  "Data Bundles",
  "Voice Bundles",
  "Services",
] as const;

type QoboxChromeProps = {
  children: ReactNode;
  /** Shown under the main title in the top bar */
  subtitle?: string;
};

export const QoboxChrome: FC<QoboxChromeProps> = ({
  children,
  subtitle = "Virtual Voice Assistant",
}) => {
  return (
    <div className="qobox-shell flex min-h-screen flex-col bg-[#f0f0f0] text-zinc-900">
      <header className="qobox-topbar shrink-0 border-b border-black bg-zinc-900 px-4 py-3 text-white">
        <h1 className="text-base font-semibold tracking-tight">Qobox</h1>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </header>

      <main className="qobox-main min-h-0 flex-1 overflow-auto">{children}</main>

      <nav
        className="qobox-tabs shrink-0 border-t border-zinc-300 bg-white px-2 py-2"
        aria-label="Flow categories"
      >
        <div
          className="pointer-events-none flex flex-wrap gap-1 md:gap-2"
          role="tablist"
        >
          {TAB_LABELS.map((label, i) => (
            <span
              key={label}
              role="tab"
              aria-selected={i === 0}
              aria-disabled={i !== 0}
              className={
                i === 0
                  ? "qobox-tab qobox-tab-active"
                  : "qobox-tab qobox-tab-inactive"
              }
            >
              {label}
            </span>
          ))}
        </div>
      </nav>
    </div>
  );
};
