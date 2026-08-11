'use client';

import { Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '../components/app-shell';

const initialCustomers = [
  { id: 'CUS-10482', name: 'Mara Ellison', contact: 'mara.ellison@example.com', devices: 2, updated: 'Today, 09:42', status: 'Active' },
  { id: 'CUS-10477', name: 'Jon Bell', contact: 'jon.bell@example.com', devices: 1, updated: 'Yesterday', status: 'Active' },
  { id: 'CUS-10465', name: 'Riverside Care', contact: 'ops@riversidecare.org', devices: 8, updated: 'Aug 08, 2026', status: 'Active' },
  { id: 'CUS-10421', name: 'Northstar Clinic', contact: 'admin@northstarclinic.org', devices: 14, updated: 'Aug 05, 2026', status: 'Inactive' },
  { id: 'CUS-10398', name: 'Elena Park', contact: 'elena.park@example.com', devices: 1, updated: 'Aug 01, 2026', status: 'Archived' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const filtered = useMemo(() => customers.filter((customer) => `${customer.name} ${customer.id} ${customer.contact}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const addCustomer = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!name.trim()) return; setCustomers([{ id: `CUS-${10500 + customers.length}`, name: name.trim(), contact: 'Pending contact', devices: 0, updated: 'Just now', status: 'Active' }, ...customers]); setName(''); setShowForm(false); };

  return <AppShell><div className="page-content"><section className="page-heading"><div><p className="eyebrow">Customer directory</p><h1>Customers</h1><p className="heading-copy">Manage people and organizations receiving sensor care.</p></div><button className="primary-button" onClick={() => setShowForm(true)}><Plus size={17} /> Add customer</button></section>
    <section className="toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers or IDs" /></div><button className="filter-button"><SlidersHorizontal size={16} /> Filters <span>2</span></button><span className="result-count">{filtered.length} of {customers.length} customers</span></section>
    <section className="panel"><div className="panel-heading"><div><p className="eyebrow">All records</p><h2>Customer directory</h2></div><button className="icon-button" aria-label="Customer table options">•••</button></div><div className="table-wrap"><table className="rich-table"><thead><tr><th>Customer</th><th>Contact</th><th>Assigned sensors</th><th>Last updated</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((customer) => <tr key={customer.id}><td><div className="entity-cell"><div className="entity-avatar">{customer.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</div><div><strong>{customer.name}</strong><span>{customer.id}</span></div></div></td><td className="muted-cell">{customer.contact}</td><td>{customer.devices} {customer.devices === 1 ? 'sensor' : 'sensors'}</td><td className="muted-cell">{customer.updated}</td><td><span className={`status status-${customer.status.toLowerCase()}`}><i />{customer.status}</span></td><td><Link className="row-link" href={`/customers/${customer.id}`}>Open</Link></td></tr>)}</tbody></table></div></section>
    {showForm && <div className="modal-backdrop"><form className="modal-card" onSubmit={addCustomer}><div className="modal-heading"><div><p className="eyebrow">New record</p><h2>Add customer</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close dialog"><X size={19} /></button></div><label>Full name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Taylor Morgan" required /></label><label>Contact email<input type="email" placeholder="name@organization.com" /></label><div className="modal-actions"><button type="button" className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button">Create customer</button></div></form></div>}
  </div></AppShell>;
}
