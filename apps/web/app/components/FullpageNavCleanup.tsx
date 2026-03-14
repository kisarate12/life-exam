"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * トップ（/life-exam）以外のページで fullpage.js のナビ（1-6）が残らないよう削除する。
 */
export function FullpageNavCleanup() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/life-exam") return;
    const nav = document.getElementById("fp-nav") ?? document.querySelector(".fp-nav");
    nav?.remove();
  }, [pathname]);
  return null;
}
