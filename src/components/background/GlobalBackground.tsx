"use client";

import { AuroraDrift } from "@/components/background/AuroraDrift";

export function GlobalBackground() {
  return (
    // translate3d forces GPU compositing, preventing scroll-repaint flicker on iOS
    <div
      className="fixed inset-0 -z-10"
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
      aria-hidden="true"
    >
      <AuroraDrift className="w-full h-full" />
    </div>
  );
}
