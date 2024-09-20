// src/types.ts

export interface Device {
    id: number;
    device_id: string;
    name?: string;
    sensors: Sensor[];
  }
  
  export interface DeviceCreate {
    device_id: string;
    name?: string;
  }
  
  export interface Sensor {
    id: number;
    sensor_id: number;
    device_id: number;
    name?: string;
    threshold?: Threshold;
    device: Device;
  }
  
  export interface SensorCreate {
    device_id: number;
    sensor_id: number;
    name?: string;
  }
  
  export interface Threshold {
    id?: number;
    sensor_id: number;
    min_moisture?: number;
    max_moisture?: number;
  }
  
  export interface Reading {
    id: number;
    sensor_id: number;
    moisture: number;
    timestamp: string;
  }
  
  export interface Alert {
    id: number;
    sensor_id: number;
    message: string;
    timestamp: string;
    read: boolean;
  }
  