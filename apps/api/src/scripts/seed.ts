import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose, { Types, Model } from 'mongoose';
import { hashPassword } from '../auth/password.util';
import { ROLE_PERMISSIONS } from '../auth/permissions';

config();
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '../../../../.env') });

const companyId = process.env.DEFAULT_ADMIN_COMPANY_ID || 'development-company';
const mongodbUri = process.env.MONGODB_URI;

if (!mongodbUri) {
  console.error('Error: MONGODB_URI environment variable is missing.');
  process.exit(1);
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongodbUri!);

  // Schemas
  const userSchema = new mongoose.Schema({
    authUserId: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, required: true, index: true },
    role: { type: String, required: true },
    permissions: { type: [String], default: [] },
    status: { type: String, required: true, default: 'ACTIVE' },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    salt: { type: String, required: true },
  }, { collection: 'users', timestamps: true });

  const employeeSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    authUserId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    permissions: { type: [String], default: [] },
    status: { type: String, required: true, default: 'ACTIVE' },
    phone: String,
    title: String,
  }, { collection: 'employees', timestamps: true });

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
    recipient: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    channel: { type: String, required: true, default: 'IN_APP' },
    status: { type: String, required: true, default: 'UNREAD' },
    link: String,
    metadata: mongoose.Schema.Types.Mixed,
  }, { collection: 'notifications', timestamps: true });

  const auditLogSchema = new mongoose.Schema({
    companyId: { type: String, required: true, index: true },
    actor: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, required: true },
    diff: mongoose.Schema.Types.Mixed,
    reason: String,
    metadata: mongoose.Schema.Types.Mixed,
  }, { collection: 'audit_logs', timestamps: { createdAt: true, updatedAt: false } });

  const UserModel: Model<any> = mongoose.models.User || mongoose.model('User', userSchema);
  const EmployeeModel: Model<any> = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
  const SensorTypeModel: Model<any> = mongoose.models.SensorType || mongoose.model('SensorType', sensorTypeSchema);
  const CustomerModel: Model<any> = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
  const SensorModel: Model<any> = mongoose.models.Sensor || mongoose.model('Sensor', sensorSchema);
  const SensorAssignmentModel: Model<any> = mongoose.models.SensorAssignment || mongoose.model('SensorAssignment', sensorAssignmentSchema);
  const SensorReplacementModel: Model<any> = mongoose.models.SensorReplacement || mongoose.model('SensorReplacement', sensorReplacementSchema);
  const NotificationModel: Model<any> = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
  const AuditLogModel: Model<any> = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

  console.log('Seeding Sensor Types...');
  const sensorTypeData = [
    { name: 'ECG Cardiac Monitor', code: 'ECG', description: 'Continuous multi-lead electrocardiogram cardiac sensor', status: 'ACTIVE', createdBy: 'admin@localhost.test' },
    { name: 'Continuous Glucose Monitor', code: 'CGM', description: 'Subcutaneous interstitial fluid glucose monitoring patch', status: 'ACTIVE', createdBy: 'admin@localhost.test' },
    { name: 'Pulse Oximeter', code: 'SPO2', description: 'High-precision blood oxygen saturation and pulse rate sensor', status: 'ACTIVE', createdBy: 'admin@localhost.test' },
    { name: 'Non-Invasive Blood Pressure', code: 'NIBP', description: 'Oscillometric digital telemetry arterial pressure monitor', status: 'ACTIVE', createdBy: 'admin@localhost.test' },
    { name: 'Core Temperature Patch', code: 'TEMP', description: 'Axillary continuous wireless temperature telemetry sensor', status: 'ACTIVE', createdBy: 'admin@localhost.test' },
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

  console.log('Seeding Staff & Team Members...');
  const staffData = [
    { firstName: 'Marcus', lastName: 'Vance', email: 'marcus.vance@healthcare.org', role: 'MANAGER', title: 'Clinical Operations Director', phone: '+1 (555) 234-5678' },
    { firstName: 'Elena', lastName: 'Rostova', email: 'elena.rostova@healthcare.org', role: 'INHOUSE_STAFF', title: 'Lead Telemetry Specialist', phone: '+1 (555) 345-6789' },
    { firstName: 'David', lastName: 'Chen', email: 'david.chen@healthcare.org', role: 'INHOUSE_STAFF', title: 'Clinical Biometrics Technician', phone: '+1 (555) 456-7890' },
    { firstName: 'Sarah', lastName: 'Jenkins', email: 'sarah.jenkins@healthcare.org', role: 'OUT_EMPLOYEE', title: 'Field Deployment Specialist', phone: '+1 (555) 567-8901' },
  ];

  const defaultPassword = 'ChangeMe123!';
  const { passwordHash, salt } = hashPassword(defaultPassword);

  for (const s of staffData) {
    const authUserId = `usr_${randomUUID().replace(/-/g, '')}`;
    const perms = Array.from(ROLE_PERMISSIONS[s.role] ?? []);

    await UserModel.findOneAndUpdate(
      { email: s.email },
      { authUserId, email: s.email, passwordHash, salt, role: s.role, permissions: perms, companyId, status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    await EmployeeModel.findOneAndUpdate(
      { companyId, email: s.email },
      { ...s, authUserId, permissions: perms, companyId, status: 'ACTIVE' },
      { upsert: true, new: true }
    );
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
      { ...c, companyId, createdBy: 'admin@localhost.test', updatedBy: 'admin@localhost.test' },
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
          assignedBy: 'admin@localhost.test',
          assignedAt: s.activatedAt || new Date(),
        },
        { upsert: true, new: true }
      );
    }
  }

  console.log('Seeding Maintenance & Replacement Records...');
  const replacementData = [
    { customerName: 'Arthur Pendleton', serialNumber: 'ECG-88900', replacedDate: new Date(now - 10 * DAY), issueType: 'Sensor electrode adhesive degradation', notes: 'Replaced with ECG-88901; signal verified stable', replacedBy: 'sarah.jenkins@healthcare.org' },
    { customerName: 'Daniel Kaufman', serialNumber: 'NIB-77300', replacedDate: new Date(now - 20 * DAY), issueType: 'Bluetooth transmission intermittency', notes: 'Replaced cuff unit; firmware v2.4 flashed', replacedBy: 'sarah.jenkins@healthcare.org' },
    { customerName: 'Beatrice Holloway', serialNumber: 'CGM-44100', replacedDate: new Date(now - 7 * DAY), issueType: 'Standard 14-day wear expiration', notes: 'New patch applied right upper arm; calibration complete', replacedBy: 'elena.rostova@healthcare.org' },
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
    { recipient: 'admin@localhost.test', type: 'SENSOR_EXPIRING', title: 'Sensor Expiring Soon', body: 'CGM-44102 assigned to Gloria Ramirez expires in 2 days.', status: 'UNREAD', link: '/sensors' },
    { recipient: 'admin@localhost.test', type: 'REPLACEMENT_LOGGED', title: 'Maintenance Replacement Logged', body: 'Sensor replacement for Arthur Pendleton was completed by Sarah Jenkins.', status: 'READ', link: '/sensors' },
    { recipient: 'admin@localhost.test', type: 'SYSTEM_AUDIT', title: 'New Sensor Type Registered', body: 'Core Temperature Patch (TEMP) type was activated.', status: 'READ', link: '/sensor-types' },
  ];

  for (const n of notificationData) {
    await NotificationModel.create({ ...n, companyId });
  }

  console.log('Seeding Audit Trail Logs...');
  const auditData = [
    { actor: 'admin@localhost.test', action: 'sensor_type.create', entity: 'SensorType', entityId: 'ECG', reason: 'Initial telemetry sensor category setup', metadata: { code: 'ECG' } },
    { actor: 'marcus.vance@healthcare.org', action: 'customer.create', entity: 'Customer', entityId: 'CUST-1001', reason: 'New patient intake for remote cardiac telemetry', metadata: { customerNumber: 'CUST-1001' } },
    { actor: 'sarah.jenkins@healthcare.org', action: 'sensor.assign', entity: 'Sensor', entityId: 'ECG-88901', reason: 'Assigned device to Arthur Pendleton', metadata: { serialNumber: 'ECG-88901', customerNumber: 'CUST-1001' } },
    { actor: 'elena.rostova@healthcare.org', action: 'replacement.create', entity: 'SensorReplacement', entityId: 'CGM-44100', reason: 'Routine sensor replacement performed', metadata: { serialNumber: 'CGM-44100' } },
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
  console.log('  - 4 Staff Accounts with roles & native credentials:');
  console.log('      * marcus.vance@healthcare.org    (MANAGER)');
  console.log('      * elena.rostova@healthcare.org   (INHOUSE_STAFF)');
  console.log('      * david.chen@healthcare.org      (INHOUSE_STAFF)');
  console.log('      * sarah.jenkins@healthcare.org   (OUT_EMPLOYEE)');
  console.log('      * Password for all staff: ChangeMe123!');
  console.log('  - 15 Hardware Sensors (Active, Available, Expiring, Expired)');
  console.log('  - 3 Sensor Replacements & Maintenance Logs');
  console.log('  - In-App Notifications & Audit Trail Logs');
  console.log('======================================================');
}

seed().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : 'Seeding failed');
  process.exit(1);
});
