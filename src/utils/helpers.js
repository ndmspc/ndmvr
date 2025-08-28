import { redraw } from "jsroot";

export const HISTOGRAM_IMG_ID = "histo";

const defaultUserHandler = (kind, info) => {
  console.log(kind, info);
};

export const jsrootRedraw = (
  obj,
  { elementId = HISTOGRAM_IMG_ID, onUser = defaultUserHandler } = {}
) => {
  if (!obj) return;

  const el = document.getElementById(elementId);
  if (!el) return;

  if (el.offsetParent !== null) {
    redraw(elementId, obj, "")
      .then((painter) => {
        painter.configureUserClickHandler((info) => onUser("click", info));
      })
      .catch((err) => {
        console.warn("[jsrootRedraw] redraw failed:", err);
      });
  } else {
    setTimeout(() => jsrootRedraw(obj, { elementId, onUser }), 100);
  }
};

export const trimUrl = (s, head = 40, tail = 40) => {
  if (!s) return "";
  return s.length <= head + tail ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
};
