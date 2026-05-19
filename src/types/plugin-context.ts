import type { API, Characteristic, Logger, PlatformAccessory, Service } from 'homebridge';
import type { KnxMonitor } from '../lib/knxmonitor';
import type { KNXDevice } from '../lib/knxdevice';

export interface KnxConfig {
  knxconnection?: string;
  knxd_ip?: string;
  knxd_port?: number;
  GroupAddresses: Record<string, GroupAddressConfig>;
  Devices?: DeviceConfig[];
  AllowKillHomebridge?: boolean;
}

export interface GroupAddressConfig {
  name: string;
  dptype: string;
  readable?: boolean;
  readOnStartup?: boolean;
  writable?: boolean;
  comment?: string;
}

export interface DeviceConfig {
  DeviceName: string;
  UUID?: string;
  HKCategory?: string;
  Manufacturer?: string;
  Model?: string;
  SerialNumber?: string;
  Services?: ServiceConfig[];
}

export interface ServiceConfig {
  ServiceName: string;
  ServiceType: string;
  Handler?: string;
  LocalConstants?: Record<string, unknown>;
  Characteristics?: CharacteristicConfig[];
  subtype?: string;
  Description?: string;
  KNXObjects?: Array<Record<string, unknown>>;
  KNXReadRequests?: string[];
}

export interface CharacteristicConfig {
  Type: string;
  Set?: string | string[];
  Listen?: string | string[];
  Reverse?: boolean;
  MinValue?: number;
  MaxValue?: number;
  ValidValues?: number[];
  DPT?: string;
}

export interface ReadRequest {
  address: string;
  dpt: string;
}

/** Central dependency container — replaces the informal `globs` object. */
export interface PluginContext {
  log: Logger;
  info: (comment: string) => void;
  debug: (comment: string) => void;
  errorlog: (comment: string) => void;

  /** Homebridge API (platform + HAP) */
  newAPI: API;
  API: API;

  Service: typeof Service;
  Characteristic: typeof Characteristic;

  config: KnxConfig;
  knxconnection?: string;
  knxd_ip: string;
  knxd_port: number;

  restoredAccessories: PlatformAccessory[];
  devices: KNXDevice[];
  readRequests: Record<string, ReadRequest>;

  knxmonitor: KnxMonitor;
  webdata: unknown;
}
