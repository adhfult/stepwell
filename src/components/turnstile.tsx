"use client";

import { useEffect, useRef } from "react";
import { getPublicEnv } from "@/lib/env";

/**
 * Cloudflare Turnstile bot check. Supabase Auth requires its token for
 * sign-up, password sign-in and password reset (verified locally), so bots
 * calling Supabase directly are stopped too. Put it inside the <form>: once
 * solved it adds a hidden `cf-turnstile-response` input the action reads.
 * Usually invisible ("interaction-only"); it shows only if Cloudflare wants
 * the student to click. Tokens are single use, so pass a new `resetKey`
 * (the action's state) after every submission to get a fresh one.
 */

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | undefined;

// Added from our own (nonce-trusted) code, which the CSP's 'strict-dynamic' allows.
function loadScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = undefined;
      reject(new Error("Turnstile didn't load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function Turnstile({ resetKey }: { resetKey: unknown }) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const form = container.current?.closest("form");
    let cancelled = false;
    let held = false; // a submission waiting for the token
    // "loading" and "ready" hold submissions until there's a token; only
    // "failed" lets them through, so the server can say to try again.
    let status: "loading" | "ready" | "failed" = "loading";

    const sendHeld = () => {
      if (!held || !form) return;
      held = false;
      form.requestSubmit();
    };

    // The check takes a moment after the page loads. A fast submit (or a
    // password manager's autofill) would otherwise arrive without a token and
    // be refused, so hold it and send it as soon as the token is there.
    const onSubmit = (event: SubmitEvent) => {
      if (status === "failed") return; // no token is coming: let the server say so
      if (form?.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value) return;
      event.preventDefault();
      event.stopPropagation(); // keeps React's form action from running without a token
      held = true;
    };
    form?.addEventListener("submit", onSubmit);

    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: getPublicEnv().NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          appearance: "interaction-only",
          theme: "light",
          // ponytail: "flexible" is at least 300px wide, so on a 320px phone a
          // shown challenge overflows a little; switch to "compact" if that happens.
          size: "flexible",
          callback: () => {
            status = "ready";
            sendHeld();
          },
          // On a Turnstile error, send anyway: the server answers with a plain "try again".
          "error-callback": () => {
            status = "failed";
            sendHeld();
          },
        });
      })
      // Without the script there's no token; the action then says to try again.
      .catch(() => {
        status = "failed";
        sendHeld();
      });

    return () => {
      cancelled = true;
      form?.removeEventListener("submit", onSubmit);
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, [resetKey]);

  return <div ref={container} />;
}
