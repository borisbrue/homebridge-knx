'use strict';

import type { API, Logger, PlatformAccessory } from 'homebridge';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { KNXDevice } from './lib/knxdevice';
import { User } from './lib/user';
import { knxmonitor } from './lib/knxmonitor';
import * as KNXAccess from './lib/knxaccess';
import { getServiceData } from './lib/servicedata';
import { registerKnxThermostat } from './lib/customtypes/knxthermostat';
import type { PluginContext } from './types/plugin-context';

(global as typeof globalThis & Record<string, unknown>)['knxRequire'] = (name: string) => require(name);

const globs = {} as unknown as PluginContext;

class KNXPlatform {
  log: Logger;
  config: PluginContext['config'];
  requestServer?: http.Server;
  startUpDateAndTimeString?: string;
  blacklistedCharProps: Record<string, boolean> = {
    _events: true, _eventsCount: true, _maxListeners: true,
    iid: true, value: true, status: true, subscriptions: true,
  };

  constructor(log: Logger, _config: unknown, newAPI: API) {
    this.log = log;
    globs.newAPI = newAPI;
    globs.API = newAPI;

    globs.info = (comment: string) => log.info(comment);
    globs.debug = (comment: string) => log.debug(comment);
    globs.errorlog = (comment: string) => log.error(comment);
    globs.log = log;

    globs.debug('Trying to load user settings');
    User.setStoragePath(newAPI.user.storagePath());
    globs.debug(User.configPath());
    this.config = User.loadConfig();
    globs.config = this.config;
    globs.restoredAccessories = [];

    globs.knxconnection = this.config.knxconnection;
    globs.knxd_ip = this.config.knxd_ip ?? '';
    globs.knxd_port = this.config.knxd_port ?? 6720;
    globs.knxmonitor = knxmonitor;
    globs.readRequests = {};

    KNXAccess.setGlobs(globs as PluginContext);
    knxmonitor.setGlobs(globs as PluginContext);
    knxmonitor.startMonitor({ host: globs.knxd_ip as string, port: globs.knxd_port as number });

    if (newAPI) {
      newAPI.on('didFinishLaunching', () => {
        (globs.info as (s: string) => void)('homebridge event didFinishLaunching');
        this.configure();
      });
    }
  }

  configureAccessory(accessory: PlatformAccessory): void {
    console.log(`Plugin - Configure Accessory: ${accessory.displayName} --> Added to restoredAccessories[]`);
    (globs.restoredAccessories as PlatformAccessory[]).push(accessory);
  }

  configure(): void {
    (globs.info as (s: string) => void)('Configuration starts');
    User.LogHomebridgeKNXSTarts();

    (globs.debug as (s: string) => void)(`We think homebridge has restored ${(globs.restoredAccessories as PlatformAccessory[]).length} accessories.`);

    if (!this.config.GroupAddresses) this.config.GroupAddresses = {};

    const foundAccessories = this.config.Devices ?? [];
    globs.devices = [];

    for (const currAcc of foundAccessories) {
      (globs.info as (s: string) => void)(`Reading from config: Device/Accessory ${currAcc.DeviceName}`);
      (globs.debug as (s: string) => void)(`Match device [${currAcc.DeviceName}]`);

      const matchAcc = getAccessoryByUUID(globs.restoredAccessories as PlatformAccessory[], currAcc.UUID);
      if (matchAcc) {
        (globs.debug as (s: string) => void)(`Matched an accessory: ${currAcc.DeviceName} === ${matchAcc.displayName}`);
        (matchAcc as unknown as Record<string, unknown>)['active'] = true;
        (globs.devices as KNXDevice[]).push(new KNXDevice(globs as PluginContext, currAcc, matchAcc));
      } else {
        (globs.debug as (s: string) => void)(`New accessory found: ${currAcc.DeviceName}`);
        (globs.devices as KNXDevice[]).push(new KNXDevice(globs as PluginContext, currAcc));
      }
      (globs.info as (s: string) => void)(`Done with [${currAcc.DeviceName}] accessory`);
    }

    (globs.info as (s: string) => void)(`We have read ${(globs.devices as KNXDevice[]).length} devices from file.`);
    (globs.info as (s: string) => void)('Saving config file!');
    User.storeConfig();

    for (const device of globs.devices as KNXDevice[]) {
      for (const svc of device.services) {
        if (svc.customServiceAPI?.handler && typeof svc.customServiceAPI.handler.onHomeKitReady === 'function') {
          (globs.debug as (s: string) => void)(`${device.name}/${svc.name}: Custom Handler onHomeKitReady()`);
          svc.customServiceAPI.handler.onHomeKitReady();
        }
      }
    }

    this.startUpDateAndTimeString = new Date().toString();
    this.requestServer = http.createServer((request, response) => {
      (globs.debug as (s: string) => void)(`http.createServer CALLBACK FUNCTION URL=${request.url}`);
      const reqparsed = (request.url ?? '').substring(1).split('?');
      const params: Record<string, string> = {};
      if (reqparsed[1]) {
        for (const part of reqparsed[1].split('&')) {
          const b = part.split('=');
          params[decodeURIComponent(b[0])] = decodeURIComponent(b[1] ?? '');
        }
      }
      const route = reqparsed[0];
      const webdata = globs.webdata as Record<string, unknown>;

      if (request.url === '/list') {
        response.write('<HEAD><meta http-equiv="content-type" content="text/html; charset=utf-8"><TITLE>Homebridge-KNX</TITLE></HEAD><BODY>');
        response.write(`<h1>homebridge-knx</h1>homebridge-knx started at ${this.startUpDateAndTimeString ?? ''}<hr>`);
        response.write('<h2>Restored devices from homebridge cache:</h2><table><tr><th>Device</th><th>Actions</th></tr>');
        for (const acc of globs.restoredAccessories as PlatformAccessory[]) {
          const accRec = acc as unknown as Record<string, unknown>;
          if (acc.UUID !== 'ERASED') {
            response.write(`<tr><td> ${acc.displayName}</td><td><a href="/delete?UUID=${acc.UUID}">[Delete from cache!]</a>${!accRec['active'] ? ' (orphaned) ' : ''}</td></tr>`);
          }
        }
        response.write('</table><H2><BR>Devices from homebridge-knx config:</h2><table><tr><th>Device</th><th>Actions</th></tr>');
        for (const device of globs.devices as KNXDevice[]) {
          const acc = device.getPlatformAccessory();
          if (acc.UUID !== 'ERASED') {
            response.write(`<tr><td> ${acc.displayName}</td><td><a href="/delete?UUID=${acc.UUID}">[Delete from cache!]</a></td></tr>`);
          }
        }
        response.write('</table>');
        if (this.config.AllowKillHomebridge === true) {
          response.write(' <br><h2>Debug Activities</h2><br><a href="/kill">Kill homebridge</a>');
        }
        response.end('</BODY>');

      } else if (route === 'delete' && params['UUID']) {
        (globs.debug as (s: string) => void)(`delete accessory with UUID ${params['UUID']}`);
        try {
          let delAcc = getAccessoryByUUID(globs.restoredAccessories as PlatformAccessory[], params['UUID']);
          if (!delAcc) {
            delAcc = (globs.devices as KNXDevice[]).find(d => d.getPlatformAccessory().UUID === params['UUID'])?.getPlatformAccessory();
          }
          if (delAcc) {
            (globs.newAPI as API).unregisterPlatformAccessories('homebridge-knx', 'KNX', [delAcc]);
            (delAcc as unknown as Record<string, unknown>)['UUID'] = 'ERASED';
          }
        } catch (err) {
          (globs.errorlog as (s: string) => void)(`ERR Could not delete accessory with UUID ${params['UUID']}`);
        } finally {
          response.end('<HEAD><meta http-equiv="refresh" content="0; url=/list" /></HEAD><BODY>done. Go back in browser and refresh</BODY>');
        }

      } else if (route === 'kill' && this.config.AllowKillHomebridge === true) {
        response.end('<HEAD><meta http-equiv="refresh" content="20; url=/list" /></HEAD><BODY>Committed suicide. Reloading in 20 seconds.</BODY>');
        setTimeout(() => { throw new Error('Commited_Suicide'); }, 500);

      } else {
        response.write('<HEAD><TITLE>Homebridge-KNX</TITLE></HEAD><BODY>');
        response.write(`<BR>Available pages: <a href="/list">list devices</a> | <a href="/availservices">available services</a> | <a href="/availcharacteristics">available characteristics</a>`);
        response.end(`<br>${request.url ?? ''}</BODY>`);
      }
    });

    (globs.debug as (s: string) => void)('BEFORE requestServer.listen');
    const cfgExt = this.config as unknown as Record<string, unknown>;
    if (cfgExt['AllowWebserver']) {
      const port = (cfgExt['WebserverPort'] as number) ?? 18081;
      this.requestServer.listen(port, () => {
        console.log(`Server Listening...localhost:${port}/list`);
      });
    }

    KNXAccess.knxreadhash(globs.readRequests as Record<string, unknown>);
  }
}

function getAccessoryByUUID(accessories: PlatformAccessory[], uuid: string | undefined): PlatformAccessory | undefined {
  if (!uuid) return undefined;
  for (const acc of accessories) {
    if (acc.UUID === uuid) return acc;
  }
  return undefined;
}

export default function registry(homebridgeAPI: API): void {
  console.log(`homebridge API version: ${homebridgeAPI.version}`);

  const checkfilepath = path.join(homebridgeAPI.user.storagePath(), 'knx-ignore.txt');
  if (fs.existsSync(checkfilepath)) {
    console.log(`[WARNING] Found blocking file, exiting now. To load homebridge-knx, remove ${checkfilepath}`);
    return;
  }

  globs.Service = homebridgeAPI.hap.Service;
  globs.Characteristic = homebridgeAPI.hap.Characteristic;
  globs.API = homebridgeAPI;

  registerKnxThermostat(homebridgeAPI);
  globs.webdata = getServiceData(globs as PluginContext);

  homebridgeAPI.registerPlatform('homebridge-knx', 'KNX', KNXPlatform as unknown as Parameters<API['registerPlatform']>[2]);
}
