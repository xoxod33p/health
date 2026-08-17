'use client';

import { Mail, Phone, Plus, RefreshCw, Search, SlidersHorizontal, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type Customer = {
  _id: string;
  customerNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  status: string;
};
type CustomerResponse = { data: Customer[]; total: number; page: number; limit: number };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch<CustomerResponse>('/customers?limit=100');
      setCustomers(result.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    let disconnect: (() => void) | undefined;
    void connectRealtime(() => void load()).then((cleanup) => {
      disconnect = cleanup;
    });
    return () => disconnect?.();
  }, []);

  const filtered = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.firstName} ${customer.lastName} ${customer.customerNumber} ${customer.phone ?? ''} ${
          customer.email ?? ''
        } ${customer.address ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [customers, query]
  );

  const topbarCenter = (
    <div className="topbar-center-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by customer name, ID, phone, or email"
        />
      </div>
      <button className="filter-button">
        <SlidersHorizontal size={16} /> Filter
      </button>
      <span className="result-count">{filtered.length} customers</span>
    </div>
  );

  const topbarRight = (
    <button className="primary-button" onClick={() => setShowForm(true)}>
      <Plus size={17} /> Add customer
    </button>
  );

  return (
    <AppShell headerCenter={topbarCenter} headerActions={topbarRight}>
      <div className="page-content">
        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" /> Loading customer directory...
          </div>
        )}

        {error && (
          <div className="data-error">
            <span>{error}</span>
            <button className="secondary-button" onClick={() => void load()}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">All records</p>
                <h2>Customer directory</h2>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-panel">
                <h2>No customer records</h2>
                <p>Create the first customer for this workspace.</p>
              </div>
            ) : (
              <div
                className="table-wrap custom-scrollbar"
                style={{
                  maxHeight: 'calc(100vh - 280px)',
                  minHeight: '300px',
                  overflowY: 'auto',
                  overflowX: 'auto',
                  borderRadius: '6px',
                  border: '1px solid #edf1f1',
                }}
              >
                <table className="rich-table">
                  <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                    <tr>
                      <th style={{ background: '#ffffff' }}>Customer ID</th>
                      <th style={{ background: '#ffffff' }}>Customer Name</th>
                      <th style={{ background: '#ffffff' }}>Contact & Mobile</th>
                      <th style={{ background: '#ffffff' }}>Status</th>
                      <th style={{ background: '#ffffff', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((customer) => {
                      const initials = [customer.firstName?.[0], customer.lastName?.[0]]
                        .filter(Boolean)
                        .join('')
                        .toUpperCase() || (customer.firstName?.[0] ? customer.firstName[0].toUpperCase() : 'C');

                      return (
                        <tr key={customer._id}>
                          <td>
                            <span className="id-badge">
                              {customer.customerNumber}
                            </span>
                          </td>
                          <td>
                            <div className="entity-cell">
                              <div className="entity-avatar">
                                {initials}
                              </div>
                              <div>
                                <strong>
                                  {customer.firstName} {customer.lastName}
                                </strong>
                              </div>
                            </div>
                          </td>
                        <td>
                          <div>
                            {customer.phone ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: '#1e293b' }}>
                                <Phone size={12} style={{ color: '#0f766e' }} />
                                <span>{customer.phone}</span>
                              </div>
                            ) : null}
                            {customer.email ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#64748b', marginTop: customer.phone ? '2px' : '0' }}>
                                <Mail size={11} style={{ color: '#94a3b8' }} />
                                <span>{customer.email}</span>
                              </div>
                            ) : !customer.phone ? (
                              <span className="muted-cell">No contact provided</span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className={`status status-${customer.status.toLowerCase()}`}>
                            <i />
                            {customer.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            className="primary-button"
                            href={`/customers/${customer._id}`}
                            style={{
                              fontSize: '11.5px',
                              padding: '5px 12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              textDecoration: 'none',
                              fontWeight: 600,
                              boxShadow: '0 1px 2px rgba(15, 118, 110, 0.15)',
                            }}
                          >
                            <UserRound size={13} /> View profile
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {showForm && (
          <CustomerForm
            onClose={() => setShowForm(false)}
            onCreated={() => {
              setShowForm(false);
              void load();
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

function CustomerForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError('');
    try {
      await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          phone: form.get('phone') || undefined,
          email: form.get('email') || undefined,
          address: form.get('address') || undefined,
          notes: form.get('description') || undefined,
        }),
      });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">New record</p>
            <h2>Add customer</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={19} />
          </button>
        </div>
        <label>
          First name <span style={{ color: '#ef4444' }}>*</span>
          <input name="firstName" required />
        </label>
        <label>
          Last name <span style={{ color: '#ef4444' }}>*</span>
          <input name="lastName" required />
        </label>
        <label>
          Mobile / Phone number
          <input name="phone" type="tel" placeholder="e.g. +1 (555) 888-9900" />
        </label>
        <label>
          Email (optional)
          <input name="email" type="email" placeholder="e.g. user@example.com" />
        </label>
        <label>
          Address (optional)
          <input name="address" placeholder="e.g. 204 Highland Ave, Chicago" />
        </label>
        <label>
          Notes / Medical remarks (optional)
          <textarea
            name="description"
            rows={2}
            style={{
              background: '#fff',
              border: '1px solid #dce5e5',
              borderRadius: '5px',
              color: 'var(--ink)',
              fontSize: '12px',
              outline: 0,
              padding: '10px 12px',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving}>
            {saving ? <RefreshCw size={14} className="spin" /> : 'Create customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
