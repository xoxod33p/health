import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  authUserId!: string;

  @Prop({ required: true, index: true })
  companyId!: string;

  @Prop({ required: true, enum: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER', 'HEALTHCARE_EMPLOYEE', 'STAFF', 'AUDITOR'] })
  role!: string;

  @Prop({ required: true, enum: ['ACTIVE', 'SUSPENDED', 'INVITED'], default: 'ACTIVE' })
  status!: string;

  @Prop({ required: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  salt!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ companyId: 1, status: 1 });
