/*
 * Applies the stored theme before first paint so the app never flashes the
 * wrong background.
 *
 * This lives in a file rather than inline in index.html on purpose: an inline
 * <script> would force `script-src 'unsafe-inline'` in the Content-Security-
 * Policy, which is the directive that actually stops injected scripts. A
 * classic script (no type=module, no async/defer) in <head> still blocks
 * parsing and runs before paint, so the no-flash behaviour is unchanged.
 *
 * Kept in sync with STORAGE_KEYS.theme in src/utils/storage.ts.
 */
try {
  var stored = localStorage.getItem('movieexplorer:theme')
  var mode =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  document.documentElement.style.colorScheme = mode
  document.documentElement.dataset.theme = mode
} catch (e) {
  /* storage blocked; fall through to the React default */
}
