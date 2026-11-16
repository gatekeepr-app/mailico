"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Bell, BellOff, Download, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface PushConfig {
  enabled: boolean;
  publicKey?: string;
}

type NotificationState = "loading" | "off" | "on" | "denied" | "unsupported" | "unconfigured" | "install-first";

function decodeApplicationServerKey(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export function PushNotificationsControl() {
  const saveSubscription = useMutation(api.notifications.saveSubscription);
  const removeSubscription = useMutation(api.notifications.removeSubscription);
  const [state, setState] = useState<NotificationState>("loading");
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isIOS && !standalone) {
      setState("install-first");
      return;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    void fetch("/api/push/config", { cache: "no-store" })
      .then((response) => response.json() as Promise<PushConfig>)
      .then(setConfig)
      .catch(() => setConfig({ enabled: false }));

    const permission = Notification.permission;
    if (permission === "denied") {
      setState("denied");
      return;
    }

    void navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setState(subscription ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  const toggle = async () => {
    if (busy) return;
    if (state === "denied") {
      toast.info("Notifications are blocked by your browser. Allow them in site settings to turn them on.");
      return;
    }
    if (state === "unsupported") {
      toast.info("This browser does not support web push notifications.");
      return;
    }
    if (state === "install-first") {
      toast.info("Install Mailico to your Home Screen before enabling push notifications.");
      return;
    }
    if (state !== "on" && (state === "unconfigured" || !config?.enabled || !config.publicKey)) {
      toast.info("Push notifications need VAPID keys configured by your Mailico administrator.");
      return;
    }

    setBusy(true);
    try {
      if (state !== "on") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setState(permission === "denied" ? "denied" : "off");
          return;
        }
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const existing = await registration.pushManager.getSubscription();
      if (state === "on" && existing) {
        await removeSubscription({ endpoint: existing.endpoint });
        await existing.unsubscribe();
        setState("off");
        toast.success("Email notifications turned off");
        return;
      }
      if (state === "on") {
        setState("off");
        return;
      }

      const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeApplicationServerKey(config.publicKey),
        });
      const data = subscription.toJSON();
      if (!data.endpoint || !data.keys?.p256dh || !data.keys.auth) {
        await subscription.unsubscribe();
        throw new Error("The browser returned an incomplete push subscription.");
      }

      try {
        await saveSubscription({
          endpoint: data.endpoint,
          keys: { p256dh: data.keys.p256dh, auth: data.keys.auth },
        });
      } catch (error) {
        await subscription.unsubscribe();
        throw error;
      }

      setState("on");
      toast.success("Email notifications turned on for this device");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update notification settings.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (config && !config.enabled && (state === "off" || state === "loading")) {
      setState("unconfigured");
    }
  }, [config, state]);

  const label = state === "on" ? "Turn email notifications off" :
    state === "loading" ? "Checking notification settings" :
      state === "denied" ? "Notifications blocked by browser" :
        state === "unsupported" ? "Notifications are not supported" :
          state === "install-first" ? "Install Mailico to enable notifications" :
          state === "unconfigured" ? "Push notifications are not configured" :
            "Turn email notifications on";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={state === "on"}
      title={label}
      disabled={busy || state === "loading"}
      onClick={() => void toggle()}
      className="min-h-11 min-w-11 rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
    >
      {state === "on" ? <Bell className="h-5 w-5 text-[#286653]" /> : <BellOff className="h-5 w-5" />}
    </button>
  );
}

export function PwaInstallControl() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsInstalled(isStandalone);
    setIsAppleMobile(isIOS && !isStandalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setPrompt(null);
      toast.success("Mailico is installed");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled || (!prompt && !isAppleMobile)) return null;

  const install = async () => {
    if (!prompt) {
      toast.info("To install Mailico, tap Share, then choose Add to Home Screen.");
      return;
    }
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setPrompt(null);
    } catch {
      toast.error("Could not open the install prompt. Try your browser’s install option.");
    }
  };

  return (
    <button
      type="button"
      aria-label="Install Mailico app"
      title="Install Mailico app"
      onClick={() => void install()}
      className="min-h-11 min-w-11 rounded-full p-2.5 text-gray-500 transition hover:bg-gray-100"
    >
      {isAppleMobile ? <Smartphone className="h-5 w-5" /> : <Download className="h-5 w-5" />}
    </button>
  );
}
