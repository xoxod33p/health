'use client';

import { Plus, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/app-shell';
import { apiFetch } from '../../lib/api';
import { connectRealtime } from '../../lib/realtime';

type Customer = { _id: string; customerNumber: string; firstName: string; lastName: string; email?: string; status: string };
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
        `${customer.firstName} ${customer.lastName} ${customer.customerNumber} ${customer.email ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [customers, query]
  );

  const topbarActions = (
    <div className="topbar-actions-wrap">
      <div className="search-field">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customers or IDs"
        />
      </div>
      <button className="filter-button">
        <SlidersHorizontal size={16} /> Filters
      </button>
      <span className="result-count">{filtered.length} loaded</span>
      <button className="primary-button" onClick={() => setShowForm(true)}>
        <Plus size={17} /> Add customer
      </button>
    </div>
  );

  return (
    <AppShell headerActions={topbarActions}>
      <div className="page-content">
        {loading && (
          <div className="data-loading">
            <RefreshCw size={18} className="spin" />
            Loading customers...
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
              <div className="table-wrap">
                <table className="rich-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((customer) => (
                      <tr key={customer._id}>
                        <td>
                          <div className="entity-cell">
                            <div className="entity-avatar">
                              {customer.firstName[0]}
                              {customer.lastName[0]}
                            </div>
                            <div>
                              <strong>
                                {customer.firstName} {customer.lastName}
                              </strong>
                              <span>{customer.customerNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="muted-cell">{customer.email ?? 'No email'}</td>
                        <td>
                          <span className={`status status-${customer.status.toLowerCase()}`}>
                            <i />
                            {customer.status}
                          </span>
                        </td>
                        <td>
                          <Link className="row-link" href={`/customers/${customer._id}`}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))}
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
          customerNumber: form.get('customerNumber'),
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          email: form.get('email') || undefined,
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
          Customer number
          <input name="customerNumber" placeholder="CUS-10500" required />
        </label>
        <label>
          First name
          <input name="firstName" required />
        </label>
        <label>
          Last name
          <input name="lastName" required />
        </label>
        <label>
          Email
          <input name="email" type="email" />
        </label>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" disabled={saving}>
            {saving ? 'Creating...' : 'Create customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
