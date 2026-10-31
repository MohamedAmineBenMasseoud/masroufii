// lottie.js: load and play Lottie SVG animations with JSON caching.
// If window.lottie is undefined (tests run in jsdom) or prefers-reduced-motion is set, does nothing.

const jsonCache = new Map();

/**
 * Fetch and cache animation JSON.
 */
export async function loadLottieJson(name) {
  const clean = String(name || "").replace(/\.json$/, "");
  const path = `assets/lottie/${clean}.json`;
  if (!jsonCache.has(path)) {
    const promise = fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`Lottie JSON not found: ${path}`);
        return res.json();
      })
      .catch((err) => {
        jsonCache.delete(path);
        throw err;
      });
    jsonCache.set(path, promise);
  }
  return jsonCache.get(path);
}

/**
 * Play a Lottie animation using the SVG renderer.
 * @param {HTMLElement} container
 * @param {string} name - e.g. "success", "loading", "empty", "refresh"
 * @param {object} [options]
 * @param {boolean} [options.loop=false]
 * @returns {Promise<object|null>} Lottie animation instance or null
 */
export async function playLottie(container, name, { loop = false } = {}) {
  if (!container) return null;

  const lottie = typeof window !== "undefined" ? window.lottie : undefined;
  if (!lottie || typeof lottie.loadAnimation !== "function") return null;

  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return null;
  }

  try {
    const animationData = await loadLottieJson(name);
    container.innerHTML = "";
    return lottie.loadAnimation({
      container,
      renderer: "svg",
      loop: Boolean(loop),
      autoplay: true,
      animationData,
    });
  } catch (_err) {
    return null;
  }
}

/**
 * Scan a DOM root for [data-lottie] containers and start their animations.
 */
export function initLottie(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const elements = root.querySelectorAll("[data-lottie]");
  elements.forEach((el) => {
    const name = el.dataset.lottie;
    const loop = el.dataset.loop !== "false";
    playLottie(el, name, { loop });
  });
}

/**
 * Show a centered success overlay for ~800ms, appended to document.body
 * (not inside #view, so render() rewrites of #view do not tear it down).
 */
export function showSuccessOverlay() {
  if (typeof document === "undefined" || !document.body) return null;
  const overlay = document.createElement("div");
  overlay.className = "lottie-overlay lottie-overlay--success";
  overlay.setAttribute("aria-hidden", "true");

  const animBox = document.createElement("div");
  animBox.className = "lottie";
  overlay.appendChild(animBox);
  document.body.appendChild(overlay);

  playLottie(animBox, "success", { loop: false });

  setTimeout(() => {
    overlay.remove();
  }, 800);

  return overlay;
}

/**
 * Show a centered loading overlay while an import is in progress.
 * Returns a dismiss callback function.
 */
export function showLoadingOverlay() {
  if (typeof document === "undefined" || !document.body) return () => { };
  const overlay = document.createElement("div");
  overlay.className = "lottie-overlay lottie-overlay--loading";
  overlay.setAttribute("aria-hidden", "true");

  const animBox = document.createElement("div");
  animBox.className = "lottie";
  overlay.appendChild(animBox);
  document.body.appendChild(overlay);

  const animPromise = playLottie(animBox, "loading", { loop: true });

  return () => {
    animPromise?.then((anim) => anim?.destroy?.());
    overlay.remove();
  };
}
