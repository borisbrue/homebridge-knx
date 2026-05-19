'use strict';

import * as path from 'path';
import * as fs from 'fs';
import { HandlerPattern } from '../addins/handlerpattern';
import * as KNXAccess from './knxaccess';
import { User } from './user';
import type { ServiceKNX } from './service-knx';

export interface CharacteristicRef {
  name: string;
  pseudo?: boolean;
  setGroupAddressList: Array<{ address: string; reversed?: boolean; dptype: string | { type: string } }>;
  listenGroupAddressList: Array<{ address: string; reversed?: boolean; dptype?: string }>;
  getHomekitCharacteristic(): import('homebridge').Characteristic;
  getDPT(): string | undefined;
}

export class CustomServiceAPI {
  handler: HandlerPattern;
  serviceKNX: ServiceKNX;
  handlerName: string;
  characteristicsList: Record<string, CharacteristicRef | { name: string; pseudo: true; setGroupAddressList: Array<{ address: string; reversed: boolean; dptype: string }>; listenGroupAddressList: Array<{ address: string; reversed?: boolean; dptype?: string }> }> = {};
  charValueList: Record<string, unknown> = {};

  constructor(serviceKNX: ServiceKNX, handlerName: string) {
    serviceKNX.globs.info(`customServiceAPI.constructor(service, ${handlerName})`);

    // Check compiled TS addins first, then fall back to original JS addins
    const localHandlerPath = path.join(__dirname, `../addins/${handlerName}.js`);
    const legacyHandlerPath = path.join(__dirname, `../../lib/addins/${handlerName}.js`);
    const remoteHandlerPath = path.join(User.addinsPath(), `${handlerName}.js`);

    let Handler: (new (api: CustomServiceAPI) => HandlerPattern) | false = false;
    if (fs.existsSync(localHandlerPath)) {
      Handler = require(localHandlerPath) as new (api: CustomServiceAPI) => HandlerPattern;
    } else if (fs.existsSync(legacyHandlerPath)) {
      Handler = require(legacyHandlerPath) as new (api: CustomServiceAPI) => HandlerPattern;
    } else if (fs.existsSync(remoteHandlerPath)) {
      process.env['handlerPattern'] = path.join(__dirname, '../addins/handlerpattern.js');
      Handler = require(remoteHandlerPath) as new (api: CustomServiceAPI) => HandlerPattern;
    } else {
      throw new Error(`HANDLER CONFIGURATION ERROR: ${handlerName} could not be found.`);
    }

    this.handler = new Handler(this);
    if (!(this.handler instanceof HandlerPattern)) {
      throw new Error(`HANDLER CONFIGURATION ERROR: ${handlerName} is not an instance of HandlerPattern.`);
    }

    this.serviceKNX = serviceKNX;
    this.handlerName = handlerName;
  }

  addCharacteristic(characteristicKNX: CharacteristicRef): void {
    this.serviceKNX.globs.info(`${this.handlerName}: Adding Characteristic ${characteristicKNX.name}`);
    this.characteristicsList[characteristicKNX.name] = characteristicKNX;
    this.charValueList[characteristicKNX.name] = null;
  }

  addPseudoCharacteristic(name: string, setGroupAddresses: string | string[] | undefined, listenGroupAddresses: string | string[] | undefined, dptype: string): void {
    this.serviceKNX.globs.info(`${this.handlerName}: Adding PseudoCharacteristic ${name}`);
    if (this.characteristicsList[name]) {
      throw new Error(`CONFIGURATION ERROR: Duplicate Type "${name}" in service ${this.serviceKNX.name} in knx_config.json`);
    }
    const pseudo = {
      name,
      pseudo: true as const,
      setGroupAddressList: [] as Array<{ address: string; reversed: boolean; dptype: string }>,
      listenGroupAddressList: [] as Array<{ address: string; reversed: boolean; dptype?: string }>,
    };
    this.characteristicsList[name] = pseudo;
    this.charValueList[name] = null;

    if (setGroupAddresses) {
      const list = ([] as string[]).concat(setGroupAddresses);
      for (const ga of list) {
        pseudo.setGroupAddressList.push({ address: ga, reversed: false, dptype });
      }
    }
    if (listenGroupAddresses) {
      const list = ([] as string[]).concat(listenGroupAddresses);
      for (const ga of list) {
        pseudo.listenGroupAddressList.push({ address: ga, reversed: false, dptype });
        this.serviceKNX.globs.knxmonitor.registerGA(ga, dptype, (val, src, dest) => {
          this.knxbusEventCatcher(name, val, src, dest);
        });
      }
    }
  }

  setValue(field: string, value: unknown): void {
    this.serviceKNX.globs.info(`${this.handlerName}->customServiceAPI.setValue(${field},${String(value)})`);
    const chrKNX = this.characteristicsList[field];
    if (!chrKNX) throw new Error(`HANDLER CONFIGURATION ERROR: Field ${field} does not exist`);
    if (!chrKNX.pseudo) {
      KNXAccess.writeValueHK(value, chrKNX as CharacteristicRef, undefined, false);
      this.charValueList[chrKNX.name] = value;
    } else {
      throw new Error(`HANDLER CONFIGURATION ERROR: Field ${field} is not a HomeKit object.`);
    }
  }

  getValue(field: string): unknown {
    this.serviceKNX.globs.info(`${this.handlerName}->customServiceAPI.getValue(${field})`);
    const chrKNX = this.characteristicsList[field];
    if (!chrKNX) throw new Error(`HANDLER CONFIGURATION ERROR: Field ${field} does not exist`);
    if (!chrKNX.pseudo) {
      this.serviceKNX.globs.info('Returning HomeKitValue');
      const v = (chrKNX as CharacteristicRef).getHomekitCharacteristic().value;
      this.serviceKNX.globs.info(`Returning HomeKitValue of ${String(v)}`);
      return v;
    }
    this.serviceKNX.globs.info(`Returning Pseudo characteristic value of ${String(this.charValueList[field])}`);
    return this.charValueList[field];
  }

  knxWrite(field: string, value: unknown, dptype?: string): void {
    this.serviceKNX.globs.info(`${this.handlerName}->customServiceAPI.knxWrite(${field},${String(value)},${String(dptype)})`);
    const chrKNX = this.characteristicsList[field] as CharacteristicRef;
    if (!chrKNX) throw new Error(`HANDLER CONFIGURATION ERROR: Field ${field} does not exist`);
    const dpt = dptype ?? chrKNX.getDPT() ?? 'DPT1';
    for (const gaddress of chrKNX.setGroupAddressList) {
      KNXAccess.writeValueKNX(Number(value), { ...gaddress, dptype: dpt }, undefined);
    }
  }

  knxReadRequest(field: string): void {
    this.serviceKNX.globs.info(`${this.handlerName}->customServiceAPI.knxReadRequest(${field})`);
    const chrKNX = this.characteristicsList[field] as CharacteristicRef;
    if (!chrKNX) throw new Error(`HANDLER CONFIGURATION ERROR: Field ${field} does not exist`);
    for (const gaddress of chrKNX.listenGroupAddressList) {
      KNXAccess.knxread(gaddress.address);
    }
  }

  getGlobalValue(device: string, service: string, field: string): unknown {
    const myDevice = this.serviceKNX.globs.devices.find(d => d.name === device);
    if (!myDevice) throw new Error(`ERROR in custom handler: Device ${device} not found.`);
    const myService = myDevice.services.find(s => s.name === service);
    if (!myService) throw new Error(`ERROR in custom handler: Service ${service} not found in Device ${device}.`);
    if (myService.handler === 'Default') {
      const chr = myService.myCharacteristics.find(c => c.name === field);
      return chr ? chr.getHomekitCharacteristic().value : undefined;
    }
    return myService.customServiceAPI?.getValue(field);
  }

  getLocalConstant(field: string): unknown {
    const lc = this.serviceKNX.config.LocalConstants as Record<string, unknown> | undefined;
    return lc ? lc[field] : undefined;
  }

  getProperty(field: string, property: string): unknown {
    this.serviceKNX.globs.info(`${this.handlerName}->customServiceAPI.getProperty(${field}, ${property})`);
    const chrKNX = this.characteristicsList[field] as CharacteristicRef | undefined;
    if (!chrKNX) throw new Error(`HANDLER CONFIGURATION ERROR: Field ${field} does not exist`);
    if (!chrKNX.pseudo) {
      const p = chrKNX.getHomekitCharacteristic().props as unknown as Record<string, unknown>;
      return Object.prototype.hasOwnProperty.call(p, property) ? p[property] : undefined;
    }
    return undefined;
  }

  homekitEventCatcher(characteristicName: string, value: unknown, callback: (() => void) | undefined, context: string): void {
    if (context === 'fromKNXBus') {
      if (callback) callback();
    } else {
      if (typeof this.handler.onHKValueChange === 'function') {
        if (callback) callback();
        this.handler.onHKValueChange(characteristicName, this.charValueList[characteristicName], value);
        this.charValueList[characteristicName] = value;
      } else if (callback) {
        callback();
      }
    }
  }

  knxbusEventCatcher(characteristicName: string, val: unknown, src: string, dest: string): void {
    const chrKNX = this.characteristicsList[characteristicName] as CharacteristicRef | undefined;
    if (chrKNX && !chrKNX.pseudo && this.serviceKNX.globs.knxconnection !== 'knxjs' && chrKNX.getDPT() === 'DPT5.001') {
      val = Number(val) * 100 / 255;
    }
    const oldValue = this.charValueList[characteristicName];
    this.handler.onKNXValueChange(characteristicName, oldValue, val);
    if (this.characteristicsList[characteristicName]?.pseudo) {
      this.charValueList[characteristicName] = val;
    }
  }
}
