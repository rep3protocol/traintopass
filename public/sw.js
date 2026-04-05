/* global self */
self.addEventListener("push", (event) => {
  let data = { title: "Train to Pass", body: "", url: "/dashboard" };
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch {
    /* use defaults */
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Train to Pass", {
      body: data.body || "",
      icon: "/favicon-32x32.png",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      const abs = new URL(url, self.location.origin).href;
      for (const c of clientList) {
        if (c.url === abs && "focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(abs);
    })
  );
});
