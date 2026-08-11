import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SensorAssignmentDocument = HydratedDocument<SensorAssignment>;

@Schema({ collection: 'sensor_assignments', timestamps: { createdAt: true, updatedAt: false } })
export class SensorAssignment {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ type: Types.ObjectId, ref: 'Sensor', required: true, index: true }) sensorId!: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true }) customerId!: Types.ObjectId;
  @Prop({ required: true }) assignedBy!: string;
  @Prop({ required: true }) assignedAt!: Date;
  @Prop() unassignedAt?: Date;
  @Prop() reason?: string;
}

export const SensorAssignmentSchema = SchemaFactory.createForClass(SensorAssignment);
SensorAssignmentSchema.index({ companyId: 1, sensorId: 1, assignedAt: -1 });
SensorAssignmentSchema.index({ companyId: 1, customerId: 1, assignedAt: -1 });
