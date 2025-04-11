import c, { app as o, BrowserWindow as p, dialog as u, nativeImage as h, Tray as f, Menu as m } from "electron";
import t from "node:path";
import { fileURLToPath as w } from "node:url";
if (typeof c == "string")
  throw new TypeError("Not running in an Electron environment!");
const { env: d } = process, g = "ELECTRON_IS_DEV" in d, b = Number.parseInt(d.ELECTRON_IS_DEV, 10) === 1, y = g ? b : !c.app.isPackaged, i = t.dirname(w(import.meta.url));
let e, a, r = !1;
function l() {
  e = new p({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !1
    },
    autoHideMenuBar: !0,
    backgroundColor: "#0f172a",
    // Matches the slate-900 background
    icon: t.join(i, "../public/appicon.ico"),
    title: "Heart App"
  }), y ? (e.loadURL("http://localhost:5173"), e.webContents.openDevTools()) : e.loadFile(t.join(i, "../dist/index.html")), e.on("close", async (n) => {
    r || (n.preventDefault(), (await u.showMessageBox(e, {
      type: "question",
      buttons: ["Minimize to Tray", "Exit"],
      title: "Heart App",
      message: "What would you like to do?",
      detail: "You can keep receiving notifications by minimizing to the system tray, or exit the application completely.",
      icon: t.join(i, "../public/appicon.ico"),
      defaultId: 0,
      cancelId: 0,
      noLink: !0,
      backgroundColor: "#0f172a",
      customStylesheet: `
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #f1f5f9;
          }
          .dialog-button {
            background: linear-gradient(to right, #ec4899, #ef4444);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
          }
          .dialog-button:hover {
            opacity: 0.9;
          }
        `
    })).response === 1 ? (r = !0, o.quit()) : (n.preventDefault(), e.hide(), new Notification({
      title: "Heart App",
      body: "Running in the background. Click the heart icon to restore.",
      icon: t.join(i, "../public/appicon.ico")
    }).show()));
  });
}
function k() {
  const n = h.createFromPath(t.join(i, "../public/appicon.ico"));
  a = new f(n.resize({ width: 16, height: 16 }));
  const s = m.buildFromTemplate([
    {
      label: "Heart App",
      enabled: !1,
      icon: n.resize({ width: 16, height: 16 })
    },
    { type: "separator" },
    {
      label: "Show App",
      click: () => {
        e.show(), e.focus();
      }
    },
    { type: "separator" },
    {
      label: "Exit",
      click: async () => {
        (await u.showMessageBox(e, {
          type: "question",
          buttons: ["Cancel", "Exit"],
          title: "Confirm Exit",
          message: "Are you sure you want to exit?",
          detail: "This will close the application completely.",
          icon: t.join(i, "../public/appicon.ico"),
          defaultId: 0,
          cancelId: 0,
          noLink: !0
        })).response === 1 && (r = !0, o.quit());
      }
    }
  ]);
  a.setToolTip("Heart App - Click to show"), a.setContextMenu(s), a.on("double-click", () => {
    e.show(), e.focus();
  });
}
process.platform === "win32" && o.setAppUserModelId("Heart App");
o.whenReady().then(() => {
  l(), k(), o.on("activate", () => {
    p.getAllWindows().length === 0 && l();
  });
});
o.on("window-all-closed", () => {
  process.platform !== "darwin" && o.quit();
});
o.on("before-quit", () => {
  r = !0;
});
