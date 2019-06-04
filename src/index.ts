import { BrowserWindow, app, App, Menu, screen } from "electron";

class MyApp {
  private mainWindow: BrowserWindow | null = null;
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
    this.mainWindow = new BrowserWindow({
      title: "cap-taro",
      x: 0,
      y: 0,
      width: screen.getPrimaryDisplay().size.width,
      height: screen.getPrimaryDisplay().size.height,
      acceptFirstMouse: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      opacity: 1,
      webPreferences: {
        nodeIntegration: true
      }
      // titleBarStyle: "hiddenInset"
    });

    this.mainWindow.loadURL(this.mainURL);

    this.mainWindow.webContents.openDevTools();

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.mainWindow !== null) {
      this.create();
    }
  }
}

const myApp: MyApp = new MyApp(app);
