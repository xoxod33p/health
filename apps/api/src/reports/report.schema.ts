import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface StoredReportFile {
  format: 'csv' | 'excel' | 'pdf' | 'xlsx';
  filename: string;
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: Date;
}

export type ReportDocument = Report & Document;

@Schema({ timestamps: true, collection: 'reports' })
export class Report {
  @Prop({ required: true, index: true })
  companyId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({
    required: true,
    enum: ['SENSOR_INVENTORY', 'EXPIRATION_REPLACEMENT', 'CUSTOMER_COVERAGE', 'OPERATIONAL_SUMMARY'],
  })
  type!: string;

  @Prop({
    required: true,
    enum: ['READY', 'GENERATING', 'FAILED'],
    default: 'READY',
  })
  status!: string;

  @Prop({
    required: true,
    enum: ['7_DAYS', '30_DAYS', '90_DAYS', 'ALL_TIME'],
    default: 'ALL_TIME',
  })
  dateRange!: string;

  @Prop({ type: Object, default: {} })
  parameters!: Record<string, unknown>;

  @Prop({ type: Object, default: {} })
  summary!: Record<string, unknown>;

  @Prop({ type: Array, default: [] })
  data!: Array<Record<string, unknown>>;

  @Prop({ type: Array, default: [] })
  columns!: Array<{ key: string; header: string }>;

  @Prop({ type: Array, default: [] })
  storageFiles!: StoredReportFile[];

  @Prop({ required: true })
  generatedBy!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
ReportSchema.index({ companyId: 1, createdAt: -1 });
