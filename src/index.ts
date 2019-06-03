import { BrowserWindow, app, App, Menu, screen } from "electron";

class MyApp {
  private mainWindows: Array<BrowserWindow | null> = [];
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  constructor(app: App) {
    this.app = app;
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.app.on("ready", this.create.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
  }

  private onWindowAllClosed() {
    this.app.quit();
  }

  private create() {
    const displays = screen.getAllDisplays();
    this.mainWindows = displays.map(
      disp =>
        new BrowserWindow({
          title: "cap-taro",
          x: disp.bounds.x,
          y: disp.bounds.y,
          width: disp.bounds.width,
          height: disp.bounds.height,
          acceptFirstMouse: true,
          frame: false,
          alwaysOnTop: true,
          resizable: false,
          movable: false,
          skipTaskbar: true
          // opacity: 0.5
          // titleBarStyle: "hiddenInset"
        })
    );

    this.mainWindows.forEach(win =>
      win ? win.loadURL(this.mainURL) && win.webContents.openDevTools() : false
    );

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);
    this.mainWindows.forEach((win, index) => {
      if (win) {
        win.on("closed", () => {
          this.mainWindows[index] = null;
        });
      }
    });
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.mainWindows.every(win => win === null)) {
      this.create();
    }
  }
}

const myApp: MyApp = new MyApp(app);
