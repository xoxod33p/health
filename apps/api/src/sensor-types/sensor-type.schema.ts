import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SensorTypeDocument = HydratedDocument<SensorType>;

@Schema({ collection: 'sensor_types', timestamps: true })
export class SensorType {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) name!: string;
  @Prop({ required: true, unique: false }) code!: string;
  @Prop() description?: string;
  @Prop({ required: true, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }) status!: string;
  @Prop() createdBy?: string;
}

export const SensorTypeSchema = SchemaFactory.createForClass(SensorType);
SensorTypeSchema.index({ companyId: 1, code: 1 }, { unique: true });
SensorTypeSchema.index({ companyId: 1, status: 1 });
