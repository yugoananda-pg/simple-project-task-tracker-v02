"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createClient } from "@/src/lib/supabase/client";

const AUTH_BROADCAST_CHANNEL = "sptt-auth-sync";

type AuthSessionProviderProps = {
  children: React.ReactNode;
};

export default function AuthSessionProvider({
  children,
}: AuthSessionProviderProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let broadcast: BroadcastChannel | null = null;

    function notifyOtherTabs() {
      try {
        broadcast?.postMessage({ type: "auth-changed", at: Date.now() });
      } catch {
        // BroadcastChannel unavailable — other tabs rely on focus refresh.
      }
    }

    function refreshSession() {
      router.refresh();
    }

    if (typeof BroadcastChannel !== "undefined") {
      broadcast = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      broadcast.onmessage = () => {
        refreshSession();
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshSession();
      notifyOtherTabs();
    });

    function handleWindowFocus() {
      refreshSession();
    }

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      subscription.unsubscribe();
      broadcast?.close();
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [router]);

  return children;
}
