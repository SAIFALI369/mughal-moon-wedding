import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new publish, an open tab may request old page files that no longer exist.
// Reload once to fetch the fresh version instead of showing a blank screen.
if (typeof window !== "undefined") {
  // Only swallow the error when we actually reload; otherwise the failed import
  // resolves to undefined and the router crashes reading `.component`.
  window.addEventListener("vite:preloadError", (event) => {
    const key = "chunk-reload-at";
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10_000) {
      event.preventDefault();
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
