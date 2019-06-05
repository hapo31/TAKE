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
import SendBlobEvent from "./utils/SendBlobEvent";

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

    ipcMain.on("send-blob", (e: Electron.Event, data: SendBlobEvent) => {
      const fixedWidth =
        data.width % 16 === 0
          ? data.width
          : data.width + (16 - (data.width % 16));
      const fixedHeight =
        data.height % 16 === 0
          ? data.height
          : data.height + (16 - (data.height % 16));

      const blob = Buffer.from(data.base64, "base64");
      const outputFileType = "mp4";
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
            //   try {
            //     ffmpeg(tmpfilename)
            //       .addOption("-pix_fmt", "yuv420p")
            //       .size(`${fixedWidth}x${fixedHeight}`)
            //       .videoCodec("libx264")
            //       .output(path)
            //       .on("end", () => {
            //         fs.unlink(tmpfilename, err => {
            //           this.safeCloseMainWindow();
            //           if (err) {
            //             console.error(err);
            //             dialog.showErrorBox("error", err.message);
            //             this.safeCloseMainWindow();
            //           }
            //         });
            //       })
            //       .on("error", err => {
            //         console.error(err);
            //         dialog.showErrorBox("error", err.message);
            //         this.safeCloseMainWindow();
            //       })
            //       .run();
            //   } catch (e) {
            //     console.error(e);
            //     this.safeCloseMainWindow();
            //   }
            // });
          } else {
            // キャンセル時の挙動
            this.safeCloseMainWindow();
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

  private safeCloseMainWindow() {
    if (this.mainWindow) {
      this.mainWindow.close();
    }
  }
}

const myApp: MyApp = new MyApp(app);
