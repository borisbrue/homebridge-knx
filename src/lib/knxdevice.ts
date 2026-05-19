'use strict';

import { ServiceKNX } from './service-knx';
import { iterate } from './iterate';
import type { PluginContext, DeviceConfig } from '../types/plugin-context';
import type { PlatformAccessory } from 'homebridge';

export class KNXDevice {
  globs: PluginContext;
  config: DeviceConfig;
  name: string = '';
  services: ServiceKNX[] = [];
  private platformAccessory!: PlatformAccessory;

  constructor(globs: PluginContext, config: DeviceConfig, existingAccessory?: PlatformAccessory) {
    this.globs = globs;
    this.config = config;

    if (config.DeviceName) this.name = config.DeviceName;

    if (!config.UUID) {
      const uuidBase = 'KNX-' + Math.random() + Math.random() + Math.random() + '_device';
      config.UUID = globs.API.hap.uuid.generate(uuidBase);
    }

    if (existingAccessory) {
      this.platformAccessory = existingAccessory;
      (this.platformAccessory as unknown as Record<string, unknown>)['existing'] = true;
      globs.debug(`Reused platformAccessory instance: ${this.platformAccessory.displayName}`);
    } else {
      const category = config.HKCategory
        ? (globs.API.hap as unknown as { Categories: Record<string, number> }).Categories[config.HKCategory]
        : undefined;
      this.platformAccessory = new globs.API.platformAccessory(this.name, config.UUID, category);
      (this.platformAccessory as unknown as Record<string, unknown>)['existing'] = false;
      globs.debug(`Created new platformAccessory instance: ${this.platformAccessory.displayName}`);
    }

    const infoService = this.platformAccessory.getService(globs.Service.AccessoryInformation);
    if (infoService) {
      infoService
        .setCharacteristic(globs.Characteristic.Manufacturer, config.Manufacturer ?? 'Opensource Community')
        .setCharacteristic(globs.Characteristic.Model, config.Model ?? 'KNX Universal Device by borisbrue')
        .setCharacteristic(globs.Characteristic.SerialNumber, config.SerialNumber ?? `Build-${new Date().toLocaleString()}`);
    }

    this.platformAccessory.on('identify', () => {
      globs.info(`${this.platformAccessory.displayName} Identify!!!`);
    });

    if (!config.Services) {
      globs.log.warn("No 'Services' found in device?!");
    }

    const currServices = config.Services ?? [];
    globs.debug(`Preparing Services: ${currServices.length}`);

    for (const configService of currServices) {
      if (!configService.ServiceType && !configService.ServiceName) {
        globs.errorlog("[ERROR] must specify 'ServiceType' and 'ServiceName' for each service in knx_config.json.");
        throw new Error("Must specify 'ServiceType' and 'ServiceName' for each service in knx_config.json.");
      }
      globs.debug(`Preparing Service: ${configService.ServiceName} of type ${configService.ServiceType}`);
      try {
        const svc = new ServiceKNX(this, configService, globs);
        if (!svc.failed) {
          this.services.push(svc);
          globs.debug('KNX Service created');
          if (svc.customServiceAPI?.handler && typeof svc.customServiceAPI.handler.onServiceInit === 'function') {
            globs.debug('Custom Handler onServiceInit()');
            svc.customServiceAPI.handler.onServiceInit();
          }
        } else {
          globs.errorlog(`homebridge-knx couldn't create KNX service: ${configService.ServiceName}`);
        }
      } catch (e) {
        globs.errorlog(`homebridge-knx couldn't create KNX service: ${configService.ServiceName} — ${String(e)}`);
      }
    }

    if (!(this.platformAccessory as unknown as Record<string, unknown>)['existing']) {
      globs.info(`registering new Accessory ${this.platformAccessory.displayName} with homebridge`);
      globs.API.registerPlatformAccessories('homebridge-knx', 'KNX', [this.platformAccessory]);
    }
  }

  getPlatformAccessory(): PlatformAccessory {
    return this.platformAccessory;
  }
}
