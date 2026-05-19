'use strict';

import * as path from 'path';
import * as fs from 'fs';
import type { KnxConfig } from '../types/plugin-context';

let config: KnxConfig | undefined;
let customStoragePath: string | undefined;

export const User = {
  config(): KnxConfig {
    return config ?? (config = User.loadConfig());
  },

  storagePath(): string {
    if (customStoragePath) return customStoragePath;
    const home = process.env.HOME ?? process.env.HOMEPATH ?? process.env.USERPROFILE ?? '';
    return path.join(home, '.homebridge');
  },

  configPath(): string {
    return path.join(User.storagePath(), 'knx_config.json');
  },

  persistPath(): string {
    return path.join(User.storagePath(), 'knx_persist');
  },

  addinsPath(): string {
    return path.join(User.storagePath(), 'knx_addins');
  },

  setStoragePath(p: string): void {
    customStoragePath = p;
  },

  loadConfig(): KnxConfig {
    const configPath = User.configPath();
    if (!fs.existsSync(configPath)) {
      console.log(`Couldn't find file at '${configPath}.`);
      process.exit(1);
    }
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as KnxConfig;
    } catch (err) {
      console.log(`There was a problem reading your ${configPath} file.`);
      console.log('Please try pasting your file here to validate it: http://jsonlint.com');
      throw err;
    }
    console.log('---');
    return config!;
  },

  storeConfig(): void {
    const configPath = User.configPath();
    if (!fs.existsSync(configPath)) {
      console.log(`Couldn't find file at '${configPath}.`);
      process.exit(1);
    }
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    } catch (err) {
      console.log(`ERROR: There was a problem writing your ${configPath} file.`);
      throw err;
    }
    console.log('---');
  },

  LogHomebridgeKNXSTarts(): void {
    const startLogPath = path.join(User.storagePath(), 'homebridge-knx.startlog');
    let startLog: { starts?: string[] } = {};
    if (fs.existsSync(startLogPath)) {
      try {
        startLog = JSON.parse(fs.readFileSync(startLogPath, 'utf-8')) as { starts?: string[] };
        startLog.starts?.push(new Date().toJSON());
      } catch (e) {
        console.error(`Cannot load startlog at ${startLogPath} or format error: ${String(e)}`);
      }
    } else {
      startLog.starts = [new Date().toJSON()];
    }
    try {
      fs.writeFileSync(startLogPath, JSON.stringify(startLog, null, 4));
    } catch (e) {
      console.error(`Cannot write startlog at ${startLogPath}. Error: ${String(e)}`);
    }
  },
};
