'use client';

import { Mail, Phone, Plus, Radio, RefreshCw, Search, SlidersHorizontal, UserRound, X } from 'lucide-react';
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
  attachedSensorSerial?: string;
  attachedSensorSerials?: string[];
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
        `${customer.firstName} ${customer.lastName} ${customer.customerNumber} ${customer.attachedSensorSerial ?? ''} ${customer.phone ?? ''} ${
          customer.email ?? ''
        } ${customer.address ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [customers, query]
  );

  const topbarRight = (
    <button className="primary-button" onClick={() => setShowForm(true)}>
      <Plus size={17} /> Add customer
    </button>
  );

  return (
    <AppShell headerActions={topbarRight}>
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
              <div className="panel-title-wrap">
                <p className="eyebrow">All records</p>
                <h2>Customer directory</h2>
              </div>
              <div className="panel-toolbar">
                <div className="search-field" style={{ width: '320px', maxWidth: '100%' }}>
                  <Search size={16} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by customer name, ID, phone, or email"
                  />
                </div>
                <div className="panel-toolbar-actions">
                  <button className="filter-button" type="button">
                    <SlidersHorizontal size={15} /> Filter
                  </button>
                  <span className="result-count">{filtered.length} customers</span>
                </div>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-panel">
                <h2>No customer records</h2>
                <p>Create the first customer for this workspace.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="desktop-table-view">
                  <div className="table-wrap custom-scrollbar" style={{ border: '1px solid #edf1f1', borderRadius: '6px' }}>
                  <table className="rich-table">
                    <thead style={{ position: 'sticky', top: 0, background: '#ffffff', zIndex: 3, boxShadow: '0 1px 0 #edf1f1' }}>
                      <tr>
                        <th style={{ background: '#ffffff' }}>Customer ID</th>
                        <th style={{ background: '#ffffff' }}>Customer Name</th>
                        <th style={{ background: '#ffffff' }}>Contact & Mobile</th>
                        <th style={{ background: '#ffffff' }}>Attached Sensor</th>
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
                              {customer.attachedSensorSerial ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span
                                    style={{
                                      fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                      fontWeight: 600,
                                      fontSize: '12px',
                                      color: '#0f766e',
                                      background: '#f0fdf4',
                                      padding: '3px 8px',
                                      borderRadius: '5px',
                                      border: '1px solid #bbf7d0',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                    }}
                                  >
                                    <Radio size={12} style={{ color: '#0f766e' }} />
                                    {customer.attachedSensorSerial}
                                  </span>
                                  {customer.attachedSensorSerials && customer.attachedSensorSerials.length > 1 && (
                                    <span
                                      style={{
                                        fontSize: '10.5px',
                                        color: '#64748b',
                                        background: '#f1f5f9',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      +{customer.attachedSensorSerials.length - 1} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="muted-cell" style={{ fontStyle: 'italic', fontSize: '12px' }}>
                                  No sensor attached
                                </span>
                              )}
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
              </div>

              {/* Mobile Cards View */}
              <div className="mobile-cards-view">
                {filtered.map((customer) => {
                  const initials = [customer.firstName?.[0], customer.lastName?.[0]]
                    .filter(Boolean)
                    .join('')
                    .toUpperCase() || (customer.firstName?.[0] ? customer.firstName[0].toUpperCase() : 'C');

                  return (
                    <article className="mobile-card" key={`mobile-cust-${customer._id}`}>
                      <div className="mobile-card-header">
                        <div className="mobile-card-title">
                          <div className="entity-avatar" style={{ width: '28px', height: '28px', fontSize: '10px' }}>
                            {initials}
                          </div>
                          <span>{customer.firstName} {customer.lastName}</span>
                        </div>
                        <span className="id-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                          {customer.customerNumber}
                        </span>
                      </div>

                      <div className="mobile-card-body">
                        <div className="mobile-card-field full-width">
                          <span className="mobile-card-field-label">Contact Info</span>
                          <span className="mobile-card-field-value">
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
                              <span className="muted-cell" style={{ fontSize: '12px' }}>No contact provided</span>
                            ) : null}
                          </span>
                        </div>

                        <div className="mobile-card-field full-width">
                          <span className="mobile-card-field-label">Attached Sensor</span>
                          <span className="mobile-card-field-value">
                            {customer.attachedSensorSerial ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span
                                  style={{
                                    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                    fontWeight: 600,
                                    fontSize: '11.5px',
                                    color: '#0f766e',
                                    background: '#f0fdf4',
                                    padding: '2px 6px',
                                    borderRadius: '5px',
                                    border: '1px solid #bbf7d0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Radio size={11} style={{ color: '#0f766e' }} />
                                  {customer.attachedSensorSerial}
                                </span>
                                {customer.attachedSensorSerials && customer.attachedSensorSerials.length > 1 && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      color: '#64748b',
                                      background: '#f1f5f9',
                                      padding: '2px 5px',
                                      borderRadius: '4px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    +{customer.attachedSensorSerials.length - 1} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="muted-cell" style={{ fontStyle: 'italic', fontSize: '12px' }}>
                                No sensor attached
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="mobile-card-actions">
                        <Link
                          className="primary-button"
                          href={`/customers/${customer._id}`}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <UserRound size={13} /> View Customer Profile
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
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
          <span>First name <span style={{ color: '#ef4444' }}>*</span></span>
          <input name="firstName" required />
        </label>
        <label>
          <span>Last name <span style={{ color: '#ef4444' }}>*</span></span>
          <input name="lastName" required />
        </label>
        <label>
          <span>Mobile / Phone number</span>
          <input name="phone" type="tel" />
        </label>
        <label>
          <span>Email (optional)</span>
          <input name="email" type="email" />
        </label>
        <label>
          <span>Address (optional)</span>
          <input name="address" />
        </label>
        <label>
          <span>Notes / Medical remarks (optional)</span>
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
