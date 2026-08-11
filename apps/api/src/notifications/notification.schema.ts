import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ collection: 'notifications', timestamps: { createdAt: true, updatedAt: false } })
export class Notification {
  @Prop({ required: true, index: true }) companyId!: string;
  @Prop({ required: true, index: true }) recipientId!: string;
  @Prop({ required: true, enum: ['SENSOR_EXPIRING', 'SENSOR_EXPIRED', 'SENSOR_ASSIGNED', 'SENSOR_REPLACED', 'CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'SYSTEM_ALERT', 'REPORT_READY', 'SECURITY_ALERT'] }) type!: string;
  @Prop({ required: true }) title!: string;
  @Prop({ required: true }) message!: string;
  @Prop() entityType?: string;
  @Prop({ type: Types.ObjectId }) entityId?: Types.ObjectId;
  @Prop({ required: true, enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'], default: 'NORMAL' }) priority!: string;
  @Prop({ required: true, enum: ['UNREAD', 'READ'], default: 'UNREAD' }) status!: string;
  @Prop() scheduledAt?: Date;
  @Prop() sentAt?: Date;
  @Prop() readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ companyId: 1, recipientId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ companyId: 1, scheduledAt: 1 });
