export const SERVICE_WORKER_UPDATE_EVENT = "trinittty-service-worker-update";

let waitingWorker: ServiceWorker | null = null;
let refreshing = false;

function notifyUpdateReady(worker: ServiceWorker) {
  waitingWorker = worker;
  window.dispatchEvent(new Event(SERVICE_WORKER_UPDATE_EVENT));
}

function watchWorker(worker: ServiceWorker) {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) notifyUpdateReady(worker);
  });
}

export function activateWaitingServiceWorker() {
  waitingWorker?.postMessage({ type: "SKIP_WAITING" });
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => {
      if (registration.waiting) notifyUpdateReady(registration.waiting);
      registration.update().catch(() => undefined);

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (worker) watchWorker(worker);
      });
    }).catch(() => {
      // App still works without SW; install/offline just will not be available.
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}
