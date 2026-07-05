"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Three-column ticket workspace: a sticky full-width header over LEFT / CENTER / RIGHT
 * columns that scroll independently and can be dragged wider/narrower. Content is
 * server-rendered and passed in as nodes. Below lg it collapses to a single stacked,
 * page-scrolling layout (no handles).
 */
const MIN = 280;
const MAX = 680;
function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export default function TicketWorkspace({
  header,
  left,
  center,
  right,
}: {
  header: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  const [isLg, setIsLg] = useState(true);
  const [leftW, setLeftW] = useState(380);
  const [rightW, setRightW] = useState(380);
  const drag = useRef<{ side: "left" | "right"; startX: number; startW: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsLg(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const onMove = useCallback((e: MouseEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    if (d.side === "left") setLeftW(clamp(d.startW + dx, MIN, MAX));
    else setRightW(clamp(d.startW - dx, MIN, MAX));
  }, []);

  const onUp = useCallback(() => {
    drag.current = null;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }, [onMove]);

  const startDrag = (side: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    drag.current = { side, startX: e.clientX, startW: side === "left" ? leftW : rightW };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const Handle = ({ side }: { side: "left" | "right" }) => (
    <div
      onMouseDown={startDrag(side)}
      className="hidden lg:flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-gray-200 hover:bg-blue-300 transition-colors"
      title="ลากเพื่อปรับความกว้าง"
    >
      <div className="h-8 w-0.5 rounded bg-gray-400" />
    </div>
  );

  return (
    <div className="flex flex-col bg-gray-50 lg:h-screen lg:overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white px-5 py-3">{header}</header>

      <div className="flex flex-col lg:flex-1 lg:flex-row lg:overflow-hidden">
        <div
          className="shrink-0 overflow-x-hidden p-4 lg:overflow-y-auto"
          style={isLg ? { width: leftW } : undefined}
        >
          {left}
        </div>
        <Handle side="left" />
        <div className="min-w-0 flex-1 p-4 lg:overflow-y-auto">{center}</div>
        <Handle side="right" />
        <div
          className="shrink-0 p-4 lg:h-full lg:overflow-hidden"
          style={isLg ? { width: rightW } : undefined}
        >
          <div className="h-[70vh] lg:h-full">{right}</div>
        </div>
      </div>
    </div>
  );
}
