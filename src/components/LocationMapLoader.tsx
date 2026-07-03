"use client";

import dynamic from "next/dynamic";

export const LocationMap = dynamic(() => import("./LocationMap").then((m) => m.LocationMap), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-900">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
    </div>
  ),
});
