// modal.js: one reusable popup for every form (Add Week, Add Expense, edits, goal) and for confirmations.
// It only builds and shows the popup. It knows nothing about weeks or money.
import { escapeHtml } from "./utils.js";

let backdrop = null;
let onCancel = null;

/** Close the popup if one is open. */
export function closeModal() {
  if (!backdrop) return;
  backdrop.remove();
  backdrop = null;
  document.removeEventListener("keydown", onKey);
  const cb = onCancel;
  onCancel = null;
  if (cb) cb();
}

function onKey(e) {
  if (e.key === "Escape") closeModal();
}

function mount(html) {
  closeModal();
  backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop open";
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  backdrop.addEventListener("mousedown", (e) => {
    if (e.target === backdrop) closeModal(); // click outside
  });
  document.body.appendChild(backdrop);
  document.addEventListener("keydown", onKey);
  return backdrop.querySelector(".modal");
}

function fieldHtml(f) {
  const id = `field-${f.id}`;
  const control = f.options
    ? `<select id="${id}" name="${f.id}">${f.options
        .map((o) => {
          const val = typeof o === "object" && o !== null ? o.value : o;
          const text = typeof o === "object" && o !== null ? o.label : o;
          return `<option value="${escapeHtml(val)}" ${String(val) === String(f.value) ? "selected" : ""}>${escapeHtml(text)}</option>`;
        })
        .join("")}</select>`
    : `<input id="${id}" name="${f.id}" type="${f.type || "text"}" value="${escapeHtml(f.value ?? "")}" ${f.attrs || ""} required>`;
  return `<div class="field"><label for="${id}">${escapeHtml(f.label)}</label>${control}</div>`;
}

/**
 * Show a form popup.
 * fields: [{ id, label, type?, value?, attrs?, options? }]   (options => dropdown)
 * onSubmit(values) may return { ok: false, error } to keep the popup open and show the message;
 * any other result closes it. It can be async.
 * note: optional HTML shown above the fields (pass trusted HTML only).
 */
export function openForm({ title, fields, onSubmit, note = "", submitLabel = "Save", onChange = null }) {
  const modal = mount(`
    <h3>${escapeHtml(title)}</h3>
    <form class="form" novalidate>
      ${note ? `<div class="notice">${note}</div>` : ""}
      ${fields.map(fieldHtml).join("")}
      ${onChange ? '<div class="form-preview" data-form-preview hidden></div>' : ""}
      <div class="form-error" role="alert" hidden></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" data-cancel>Cancel</button>
        <button type="submit" class="btn">${escapeHtml(submitLabel)}</button>
      </div>
    </form>`);

  const form = modal.querySelector("form");
  const errorBox = modal.querySelector(".form-error");
  const showError = (msg) => { errorBox.textContent = msg; errorBox.hidden = false; };
  if (onChange) {
    const preview = modal.querySelector("[data-form-preview]");
    const updatePreview = () => {
      const values = Object.fromEntries(new form.ownerDocument.defaultView.FormData(form).entries());
      const html = onChange(values) || "";
      preview.innerHTML = html;
      preview.hidden = !html;
    };
    form.addEventListener("input", updatePreview);
    form.addEventListener("change", updatePreview);
    updatePreview();
  }

  modal.querySelector("[data-cancel]").addEventListener("click", closeModal);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.hidden = true;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const values = Object.fromEntries(new form.ownerDocument.defaultView.FormData(form).entries());
    const result = await onSubmit(values);
    if (result && result.ok === false) showError(result.error || "Something went wrong.");
    else { onCancel = null; closeModal(); }
  });

  const first = form.querySelector("input, select");
  if (first) first.focus();
}

/** Ask for confirmation. Resolves true if confirmed, false if cancelled or dismissed. */
export function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
  return new Promise((resolve) => {
    const modal = mount(`
      <h3>${escapeHtml(title)}</h3>
      <p class="modal-message">${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button type="button" class="btn secondary" data-cancel>Cancel</button>
        <button type="button" class="btn ${danger ? "danger" : ""}" data-ok>${escapeHtml(confirmLabel)}</button>
      </div>`);
    onCancel = () => resolve(false);
    modal.querySelector("[data-cancel]").addEventListener("click", closeModal);
    modal.querySelector("[data-ok]").addEventListener("click", () => {
      onCancel = null;
      closeModal();
      resolve(true);
    });
    modal.querySelector("[data-ok]").focus();
  });
}

/** Show an action dialog popup with action buttons. */
export function openActionModal({ title, note = "", actions = [] }) {
  const modal = mount(`
    <h3>${escapeHtml(title)}</h3>
    ${note ? `<div class="notice">${note}</div>` : ""}
    <div class="modal-action-list">
      ${actions
        .map(
          (a) =>
            `<button type="button" class="btn ${a.variant || ""}" data-action="${escapeHtml(a.action || "")}">${escapeHtml(a.label)}</button>`
        )
        .join("")}
      <button type="button" class="btn secondary" data-cancel>Cancel</button>
    </div>`);

  modal.querySelector("[data-cancel]").addEventListener("click", closeModal);
  modal.querySelectorAll(".modal-action-list button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.dataset.action !== "reset") closeModal();
    });
  });
}
