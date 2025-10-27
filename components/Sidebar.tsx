"use client";

import { memo } from "react";

interface SidebarProps {
  activeMenu: "parser" | "splitter" | "licenses" | "vectorstore" | "storage" | "files";
  onMenuChange: (menu: "parser" | "splitter" | "licenses" | "vectorstore" | "storage" | "files") => void;
}

function Sidebar({ activeMenu, onMenuChange }: SidebarProps) {
  return (
    <aside className="w-20 bg-card border-r border-border flex flex-col items-center py-6 gap-4">
      {/* Logo */}
      <div className="mb-6">
        <h1 className="text-white font-bold text-lg tracking-tight">BGK</h1>
      </div>

      {/* Storage Menu */}
      <button
        onClick={() => onMenuChange("storage")}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-smooth ${
          activeMenu === "storage"
            ? "text-white"
            : "text-gray-500 hover:text-gray-400"
        }`}
        aria-label="Storage"
        title="Storage"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <span className="text-[10px] font-medium">Storage</span>
      </button>

      {/* Parser Menu */}
      <button
        onClick={() => onMenuChange("parser")}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-smooth ${
          activeMenu === "parser"
            ? "text-white"
            : "text-gray-500 hover:text-gray-400"
        }`}
        aria-label="Parser"
        title="Parser"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
        <span className="text-[10px] font-medium">Parser</span>
      </button>

      {/* Text Splitter Menu */}
      <button
        onClick={() => onMenuChange("splitter")}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-smooth ${
          activeMenu === "splitter"
            ? "text-white"
            : "text-gray-500 hover:text-gray-400"
        }`}
        aria-label="Text Splitter"
        title="Text Splitter"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"
          />
        </svg>
        <span className="text-[10px] font-medium">Splitter</span>
      </button>

      {/* VectorStore Menu */}
      <button
        onClick={() => onMenuChange("vectorstore")}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-smooth ${
          activeMenu === "vectorstore"
            ? "text-white"
            : "text-gray-500 hover:text-gray-400"
        }`}
        aria-label="VDB"
        title="Vector Database"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
        <span className="text-[10px] font-medium">VDB</span>
      </button>

      {/* Files Menu */}
      <button
        onClick={() => onMenuChange("files")}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-smooth ${
          activeMenu === "files"
            ? "text-white"
            : "text-gray-500 hover:text-gray-400"
        }`}
        aria-label="Files"
        title="Files"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        <span className="text-[10px] font-medium">Files</span>
      </button>

      {/* Connect Menu */}
      <button
        onClick={() => onMenuChange("licenses")}
        className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-smooth ${
          activeMenu === "licenses"
            ? "text-white"
            : "text-gray-500 hover:text-gray-400"
        }`}
        aria-label="Connect"
        title="Connect"
      >
        <svg
          className="w-6 h-6 mb-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
          />
        </svg>
        <span className="text-[10px] font-medium">Connect</span>
      </button>
    </aside>
  );
}

export default memo(Sidebar);
