import fs from "fs";

export type ApplicationConfig = {
  useFFmpeg?: boolean;
  ffmpegPath?: string | false;
  defaultFormat: string;
};

export async function loadOrDefaultConfig(
  path: string,
  defaultConfig: ApplicationConfig
) {
  return new Promise<[ApplicationConfig, boolean]>((res, rej) => {
    fs.readFile(path, (err, data) => {
      if (err) {
        createDefaultConfigJson(path, defaultConfig)
          .then((data: ApplicationConfig) => {
            res([data, true]);
            return;
          })
          .catch(err => {
            rej(err);
            return;
          });

        return;
      } else {
        try {
          const config: ApplicationConfig = JSON.parse(data.toString());
          res([config, false]);
        } catch (e) {
          rej(e);
        }
      }
    });
  });
}

export async function createDefaultConfigJson(
  path: string,
  defaultConfig: ApplicationConfig
) {
  return new Promise<ApplicationConfig>((res, rej) => {
    fs.writeFile(path, JSON.stringify(defaultConfig, null, "  "), err => {
      if (err) {
        rej(err.message);
        return;
      }
      res(defaultConfig);
    });
  });
}
