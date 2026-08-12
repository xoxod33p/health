import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SensorReplacementDocument = HydratedDocument<SensorReplacement>;

@Schema({ collection: 'sensor_replacements', timestamps: true })
export class SensorReplacement {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) customerName!: string;
  @Prop({ required: true, index: true }) serialNumber!: string;
  @Prop({ required: true }) replacedDate!: Date;
  @Prop({ required: true }) issueType!: string;
  @Prop() notes?: string;
  @Prop() replacedBy?: string;
}

export const SensorReplacementSchema = SchemaFactory.createForClass(SensorReplacement);
SensorReplacementSchema.index({ companyId: 1, serialNumber: 1 });
SensorReplacementSchema.index({ companyId: 1, customerName: 1 });
