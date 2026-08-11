import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } })
export class AuditLog {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) actorUserId!: string;
  @Prop({ required: true }) action!: string;
  @Prop({ required: true }) entityType!: string;
  @Prop({ type: Types.ObjectId }) entityId?: Types.ObjectId;
  @Prop({ type: Object }) oldValues?: Record<string, unknown>;
  @Prop({ type: Object }) newValues?: Record<string, unknown>;
  @Prop() ipAddress?: string;
  @Prop() userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ companyId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ companyId: 1, entityType: 1, entityId: 1 });
AuditLogSchema.pre('findOneAndUpdate', () => { throw new Error('Audit logs are immutable'); });
AuditLogSchema.pre('updateMany', () => { throw new Error('Audit logs are immutable'); });
AuditLogSchema.pre('deleteMany', () => { throw new Error('Audit logs are immutable'); });
