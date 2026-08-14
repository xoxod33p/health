import { config } from 'dotenv';
import { resolve } from 'node:path';
import mongoose, { Types, Model } from 'mongoose';

config();
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '../../../../.env') });

const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID || 'development-company';
const defaultAdminEmail = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@localhost.test').toLowerCase().trim();
const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  console.error('Error: MONGODB_URI environment variable is missing.');
  process.exit(1);
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongodbUri!);

  // Schemas
  const sensorTypeSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    description: String,
    status: { type: String, required: true, default: 'ACTIVE' },
    createdBy: String,
  }, { collection: 'sensor_types', timestamps: true });

  const customerSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    customerNumber: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: Date,
    gender: String,
    email: String,
    phone: String,
    address: String,
    emergencyContact: String,
    status: { type: String, required: true, default: 'ACTIVE' },
    notes: String,
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  }, { collection: 'customers', timestamps: true });

  const sensorSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    serialNumber: { type: String, required: true },
    sensorTypeId: { type: String, required: true },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    customerId: { type: Types.ObjectId, ref: 'Customer' },
    status: { type: String, required: true, default: 'AVAILABLE' },
    activatedAt: Date,
    expiresAt: { type: Date, required: true, index: true },
  }, { collection: 'sensors', timestamps: true });

  const sensorAssignmentSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    sensorId: { type: Types.ObjectId, ref: 'Sensor', required: true, index: true },
    customerId: { type: Types.ObjectId, ref: 'Customer', required: true, index: true },
    assignedBy: { type: String, required: true },
    assignedAt: { type: Date, required: true },
    unassignedAt: Date,
    reason: String,
  }, { collection: 'sensor_assignments', timestamps: { createdAt: true, updatedAt: false } });

  const sensorReplacementSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    customerName: { type: String, required: true, index: true },
    serialNumber: { type: String, required: true, index: true },
    replacedDate: { type: Date, required: true },
    issueType: { type: String, required: true },
    notes: String,
    replacedBy: String,
  }, { collection: 'sensor_replacements', timestamps: true });

  const notificationSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, required: true, default: 'UNREAD' },
    priority: { type: String, required: true, default: 'NORMAL' },
  }, { collection: 'notifications', timestamps: true });

  const auditLogSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    actorUserId: { type: String, required: true, index: true },
    actorName: String,
    actorEmail: String,
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: String,
    newValues: mongoose.Schema.Types.Mixed,
    oldValues: mongoose.Schema.Types.Mixed,
  }, { collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } });

  const SensorTypeModel: Model<any> = mongoose.models.SensorType || mongoose.model('SensorType', sensorTypeSchema);
  const CustomerModel: Model<any> = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
  const SensorModel: Model<any> = mongoose.models.Sensor || mongoose.model('Sensor', sensorSchema);
  const SensorAssignmentModel: Model<any> = mongoose.models.SensorAssignment || mongoose.model('SensorAssignment', sensorAssignmentSchema);
  const SensorReplacementModel: Model<any> = mongoose.models.SensorReplacement || mongoose.model('SensorReplacement', sensorReplacementSchema);
  const NotificationModel: Model<any> = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
  const AuditLogModel: Model<any> = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

  console.log('Seeding Sensor Types...');
  const sensorTypeData = [
    { name: 'ECG Cardiac Monitor', code: 'ECG', description: 'Continuous multi-lead electrocardiogram cardiac sensor', status: 'ACTIVE', createdBy: defaultAdminEmail },
    { name: 'Continuous Glucose Monitor', code: 'CGM', description: 'Subcutaneous interstitial fluid glucose monitoring patch', status: 'ACTIVE', createdBy: defaultAdminEmail },
    { name: 'Pulse Oximeter', code: 'SPO2', description: 'High-precision blood oxygen saturation and pulse rate sensor', status: 'ACTIVE', createdBy: defaultAdminEmail },
    { name: 'Non-Invasive Blood Pressure', code: 'NIBP', description: 'Oscillometric digital telemetry arterial pressure monitor', status: 'ACTIVE', createdBy: defaultAdminEmail },
    { name: 'Core Temperature Patch', code: 'TEMP', description: 'Axillary continuous wireless temperature telemetry sensor', status: 'ACTIVE', createdBy: defaultAdminEmail },
  ];

  const createdTypes: Record<string, string> = {};
  for (const item of sensorTypeData) {
    const doc = await SensorTypeModel.findOneAndUpdate(
      { companyId, code: item.code },
      { ...item, companyId },
      { upsert: true, new: true }
    );
    createdTypes[item.code] = doc._id.toString();
  }

  console.log('Seeding Customers...');
  const customerData = [
    { customerNumber: 'CUST-1001', firstName: 'Arthur', lastName: 'Pendleton', dateOfBirth: new Date('1958-04-12'), gender: 'MALE', email: 'arthur.p@example.com', phone: '+1 (555) 111-2233', address: '742 Evergreen Terrace, Springfield', emergencyContact: 'Martha Pendleton (+1 555-111-2234)', status: 'ACTIVE', notes: 'Hypertension and cardiac arrhythmia monitoring' },
    { customerNumber: 'CUST-1002', firstName: 'Beatrice', lastName: 'Holloway', dateOfBirth: new Date('1965-08-23'), gender: 'FEMALE', email: 'beatrice.h@example.com', phone: '+1 (555) 222-3344', address: '128 Baker Street, Seattle', emergencyContact: 'Robert Holloway (+1 555-222-3345)', status: 'ACTIVE', notes: 'Type 1 Diabetes CGM telemetry tracking' },
    { customerNumber: 'CUST-1003', firstName: 'Clara', lastName: 'Oswald', dateOfBirth: new Date('1989-11-05'), gender: 'FEMALE', email: 'clara.o@example.com', phone: '+1 (555) 333-4455', address: '45 Rosewood Lane, Boston', emergencyContact: 'Danny Pink (+1 555-333-4456)', status: 'ACTIVE', notes: 'Post-operative respiratory SpO2 observation' },
    { customerNumber: 'CUST-1004', firstName: 'Daniel', lastName: 'Kaufman', dateOfBirth: new Date('1972-02-18'), gender: 'MALE', email: 'daniel.k@example.com', phone: '+1 (555) 444-5566', address: '890 Ocean Drive, Miami', emergencyContact: 'Rachel Kaufman (+1 555-444-5567)', status: 'ACTIVE', notes: 'Stage 2 Hypertension remote blood pressure tracking' },
    { customerNumber: 'CUST-1005', firstName: 'Evelyn', lastName: 'Sterling', dateOfBirth: new Date('1994-06-30'), gender: 'FEMALE', email: 'evelyn.s@example.com', phone: '+1 (555) 555-6677', address: '312 Maple Court, Denver', emergencyContact: 'Grace Sterling (+1 555-555-6678)', status: 'ACTIVE', notes: 'Inpatient recovery core temperature patch monitoring' },
    { customerNumber: 'CUST-1006', firstName: 'Franklin', lastName: 'Pierce', dateOfBirth: new Date('1952-09-14'), gender: 'MALE', email: 'franklin.p@example.com', phone: '+1 (555) 666-7788', address: '55 Pine Ridge Rd, Austin', emergencyContact: 'Jane Pierce (+1 555-666-7789)', status: 'ACTIVE', notes: 'Congestive heart failure dual sensor telemetry' },
    { customerNumber: 'CUST-1007', firstName: 'Gloria', lastName: 'Ramirez', dateOfBirth: new Date('1981-12-01'), gender: 'FEMALE', email: 'gloria.r@example.com', phone: '+1 (555) 777-8899', address: '67 Sun Valley Blvd, Phoenix', emergencyContact: 'Carlos Ramirez (+1 555-777-8800)', status: 'ACTIVE', notes: 'Gestational diabetes glucose level tracking' },
    { customerNumber: 'CUST-1008', firstName: 'Henry', lastName: 'Thorne', dateOfBirth: new Date('1960-03-25'), gender: 'MALE', email: 'henry.t@example.com', phone: '+1 (555) 888-9900', address: '204 Highland Ave, Chicago', emergencyContact: 'Emily Thorne (+1 555-888-9901)', status: 'ACTIVE', notes: 'Nocturnal hypoxemia sleep study monitoring' },
  ];

  const createdCustomers: Record<string, any> = {};
  for (const c of customerData) {
    const doc = await CustomerModel.findOneAndUpdate(
      { companyId, customerNumber: c.customerNumber },
      { ...c, companyId, createdBy: defaultAdminEmail, updatedBy: defaultAdminEmail },
      { upsert: true, new: true }
    );
    createdCustomers[c.customerNumber] = doc;
  }

  console.log('Seeding Hardware Sensors & Assignments...');
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  const sensorData = [
    { serialNumber: 'ECG-88901', sensorTypeId: createdTypes['ECG'], manufacturer: 'BioTelemetry Inc', model: 'CardioTrac-Pro', status: 'ACTIVE', customerId: createdCustomers['CUST-1001']._id, activatedAt: new Date(now - 10 * DAY), expiresAt: new Date(now + 180 * DAY) },
    { serialNumber: 'ECG-88902', sensorTypeId: createdTypes['ECG'], manufacturer: 'BioTelemetry Inc', model: 'CardioTrac-Pro', status: 'ACTIVE', customerId: createdCustomers['CUST-1006']._id, activatedAt: new Date(now - 30 * DAY), expiresAt: new Date(now + 150 * DAY) },
    { serialNumber: 'ECG-88903', sensorTypeId: createdTypes['ECG'], manufacturer: 'BioTelemetry Inc', model: 'CardioTrac-Mini', status: 'AVAILABLE', expiresAt: new Date(now + 365 * DAY) },
    { serialNumber: 'ECG-88904', sensorTypeId: createdTypes['ECG'], manufacturer: 'BioTelemetry Inc', model: 'CardioTrac-Mini', status: 'AVAILABLE', expiresAt: new Date(now + 365 * DAY) },
    { serialNumber: 'CGM-44101', sensorTypeId: createdTypes['CGM'], manufacturer: 'Senseonics Global', model: 'Eversense-G3', status: 'ACTIVE', customerId: createdCustomers['CUST-1002']._id, activatedAt: new Date(now - 7 * DAY), expiresAt: new Date(now + 21 * DAY) },
    { serialNumber: 'CGM-44102', sensorTypeId: createdTypes['CGM'], manufacturer: 'Senseonics Global', model: 'Eversense-G3', status: 'EXPIRING_SOON', customerId: createdCustomers['CUST-1007']._id, activatedAt: new Date(now - 12 * DAY), expiresAt: new Date(now + 2 * DAY) },
    { serialNumber: 'CGM-44103', sensorTypeId: createdTypes['CGM'], manufacturer: 'Senseonics Global', model: 'Eversense-G3', status: 'EXPIRED', activatedAt: new Date(now - 45 * DAY), expiresAt: new Date(now - 5 * DAY) },
    { serialNumber: 'CGM-44104', sensorTypeId: createdTypes['CGM'], manufacturer: 'Senseonics Global', model: 'Eversense-G3', status: 'AVAILABLE', expiresAt: new Date(now + 300 * DAY) },
    { serialNumber: 'SPO-22001', sensorTypeId: createdTypes['SPO2'], manufacturer: 'Masimo Signal', model: 'iSpO2-Pulse', status: 'ACTIVE', customerId: createdCustomers['CUST-1003']._id, activatedAt: new Date(now - 5 * DAY), expiresAt: new Date(now + 90 * DAY) },
    { serialNumber: 'SPO-22002', sensorTypeId: createdTypes['SPO2'], manufacturer: 'Masimo Signal', model: 'iSpO2-Pulse', status: 'ACTIVE', customerId: createdCustomers['CUST-1008']._id, activatedAt: new Date(now - 15 * DAY), expiresAt: new Date(now + 75 * DAY) },
    { serialNumber: 'SPO-22003', sensorTypeId: createdTypes['SPO2'], manufacturer: 'Masimo Signal', model: 'iSpO2-Pulse', status: 'AVAILABLE', expiresAt: new Date(now + 400 * DAY) },
    { serialNumber: 'NIB-77301', sensorTypeId: createdTypes['NIBP'], manufacturer: 'Omron Clinical', model: 'HemBP-Wireless', status: 'ACTIVE', customerId: createdCustomers['CUST-1004']._id, activatedAt: new Date(now - 20 * DAY), expiresAt: new Date(now + 200 * DAY) },
    { serialNumber: 'NIB-77302', sensorTypeId: createdTypes['NIBP'], manufacturer: 'Omron Clinical', model: 'HemBP-Wireless', status: 'AVAILABLE', expiresAt: new Date(now + 365 * DAY) },
    { serialNumber: 'TMP-55001', sensorTypeId: createdTypes['TEMP'], manufacturer: 'VitalPatch Tech', model: 'TempCore-Wireless', status: 'ACTIVE', customerId: createdCustomers['CUST-1005']._id, activatedAt: new Date(now - 2 * DAY), expiresAt: new Date(now + 12 * DAY) },
    { serialNumber: 'TMP-55002', sensorTypeId: createdTypes['TEMP'], manufacturer: 'VitalPatch Tech', model: 'TempCore-Wireless', status: 'AVAILABLE', expiresAt: new Date(now + 180 * DAY) },
  ];

  for (const s of sensorData) {
    const doc = await SensorModel.findOneAndUpdate(
      { companyId, serialNumber: s.serialNumber },
      { ...s, companyId },
      { upsert: true, new: true }
    );

    if (s.customerId) {
      await SensorAssignmentModel.findOneAndUpdate(
        { companyId, sensorId: doc._id, customerId: s.customerId },
        {
          companyId,
          sensorId: doc._id,
          customerId: s.customerId,
          assignedBy: defaultAdminEmail,
          assignedAt: s.activatedAt || new Date(),
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log('Seeding Maintenance & Replacement Records...');
  const replacementData = [
    { customerName: 'Arthur Pendleton', serialNumber: 'ECG-88900', replacedDate: new Date(now - 10 * DAY), issueType: 'Sensor electrode adhesive degradation', notes: 'Replaced with ECG-88901; signal verified stable', replacedBy: defaultAdminEmail },
    { customerName: 'Daniel Kaufman', serialNumber: 'NIB-77300', replacedDate: new Date(now - 20 * DAY), issueType: 'Bluetooth transmission intermittency', notes: 'Replaced cuff unit; firmware v2.4 flashed', replacedBy: defaultAdminEmail },
    { customerName: 'Beatrice Holloway', serialNumber: 'CGM-44100', replacedDate: new Date(now - 7 * DAY), issueType: 'Standard 14-day wear expiration', notes: 'New patch applied right upper arm; calibration complete', replacedBy: defaultAdminEmail },
  ];

  for (const r of replacementData) {
    await SensorReplacementModel.findOneAndUpdate(
      { companyId, serialNumber: r.serialNumber },
      { ...r, companyId },
      { upsert: true, new: true }
    );
  }

  console.log('Seeding In-App Notifications...');
  const notificationData = [
    { recipientId: defaultAdminEmail, type: 'SENSOR_EXPIRING', title: 'Sensor Expiring Soon', message: 'CGM-44102 assigned to Gloria Ramirez expires in 2 days.', status: 'UNREAD', priority: 'HIGH' },
    { recipientId: defaultAdminEmail, type: 'SENSOR_REPLACED', title: 'Maintenance Replacement Logged', message: 'Sensor replacement for Arthur Pendleton was completed.', status: 'READ', priority: 'NORMAL' },
    { recipientId: defaultAdminEmail, type: 'SYSTEM_ALERT', title: 'New Sensor Type Registered', message: 'Core Temperature Patch (TEMP) type was activated.', status: 'READ', priority: 'LOW' },
  ];

  for (const n of notificationData) {
    await NotificationModel.create({ ...n, companyId });
  }

  console.log('Seeding Audit Trail Logs...');
  const auditData = [
    { actorUserId: 'admin', actorName: 'Root Admin', actorEmail: defaultAdminEmail, action: 'sensor_type.create', entityType: 'SensorType', entityId: 'ECG', newValues: { code: 'ECG' } },
    { actorUserId: 'admin', actorName: 'Root Admin', actorEmail: defaultAdminEmail, action: 'customer.create', entityType: 'Customer', entityId: 'CUST-1001', newValues: { customerNumber: 'CUST-1001' } },
    { actorUserId: 'admin', actorName: 'Root Admin', actorEmail: defaultAdminEmail, action: 'sensor.assign', entityType: 'Sensor', entityId: 'ECG-88901', newValues: { serialNumber: 'ECG-88901', customerNumber: 'CUST-1001' } },
    { actorUserId: 'admin', actorName: 'Root Admin', actorEmail: defaultAdminEmail, action: 'replacement.create', entityType: 'SensorReplacement', entityId: 'CGM-44100', newValues: { serialNumber: 'CGM-44100' } },
  ];

  for (const a of auditData) {
    await AuditLogModel.create({ ...a, companyId });
  }

  await mongoose.disconnect();
  console.log('');
  console.log('======================================================');
  console.log(' Healthcare platform seed data loaded successfully!');
  console.log('  - 5 Sensor Types (ECG, CGM, SPO2, NIBP, TEMP)');
  console.log('  - 8 Clinical Customers with full demographic records');
  console.log('  - 15 Hardware Sensors (Active, Available, Expiring, Expired)');
  console.log('  - 3 Sensor Replacements & Maintenance Logs');
  console.log('  - In-App Notifications & Audit Trail Logs');
  console.log('  (User/staff accounts were not seeded)');
  console.log('======================================================');
}

seed().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : 'Seeding failed');
  process.exit(1);
});
