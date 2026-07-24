import { useEffect } from "react";

const SCROLL_KEYS = new Set(["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"]);
const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[role='textbox']",
].join(",");

function isEditableTarget(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

function hasModalOpen() {
  return Boolean(document.querySelector("[aria-modal='true']"));
}

function getPageScroller() {
  const candidates = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.querySelector(".app-body"),
  ].filter(Boolean);

  return (
    candidates.find((element) => element.scrollHeight > element.clientHeight + 1) ||
    document.scrollingElement ||
    document.documentElement
  );
}

function scrollWithKeyboard(key) {
  const scroller = getPageScroller();
  const pageStep = Math.max(220, Math.floor(window.innerHeight * 0.82));
  const lineStep = 96;

  if (key === "Home") {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (key === "End") {
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    return;
  }

  const topByKey = {
    ArrowDown: lineStep,
    ArrowUp: -lineStep,
    PageDown: pageStep,
    PageUp: -pageStep,
  };

  scroller.scrollBy({ top: topByKey[key], behavior: "smooth" });
}

export default function useKeyboardPageScroll() {
  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        !SCROLL_KEYS.has(event.key) ||
        isEditableTarget(event.target) ||
        hasModalOpen()
      ) {
        return;
      }

      event.preventDefault();
      scrollWithKeyboard(event.key);
    }

    window.addEventListener("keydown", handleKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
