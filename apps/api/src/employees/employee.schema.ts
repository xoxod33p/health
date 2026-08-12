import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ collection: 'employees', timestamps: true })
export class Employee {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true }) firstName!: string;
  @Prop({ required: true }) lastName!: string;
  @Prop({ required: true, unique: true }) authUserId!: string;
  @Prop({ required: true, unique: false }) email!: string;
  @Prop({ required: true, enum: ['SYSTEM_ADMIN', 'MANAGER', 'INHOUSE_STAFF', 'OUT_EMPLOYEE'] }) role!: string;
  @Prop({ type: [String], default: [] }) permissions!: string[];
  @Prop({ required: true, enum: ['ACTIVE', 'INVITED', 'SUSPENDED'], default: 'INVITED' }) status!: string;
  @Prop() phone?: string;
  @Prop() title?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
EmployeeSchema.index({ companyId: 1, email: 1 }, { unique: true });
EmployeeSchema.index({ companyId: 1, role: 1, status: 1 });
