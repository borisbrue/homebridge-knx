'use strict';

import { CharacteristicKNX } from './characteristic-knx';
import { iterate } from './iterate';
import { CustomServiceAPI } from './customServiceAPI';
import type { PluginContext, ServiceConfig } from '../types/plugin-context';
import type { KNXDevice } from './knxdevice';
import type { PlatformAccessory, Service } from 'homebridge';

export class ServiceKNX {
  name: string;
  device: KNXDevice;
  config: ServiceConfig;
  globs: PluginContext;
  Services: typeof import('homebridge').Service;
  log: PluginContext['log'];
  myCharacteristics: CharacteristicKNX[] = [];
  handler: string = 'Default';
  customServiceAPI?: CustomServiceAPI;
  failed: boolean = false;
  serviceType?: string;
  description?: string;
  private serviceHK!: Service;

  constructor(device: KNXDevice, config: ServiceConfig, globs: PluginContext) {
    this.name = config.ServiceName;
    this.device = device;
    this.config = config;
    this.globs = globs;
    this.Services = globs.Service;
    this.log = globs.log;
    globs.info('Service constructor called');

    if (!globs.Service[config.ServiceType as keyof typeof globs.Service]) {
      this.globs.errorlog(`[ERROR] cannot create service of ServiceType ${config.ServiceType} (not found)`);
      this.failed = true;
      throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
    }
    if (typeof globs.Service[config.ServiceType as keyof typeof globs.Service] !== 'function') {
      this.globs.errorlog(`[ERROR] cannot create service of ServiceType ${config.ServiceType} (wrong type)`);
      this.failed = true;
      throw new Error("Must specify VALID 'ServiceType' property for each service in knx_config.json.");
    }

    this.failed = !this.loadServiceData(device.getPlatformAccessory());
  }

  loadServiceData(platformAccessory: PlatformAccessory): boolean {
    if (!this.config.ServiceType) { this.globs.info('has no service type'); return false; }
    if (!this.Services[this.config.ServiceType as keyof typeof this.Services]) {
      this.globs.info('not a known homekit service type'); return false;
    }

    if (!this.config.subtype) {
      this.globs.info('Creating new subtype ID');
      this.config.subtype = 'SUB_' + this.globs.API.hap.uuid.generate('KNX' + Math.random() + Math.random() + Math.random());
    }
    const subtype = this.config.subtype;
    const ServiceCtor = this.Services[this.config.ServiceType as keyof typeof this.Services] as typeof Service;
    const ctorUUID = (ServiceCtor as unknown as { UUID: string }).UUID;

    this.serviceHK = (platformAccessory.services.find(s => s.UUID === ctorUUID && s.subtype === subtype) ?? null) as unknown as Service;
    let newService: boolean;
    if (!this.serviceHK) {
      this.globs.info(`Did not find restored service for: ${this.name}`);
      newService = true;
      this.serviceHK = new ServiceCtor(this.name, subtype);
      this.globs.info(`Created service: ${this.name}`);
    } else {
      newService = false;
      this.globs.info(`Found restored service: ${this.name}`);
    }

    this.serviceType = this.config.ServiceType;
    this.description = this.config.Description;
    this.handler = this.config.Handler ?? 'Default';

    if (this.config.Handler) {
      this.customServiceAPI = new CustomServiceAPI(this, this.config.Handler);
    }

    if (this.config.Characteristics) {
      this.globs.info(`Preparing Characteristics: ${this.config.Characteristics.length}`);
      for (const chrConfig of this.config.Characteristics) {
        this.globs.info(chrConfig.Type);
        this.globs.info('Adding characteristic...');
        this.myCharacteristics.push(new CharacteristicKNX(this, chrConfig as unknown as Record<string, unknown>, this.globs));
      }
    }

    const knxObjects = this.config.KNXObjects;
    if (knxObjects) {
      if (!this.customServiceAPI) throw new Error("Must not specify 'KNXObjects' property for default service handler.");
      for (const obj of knxObjects) {
        if (!obj['Type']) throw new Error("Must specify 'KNXObjects' property 'Type' in knx_config.json.");
        if (!obj['DPT'])  throw new Error("Must specify 'KNXObjects' property 'DPT' in knx_config.json.");
        this.customServiceAPI.addPseudoCharacteristic(
          obj['Type'] as string,
          obj['Set'] as string | string[] | undefined,
          obj['Listen'] as string | string[] | undefined,
          obj['DPT'] as string,
        );
      }
    }

    const readRequests = this.config.KNXReadRequests;
    if (readRequests) {
      for (const rr of readRequests) {
        this.globs.readRequests[rr] = { address: rr, dpt: 'DPT1' };
      }
    }

    if (newService) {
      this.globs.info(`Adding service to accessory ${platformAccessory.displayName} for: ${this.name}`);
      platformAccessory.addService(this.serviceHK);
    }
    return true;
  }

  getHomeKitService(): Service {
    return this.serviceHK;
  }
}
