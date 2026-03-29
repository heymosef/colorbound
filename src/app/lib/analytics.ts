import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

let initialized = false;

export function initPostHog() {
  if (initialized || !POSTHOG_KEY) return;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
  });
  initialized = true;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function trackPageview() {
  if (!initialized) return;
  posthog.capture('$pageview');
}

export function setUserProperties(properties: Record<string, unknown>) {
  if (!initialized) return;
  posthog.setPersonProperties(properties);
}
