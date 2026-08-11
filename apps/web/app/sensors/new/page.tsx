'use client';

import { Check, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '../../components/app-shell';

export default function NewSensorPage() {
  const [saved, setSaved] = useState(false);

  return (
    <AppShell title="Add a sensor">
      <div className="page-content narrow-content" style={{ paddingTop: '16px' }}>
        <div className="form-layout">
          <form
            className="panel form-panel"
            onSubmit={(event) => {
              event.preventDefault();
              setSaved(true);
            }}
          >
            <div className="form-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <div className="form-grid">
                <label>
                  Serial number
                  <input required placeholder="e.g. SN-8840-X" />
                </label>
                <label>
                  Sensor type
                  <div className="select-wrap">
                    <select required>
                      <option value="">Select a sensor type</option>
                      <option>VitalSense Pro</option>
                      <option>CardioGuard 2</option>
                      <option>OxiTrack Mini</option>
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </label>
                <label>
                  Manufacturer
                  <input placeholder="e.g. CareSignal Labs" />
                </label>
                <label>
                  Model
                  <input placeholder="e.g. VS-200" />
                </label>
                <label>
                  Expiration date
                  <input type="date" required />
                </label>
                <label>
                  Initial status
                  <div className="select-wrap">
                    <select>
                      <option>Available</option>
                      <option>Disabled</option>
                    </select>
                    <ChevronDown size={15} />
                  </div>
                </label>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '20px' }}>
              <Link className="ghost-button" href="/sensors">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                <Check size={16} /> {saved ? 'Saved' : 'Save sensor'}
              </button>
            </div>
          </form>
          <aside className="form-aside">
            <div className="aside-number">01</div>
            <strong>Register first</strong>
            <p>Once saved, the sensor will appear in inventory and can be assigned to customers.</p>
            <div className="aside-number">02</div>
            <strong>Assign safely</strong>
            <p>Assignment history is recorded automatically for compliance audit logs.</p>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
