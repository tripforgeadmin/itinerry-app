"use client";

import { useState } from "react";

/** Same card chrome as page.tsx's <Section>, plus an eye-icon toggle (top-right) to hide/show
 *  the body — for sections an admin may want out of the way while working a ticket. Collapse
 *  state is local to the page view (not persisted). */
export default function CollapsibleSection({
  title,
  defaultCollapsed = false,
  children,
}: {
  title: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h2>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="text-sm text-gray-400 hover:text-gray-600"
          title={collapsed ? "แสดง" : "ซ่อน"}
        >
          {collapsed ? "🙈" : "👁️"}
        </button>
      </div>
      {!collapsed && children}
    </div>
  );
}
