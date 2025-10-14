import { type VirtualFitting, type InsertVirtualFitting } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createVirtualFitting(fitting: InsertVirtualFitting): Promise<VirtualFitting>;
  updateVirtualFitting(id: string, updates: Partial<VirtualFitting>): Promise<VirtualFitting | undefined>;
  getVirtualFitting(id: string): Promise<VirtualFitting | undefined>;
  getAllVirtualFittings(): Promise<VirtualFitting[]>;
}

export class MemStorage implements IStorage {
  private fittings: Map<string, VirtualFitting>;

  constructor() {
    this.fittings = new Map();
  }

  async createVirtualFitting(insertFitting: InsertVirtualFitting): Promise<VirtualFitting> {
    const id = randomUUID();
    const fitting: VirtualFitting = {
      id,
      userPhotoPath: insertFitting.userPhotoPath,
      clothingPhotoPath: insertFitting.clothingPhotoPath,
      resultPhotoPath: insertFitting.resultPhotoPath || null,
      status: insertFitting.status || "processing",
      createdAt: new Date(),
    };
    this.fittings.set(id, fitting);
    return fitting;
  }

  async updateVirtualFitting(id: string, updates: Partial<VirtualFitting>): Promise<VirtualFitting | undefined> {
    const fitting = this.fittings.get(id);
    if (!fitting) return undefined;

    const updatedFitting = { ...fitting, ...updates };
    this.fittings.set(id, updatedFitting);
    return updatedFitting;
  }

  async getVirtualFitting(id: string): Promise<VirtualFitting | undefined> {
    return this.fittings.get(id);
  }

  async getAllVirtualFittings(): Promise<VirtualFitting[]> {
    return Array.from(this.fittings.values());
  }
}

export const storage = new MemStorage();
