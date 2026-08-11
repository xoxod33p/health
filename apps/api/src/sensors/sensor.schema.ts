import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SensorDocument = HydratedDocument<Sensor>;

@Schema({ collection: 'sensors', timestamps: true })
export class Sensor {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) serialNumber!: string;
  @Prop({ required: true }) sensorTypeId!: string;
  @Prop({ required: true }) manufacturer!: string;
  @Prop({ required: true }) model!: string;
  @Prop({ type: Types.ObjectId, ref: 'Customer' }) customerId?: Types.ObjectId;
  @Prop({ required: true, enum: ['AVAILABLE', 'ASSIGNED', 'ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'DISABLED', 'REPLACED'], default: 'AVAILABLE' }) status!: string;
  @Prop() activatedAt?: Date;
  @Prop({ required: true, index: true }) expiresAt!: Date;
}

export const SensorSchema = SchemaFactory.createForClass(Sensor);
SensorSchema.index({ companyId: 1, serialNumber: 1 }, { unique: true });
SensorSchema.index({ companyId: 1, status: 1 });
SensorSchema.index({ companyId: 1, expiresAt: 1 });
SensorSchema.index({ companyId: 1, customerId: 1 });
