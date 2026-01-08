"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { pushApi } from "@/lib/api";
import { logger } from "@/lib/logger";

type PermissionState = "default" | "granted" | "denied" | "unsupported";

interface PushNotificationState {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotification() {
  const [state, setState] = useState<PushNotificationState>({
    permission: "default",
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Check if push notifications are supported (memoized to avoid dependency issues)
  const isSupported = useMemo(
    () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window,
    []
  );

  // Initialize - check current permission and subscription status
  useEffect(() => {
    if (!isSupported) {
      setState((prev) => ({
        ...prev,
        permission: "unsupported",
        isLoading: false,
      }));
      return;
    }

    const checkStatus = async () => {
      try {
        const permission = Notification.permission as PermissionState;
        let isSubscribed = false;

        if (permission === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          isSubscribed = !!subscription;
        }

        setState({
          permission,
          isSubscribed,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "通知状態の確認に失敗しました",
        }));
      }
    };

    checkStatus();
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setState((prev) => ({ ...prev, error: "このブラウザはプッシュ通知に対応していません" }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          permission: permission as PermissionState,
          isLoading: false,
          error: permission === "denied" ? "通知が拒否されました。ブラウザ設定から許可してください。" : null,
        }));
        return false;
      }

      // Get VAPID public key from server
      const { publicKey } = await pushApi.getVapidPublicKey();

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // Send subscription to server
      await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON);

      setState({
        permission: "granted",
        isSubscribed: true,
        isLoading: false,
        error: null,
      });

      return true;
    } catch (error) {
      logger.error("Push subscription error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "通知の登録に失敗しました",
      }));
      return false;
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Remove from server
        await pushApi.unsubscribe(subscription.endpoint);
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      logger.error("Push unsubscription error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "通知の解除に失敗しました",
      }));
      return false;
    }
  }, [isSupported]);

  return {
    ...state,
    isSupported,
    subscribe,
    unsubscribe,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
