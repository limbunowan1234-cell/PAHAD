/**
 * Build-time settings on top of app.json.
 * PAHAD_API_BASE: where the app gets its data (default https://pahad.org). Test builds can point at a
 * local server, e.g. http://10.0.2.2:3006 from the Android emulator; plain http is then allowed for that build only.
 */
module.exports = ({ config }) => {
  const apiBase = process.env.PAHAD_API_BASE || config.extra.apiBase;
  const plugins = (config.plugins || []).filter((p) => (Array.isArray(p) ? p[0] : p) !== "expo-build-properties");
  plugins.push(["expo-build-properties", { android: { usesCleartextTraffic: apiBase.startsWith("http:") } }]);
  return { ...config, plugins, extra: { ...config.extra, apiBase } };
};
