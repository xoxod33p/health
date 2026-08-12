import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SensorType, SensorTypeDocument } from './sensor-type.schema';
import { CreateSensorTypeDto, UpdateSensorTypeDto } from './sensor-type.dto';

@Injectable()
export class SensorTypesService {
  constructor(
    @InjectModel(SensorType.name) private readonly sensorTypes: Model<SensorTypeDocument>,
  ) {}

  async create(user: AuthenticatedUser, dto: CreateSensorTypeDto): Promise<SensorType> {
    const existing = await this.sensorTypes.findOne({ companyId: user.companyId, code: dto.code.toUpperCase() }).exec();
    if (existing) throw new ConflictException(`Sensor type with code "${dto.code}" already exists`);
    return this.sensorTypes.create({
      ...dto,
      code: dto.code.toUpperCase(),
      companyId: user.companyId,
      createdBy: user.authUserId,
      status: 'ACTIVE',
    });
  }

  async findAll(user: AuthenticatedUser): Promise<SensorType[]> {
    return this.sensorTypes.find({ companyId: user.companyId }).sort({ name: 1 }).lean().exec();
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSensorTypeDto): Promise<SensorType> {
    const updated = await this.sensorTypes.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...dto, ...(dto.code ? { code: dto.code.toUpperCase() } : {}) },
      { new: true },
    ).lean().exec();
    if (!updated) throw new NotFoundException('Sensor type not found');
    return updated;
  }

  async remove(user: AuthenticatedUser, id: string): Promise<void> {
    const result = await this.sensorTypes.deleteOne({ _id: id, companyId: user.companyId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('Sensor type not found');
  }
}
