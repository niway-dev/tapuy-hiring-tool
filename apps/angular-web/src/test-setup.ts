/**
 * Global test setup, registered via angular.json's `test.options.setupFiles`.
 *
 * jsdom (the DOM implementation this project's unit-test runner uses) does not
 * implement `HTMLDialogElement.showModal()` / `.close()` — see
 * https://github.com/jsdom/jsdom/issues/3294, still open as of jsdom 28. Every
 * `<dialog>`-backed component here (ArchiveDialog, EditInteractionDialog,
 * DeleteInteractionDialog) calls `showModal()`/`close()` from its own
 * `open()`/`close()` methods, so without this polyfill those methods throw
 * under jsdom and the dialogs are untestable through anything but reaching
 * past them. Do NOT delete this file or its registration — that regresses
 * every dialog spec silently (a missing method that isn't a TypeScript type
 * error, just a runtime throw).
 */
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement): void {
      this.setAttribute("open", "");
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement): void {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
