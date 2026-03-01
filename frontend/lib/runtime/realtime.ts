"use client";

function readDisableFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem("nexus:disable-realtime") === "1";
  } catch {
    return false;
  }
}

function hasQaQueryFlag(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("qa") === "1" || params.get("e2e") === "1" || params.get("smoke") === "1";
}

function isLikelyAutomationUa(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("headless") || ua.includes("playwright") || ua.includes("puppeteer");
}

export function shouldSuppressRealtime(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return navigator.webdriver === true || isLikelyAutomationUa() || hasQaQueryFlag() || readDisableFlag();
}
