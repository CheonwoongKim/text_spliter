"use client";

import { useState, useEffect } from "react";

export default function StoragePanel() {
  const [activeTab, setActiveTab] = useState<'parse' | 'split'>('parse');

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="border-b border-border bg-card px-10 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[14px] font-semibold text-card-foreground">
              Storage
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Saved results
            </p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setActiveTab('parse')}
              className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                activeTab === 'parse'
                  ? 'bg-card text-card-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              Parse Results
            </button>
            <button
              onClick={() => setActiveTab('split')}
              className={`px-3 py-1 text-xs font-medium rounded transition-smooth ${
                activeTab === 'split'
                  ? 'bg-card text-card-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              Split Results
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-10 py-6">
        {activeTab === 'parse' ? (
          <div>Parse Results</div>
        ) : (
          <div>Split Results</div>
        )}
      </div>
    </div>
  );
}
