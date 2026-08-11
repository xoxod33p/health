import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ collection: 'customers', timestamps: true })
export class Customer {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) customerNumber!: string;
  @Prop({ required: true }) firstName!: string;
  @Prop({ required: true }) lastName!: string;
  @Prop() dateOfBirth?: Date;
  @Prop() gender?: string;
  @Prop() email?: string;
  @Prop() phone?: string;
  @Prop() address?: string;
  @Prop() emergencyContact?: string;
  @Prop({ required: true, enum: ['ACTIVE', 'INACTIVE', 'ARCHIVED'], default: 'ACTIVE' }) status!: string;
  @Prop() notes?: string;
  @Prop({ required: true }) createdBy!: string;
  @Prop({ required: true }) updatedBy!: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ companyId: 1, customerNumber: 1 }, { unique: true });
CustomerSchema.index({ companyId: 1, email: 1 });
CustomerSchema.index({ companyId: 1, createdAt: -1 });
