import {
  BrowserWindow,
  app,
  App,
  Menu,
  screen,
  ipcMain,
  dialog
} from "electron";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import tempfile from "tempfile";

class MyApp {
  private mainWindow: BrowserWindow | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  private isDebug = false;

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
      opacity: this.isDebug ? 1.0 : 0.3,
      webPreferences: {
        nodeIntegration: true
      }
      // titleBarStyle: "hiddenInset"
    });

    this.mainWindow.loadURL(this.mainURL);

    if (this.isDebug) {
      this.mainWindow.webContents.openDevTools();
    }

    const menu = Menu.buildFromTemplate([]);
    Menu.setApplicationMenu(menu);
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });

    ipcMain.on("send-blob", (e: Electron.Event, base64: string) => {
      const blob = Buffer.from(base64, "base64");
      const outputFileType = "gif";
      if (this.mainWindow && this.isDebug === false) {
        this.mainWindow.setAlwaysOnTop(true);
      }
      dialog.showSaveDialog(
        this.mainWindow!,
        {
          title: "save",
          defaultPath: ".",
          filters: [
            {
              name: outputFileType,
              extensions: [outputFileType]
            }
          ]
        },
        (path?: string) => {
          if (path) {
            fs.writeFile(path, blob, err => {
              if (err) {
                dialog.showErrorBox("error", err.message);
              }
              if (this.mainWindow) {
                this.mainWindow.close();
              }
            });

            // const tmpfilename = tempfile(".gif");
            // fs.writeFile(tmpfilename, blob, async err => {
            //   if (err) {
            //     dialog.showErrorBox("error", err.message);
            //   }
            //   console.log(tmpfilename);
            //   try {
            //     ffmpeg(tmpfilename)
            //       .noAudio()
            //       .outputFormat("libx264")
            //       .format("mp4")
            //       .output(path)
            //       .on("end", () => {
            //         if (this.mainWindow) {
            //           this.mainWindow.close();
            //         }
            //       })
            //       .on("error", err => {
            //         console.error(err);
            //         dialog.showErrorBox("error", err.message);
            //       });
            //   } catch (e) {
            //     console.error(e);
            //   }
            // });
          }
        }
      );
    });

    ipcMain.on("window-minimize", () => {
      if (this.mainWindow && this.isDebug === false) {
        this.mainWindow.setOpacity(0.0);
        this.mainWindow.setAlwaysOnTop(false);
        this.mainWindow.blur();
      }
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
