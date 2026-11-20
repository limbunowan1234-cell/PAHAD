/*
 * PAHAD+ Android build (org.pahad.plus), the same way as the PAHAD and PAHAD Admin apps.
 *
 * Run it from the folder that holds the PAHAD signing key and @bubblewrap/core
 * (C:\Users\G J\pahad-apk): copy this file there, then
 *     node build-plus.js
 *
 * Makes, in D:\PAHAD\android\pahad-plus\dist (never committed):
 *   PAHAD-Plus.aab  upload this to Google Play
 *   PAHAD-Plus.apk  install on a phone to test
 *
 * Reads the app's name, icons, colours and start page from the live site (https://pahad.org/plus.webmanifest),
 * so the website must be deployed first. Signs with pahad-release.keystore (alias "pahad"); the password is read
 * from keystore-password.txt next to it and never printed.
 * For each new Play Store release, raise VERSION_CODE by 1 and change VERSION_NAME.
 */
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { Config, TwaManifest, TwaGenerator, ConsoleLog } = require("@bubblewrap/core");

const VERSION_CODE = 1;
const VERSION_NAME = "1.0.0";
const OUT = process.env.PAHAD_PLUS_OUT || "D:\\PAHAD\\android\\pahad-plus\\dist";

const HOME = process.env.USERPROFILE;
// Android SDK: ANDROID_HOME if set, otherwise where Android Studio / Bubblewrap put it.
const SDK = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT, path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"), path.join(HOME, ".bubblewrap", "android_sdk"), "D:\\Android\\Sdk"]
  .find((p) => p && fs.existsSync(path.join(p, "build-tools")));
const JDK = [process.env.JAVA_HOME, path.join(HOME, ".jdks", "jdk-17.0.21+9"), path.join(HOME, ".bubblewrap", "jdk")]
  .find((p) => p && fs.existsSync(path.join(p, "bin", "java.exe")));
if (!SDK) { console.error("Android SDK not found. Run: dir \"%LOCALAPPDATA%\\Android\\Sdk\" and tell Claude what it shows."); process.exit(1); }
if (!JDK) { console.error("Java (JDK 17) not found in %USERPROFILE%\\.jdks. Tell Claude."); process.exit(1); }
console.log("Android SDK:", SDK, "\nJava:", JDK);
const config = new Config(JDK, SDK);
const log = new ConsoleLog("pahad-plus");
const KEYSTORE = path.join(__dirname, "pahad-release.keystore");
for (const f of [KEYSTORE, path.join(__dirname, "keystore-password.txt")]) {
  if (!fs.existsSync(f)) { console.error(`Missing ${f}. Run this from the folder with the PAHAD key.`); process.exit(1); }
}
process.env.PAHAD_KS = fs.readFileSync(path.join(__dirname, "keystore-password.txt"), "utf8").trim();

(async () => {
  const dir = path.join(__dirname, "plus-app");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync("D:/apktmp", { recursive: true });

  const twa = await TwaManifest.fromWebManifest("https://pahad.org/plus.webmanifest");
  twa.packageId = "org.pahad.plus";
  twa.launcherName = "PAHAD+";
  twa.name = "PAHAD+: Events & Entertainment";
  twa.signingKey = { path: KEYSTORE, alias: "pahad" };
  twa.appVersionCode = VERSION_CODE;
  twa.appVersionName = VERSION_NAME;
  twa.fallbackType = "customtabs";
  twa.enableNotifications = true; // E-Pass approvals, alerts and replies use web push
  twa.orientation = "portrait";
  twa.generatorApp = "pahad-build";
  await twa.saveToFile(path.join(dir, "twa-manifest.json"));
  await new TwaGenerator().createTwaProject(dir, twa, log);

  const env = { ...process.env, JAVA_HOME: config.jdkPath, ANDROID_HOME: config.androidSdkPath, ANDROID_SDK_ROOT: config.androidSdkPath,
    JAVA_TOOL_OPTIONS: "-Djdk.net.unixdomain.tmpdir=D:/apktmp -Djava.io.tmpdir=D:/apktmp" };
  const run = (cmd, args, label) => {
    const r = spawnSync(cmd, args, { cwd: dir, env, stdio: "inherit", shell: true });
    if (r.status !== 0) throw new Error(`${label} failed (${r.status})`);
  };
  // Tell Gradle exactly where the SDK is (it doesn't always pick up ANDROID_HOME).
  fs.writeFileSync(path.join(dir, "local.properties"), `sdk.dir=${SDK.replace(/\\/g, "/")}\n`);
  const bg = path.join(dir, "app", "build.gradle");
  fs.writeFileSync(bg, fs.readFileSync(bg, "utf8").replace(/minSdkVersion \d+/, "minSdkVersion 24"));

  const java = path.join(config.jdkPath, "bin", "java.exe");
  const g = spawnSync(java, ["-cp", path.join(dir, "gradle", "wrapper", "gradle-wrapper.jar"), "org.gradle.wrapper.GradleWrapperMain", "assembleRelease", "bundleRelease", "--no-daemon", "-q"], { cwd: dir, env, stdio: "inherit" });
  if (g.status !== 0) throw new Error("gradle failed");

  // APK for testing: align, then sign.
  const btRoot = path.join(config.androidSdkPath, "build-tools");
  const btVer = fs.existsSync(path.join(btRoot, "35.0.0")) ? "35.0.0" : fs.readdirSync(btRoot).sort().pop();
  const bt = path.join(btRoot, btVer);
  const unsigned = path.join(dir, "app", "build", "outputs", "apk", "release", "app-release-unsigned.apk");
  const aligned = path.join(dir, "aligned.apk");
  run(`"${path.join(bt, "zipalign.exe")}"`, ["-f", "-p", "4", `"${unsigned}"`, `"${aligned}"`], "zipalign");
  run(`"${path.join(bt, "apksigner.bat")}"`, ["sign", "--ks", `"${KEYSTORE}"`, "--ks-key-alias", "pahad", "--ks-pass", "env:PAHAD_KS", "--key-pass", "env:PAHAD_KS", "--out", `"${path.join(OUT, "PAHAD-Plus.apk")}"`, `"${aligned}"`], "apksigner");

  // App bundle for Google Play: sign with the same key (it becomes the Play upload key).
  const aab = path.join(OUT, "PAHAD-Plus.aab");
  fs.copyFileSync(path.join(dir, "app", "build", "outputs", "bundle", "release", "app-release.aab"), aab);
  run(`"${path.join(config.jdkPath, "bin", "jarsigner.exe")}"`, ["-keystore", `"${KEYSTORE}"`, "-storepass:env", "PAHAD_KS", "-keypass:env", "PAHAD_KS", "-sigalg", "SHA256withRSA", "-digestalg", "SHA-256", `"${aab}"`, "pahad"], "jarsigner");

  console.log(`\nBUILT ${twa.launcherName} ${VERSION_NAME} (${VERSION_CODE}) from ${twa.startUrl}`);
  console.log(`  ${aab}   <- upload to Google Play`);
  console.log(`  ${path.join(OUT, "PAHAD-Plus.apk")}   <- install on a phone to test`);
})().catch((e) => { console.error("FAILED", e.message || e); process.exit(1); });
