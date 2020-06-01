import {
  BrowserWindow,
  app,
  App,
  Menu,
  screen,
  ipcMain,
  dialog,
  globalShortcut,
  Tray
} from "electron";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import tempfile from "tempfile";
import SendBlobEvent from "./utils/SendBlobEvent";
import {
  loadOrDefaultConfig,
  ApplicationConfig,
  createDefaultConfigJson,
  AVAILABLE_EXT
} from "./config";
import { exec } from "child_process";

class MyApp {
  private windowToDisplayIdMap: Map<number, number> = new Map();
  private windows: BrowserWindow[] | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  private config: ApplicationConfig;

  private isShowingDialog = false;

  private readonly defaultConfig: ApplicationConfig = {
    useFFmpeg: false,
    ffmpegPath: false,
    defaultFormat: "webm"
  };

  private tray: Tray | null = null;

  private isRecording = false;

  private isDebug = false;

  constructor(app: App) {
    this.app = app;
    this.app.on("ready", this.onReady);
    this.app.on("activate", this.onActivated);
    // 「何もしないハンドラ」を渡しておかないとデフォルトのハンドラが実行されてアプリが終了しちゃう
    this.app.on("window-all-closed", this.onWindowAllClosed);

    this.config = this.defaultConfig;
  }

  private onReady = () => {
    this.init();
  };

  private onActivated = () => {
    if (this.windows !== null) {
      this.createWindows();
    }
  };

  private onWindowAllClosed = () => {
    return;
  };

  private async init() {
    const gotTheLock = app.requestSingleInstanceLock();

    if (!gotTheLock) {
      this.applicationExit();
      return;
    }

    fs.exists("config.json", exists => {
      if (!exists) {
        createDefaultConfigJson("./config.json", this.defaultConfig);
      }
    });

    this.tray = new Tray(`${__dirname}/images/icon.ico`);

    this.tray.setToolTip("TAKE - take a screenshot.");

    const menu = Menu.buildFromTemplate([
      {
        icon: `${__dirname}/images/rec.png`,
        label: "Record",
        click: _ => {
          this.createWindows();
        }
      },
      {
        label: 'Open "config.json"',
        click: _ => {
          switch (process.platform) {
            case "win32":
              exec("start ./config.json");
              break;
            case "darwin":
              exec("open ./config.json");
              break;
            default:
              exec("vi ./config.json");
          }
        }
      },
      {
        label: "Close",
        click: _ => {
          this.applicationExit();
        }
      }
    ]);
    this.tray.setContextMenu(menu);

    ipcMain.on("send-blob", (e: Electron.Event, data: SendBlobEvent) => {
      this.isShowingDialog = true;
      const fixedWidth =
        data.width % 16 === 0
          ? data.width
          : data.width + (16 - (data.width % 16));
      const fixedHeight =
        data.height % 16 === 0
          ? data.height
          : data.height + (16 - (data.height % 16));

      const blob = Buffer.from(data.base64, "base64");
      if (this.windows && this.isDebug === false) {
        this.windows.forEach(window => {
          if (window && !window.isDestroyed()) {
            window.setAlwaysOnTop(true);
          }
        });
      }
      dialog.showSaveDialog(
        null as any,
        {
          title: "save",
          defaultPath: "."
        },
        (path?: string) => {
          if (path) {
            const getExtension = (path: string) => {
              const paths = path.split("/");
              const dotLastIndex = paths[paths.length - 1].lastIndexOf(".");

              // 拡張子がない場合はconfigで設定されているデフォルトの拡張子を返す
              if (dotLastIndex == 0) {
                return this.config.defaultFormat;
              }

              // 拡張子があるっぽい場合
              if (dotLastIndex >= 1) {
                const ext = path.slice(dotLastIndex + 1);

                // 動画っぽい拡張子かどうかを見る
                if (AVAILABLE_EXT.some(EXT => ext.toLowerCase() === EXT)) {
                  return ext;
                } else {
                  this.showCommonErrorBox("Invalid file name.");
                  this.applicationExit();
                }
              }

              return null;
            };

            if (!this.config.useFFmpeg) {
              fs.writeFile(path, blob, err => {
                if (err) {
                  this.showCommonErrorBox(err);
                }
                this.allWindowClose();
              });
            } else {
              const tmpfilename = tempfile(".mp4");
              fs.writeFile(tmpfilename, blob, async err => {
                if (err) {
                  this.showCommonErrorBox(err);
                  this.allWindowClose();
                }
                try {
                  const command = ffmpeg(tmpfilename);
                  const ext = getExtension(path);
                  // false とかがセットされてたら PATH が通っているものとして扱う的なことにしたい
                  if (this.config.ffmpegPath) {
                    command.setFfmpegPath(this.config.ffmpegPath);
                  }

                  // 条件が複雑だなぁ
                  // 拡張子がmp4であるか、デフォルトフォーマットがmp4ならTwitterで投稿が通る形式にする
                  if (
                    ext === "mp4" ||
                    (ext === null && this.config.defaultFormat === "mp4")
                  ) {
                    command
                      .size(`${fixedWidth}x${fixedHeight}`)
                      .videoCodec("libx264")
                      .addOption("-pix_fmt", "yuv420p");
                  }

                  command
                    .output(
                      ext !== null
                        ? path // 拡張子がある場合はそのまま渡す
                        : this.config.useFFmpeg // ffmpeg を使う設定なら入力に素直に従う
                        ? `${path}.${this.config.defaultFormat}` // 拡張子がない場合はデフォルトのフォーマットを使う
                        : `${path}.webm` // ffmpeg を使う設定でないなら.webm
                    )
                    .on("end", () => {
                      fs.unlink(tmpfilename, err => {
                        if (err) {
                          this.showCommonErrorBox(err);
                        }
                        this.allWindowClose();
                      });
                    })
                    .on("error", err => {
                      this.showCommonErrorBox(err);
                      this.allWindowClose();
                    })
                    .run();
                } catch (e) {
                  this.showCommonErrorBox(err);
                  this.allWindowClose();
                }
              });
            }
          } else {
            // キャンセル時の挙動
            this.allWindowClose();
          }
        }
      );
    });

    ipcMain.on("window-hide", (e: Electron.Event) => {
      if (this.windows && this.isDebug === false) {
        this.windows.forEach(window => {
          if (window) {
            window.setOpacity(0.0);
            window.setAlwaysOnTop(false);
            window.blur();
          }
        });
      }
    });

    ipcMain.on("start-recording", () => {
      this.isRecording = true;
    });

    globalShortcut.register("Super+Shift+A", () => {
      this.createWindows();
    });
  }

  private async createWindows() {
    if (this.windows != null) {
      return;
    }

    const [config, isCreatedConfigFile] = await loadOrDefaultConfig(
      "./config.json",
      this.defaultConfig
    );

    if (!this.configCheck(config)) {
      this.allWindowClose();
    }

    if (isCreatedConfigFile) {
      // TODO: 初回作成時はなんか言うといいかも
    }

    this.config = config;

    const windowCommonOptions = {
      title: "TAKE",
      acceptFirstMouse: true,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      transparent: true,
      opacity: this.isDebug ? 1.0 : 0.3,
      webPreferences: {
        nodeIntegration: true
      }
    };

    const displays = screen.getAllDisplays();

    const windows = displays.map(display => {
      const bw = new BrowserWindow({
        ...display.bounds,
        ...windowCommonOptions
      });
      // 各ウインドウから id を取得出来るように、 BrowserWindow と display の id を紐付ける
      this.windowToDisplayIdMap.set(bw.id, display.id);
      return bw;
    });

    windows.forEach(window => {
      if (window) {
        window.loadURL(
          `${this.mainURL}?id=${this.windowToDisplayIdMap.get(window.id)}`
        );
      }
    });

    if (this.isDebug) {
      windows.forEach(window => {
        if (window) {
          window.webContents.openDevTools();
        }
      });
    }

    windows.forEach(window => {
      if (window) {
        // 1個でもウインドウが手動で閉じられたらそのセッションは終了
        window.on("closed", () => {
          if (!this.isRecording) {
            this.allWindowClose();
          }
        });
      }
    });

    globalShortcut.register("Escape", () => {
      if (this.windows && !this.isShowingDialog) {
        this.windows.forEach(window => {
          if (window) {
            window.webContents.send("shortcut-key", { name: "RecordingStop" });
          }
        });
      }
    });

    this.windows = windows;
  }

  private applicationExit() {
    this.allWindowClose();
    this.app.quit();
  }

  private allWindowClose() {
    if (this.windows) {
      this.windows.forEach(window => {
        if (window && !window.isDestroyed()) {
          window.close();
        }
      });
      if (globalShortcut.isRegistered("Escape")) {
        globalShortcut.unregister("Escape");
      }
      this.windows = null;
      this.isShowingDialog = false;
    }
  }

  private showCommonErrorBox(error: any) {
    console.error(error);
    dialog.showErrorBox("error", error.message);
  }

  private configCheck(config: ApplicationConfig) {
    switch (config.defaultFormat) {
      case "mp4":
      case "webm":
      case "gif":
        return true;
      default:
        dialog.showErrorBox(
          "TAKE",
          `Unknown "defaultFormat": "${config.defaultFormat}"\nAvailable formats:\n"mp4"\n"gif"\n"webm"`
        );
        return false;
    }
  }
}

const myApp: MyApp = new MyApp(app);
