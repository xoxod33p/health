'use client';

import { ArrowLeft, Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '../../components/app-shell';

export default function NewSensorPage() {
  const [saved, setSaved] = useState(false);
  return <AppShell><div className="page-content narrow-content"><Link className="back-link" href="/sensors"><ArrowLeft size={15} /> Back to sensors</Link><section className="form-heading"><p className="eyebrow">Inventory register</p><h1>Add a sensor</h1><p className="heading-copy">Register a device before assigning it to a customer.</p></section><div className="form-layout"><form className="panel form-panel" onSubmit={(event) => { event.preventDefault(); setSaved(true); }}><div className="form-section"><h2>Device details</h2><p>Use the identifiers printed on the physical device.</p><div className="form-grid"><label>Serial number<input placeholder="VS-3001-NX" required /></label><label>Sensor type<div className="select-wrap"><select required><option>VitalSense Pro</option><option>CardioGuard 2</option><option>OxiTrack Mini</option></select><ChevronDown size={15} /></div></label><label>Manufacturer<input defaultValue="CareSignal" /></label><label>Model<input placeholder="VS-PRO-4" /></label><label>Expiration date<input type="date" required /></label><label>Initial status<div className="select-wrap"><select><option>Available</option><option>Disabled</option></select><ChevronDown size={15} /></div></label></div></div><div className="form-actions"><Link className="ghost-button" href="/sensors">Cancel</Link><button className="primary-button"><Check size={16} /> {saved ? 'Saved' : 'Save sensor'}</button></div></form><aside className="form-aside"><div className="aside-number">01</div><strong>Register first</strong><p>Once saved, the sensor will appear as available inventory and can be assigned from the sensor register.</p><div className="aside-number">02</div><strong>Assign safely</strong><p>Assignment history is permanent and every change is recorded for audit.</p></aside></div></div></AppShell>;
}
