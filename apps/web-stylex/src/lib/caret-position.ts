/* Caret coordinates inside a textarea — the mirror-div technique: an
   invisible div replicates the textarea's typography and box, receives the
   text up to the caret, and a marker span reports where the caret sits.
   Coordinates are relative to the textarea's border box (scroll not
   subtracted — subtract `el.scrollTop` when positioning). */

const MIRROR_PROPS = [
  "boxSizing",
  "width",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "tabSize",
  "textIndent",
  "textTransform",
  "wordSpacing",
] as const;

export interface CaretCoordinates {
  top: number;
  left: number;
  height: number;
}

export function getCaretCoordinates(el: HTMLTextAreaElement, position: number): CaretCoordinates {
  const style = window.getComputedStyle(el);
  const mirror = document.createElement("div");

  for (const prop of MIRROR_PROPS) {
    mirror.style[prop as "width"] = style[prop as "width"];
  }
  mirror.style.position = "absolute";
  mirror.style.top = "-9999px";
  mirror.style.left = "0";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.overflow = "hidden";

  mirror.textContent = el.value.substring(0, position);

  const marker = document.createElement("span");
  /* A character keeps the span from collapsing at line ends */
  marker.textContent = el.value.substring(position, position + 1) || ".";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const lineHeight =
    style.lineHeight === "normal"
      ? Math.round(parseFloat(style.fontSize) * 1.2)
      : parseFloat(style.lineHeight);
  const coordinates: CaretCoordinates = {
    top: marker.offsetTop,
    left: marker.offsetLeft,
    height: lineHeight,
  };
  document.body.removeChild(mirror);

  return coordinates;
}
