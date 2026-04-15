const path = require("path");
const { app, BrowserWindow, Menu } = require("electron");
const dockIconPath = path.join(__dirname, "..", "icon", "ios_icon.png");

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    backgroundColor: "#000000",
    autoHideMenuBar: true,
    title: "Pac-Man",
    icon: dockIconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, "..", "index.html"));
}

app.whenReady().then(() => {
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(dockIconPath);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
