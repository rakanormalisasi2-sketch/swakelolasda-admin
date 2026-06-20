'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import TabRekapitulasi from './components/TabRekapitulasi';
import TabPrioritas from './components/TabPrioritas';
import TabSchedule from './components/TabSchedule';

const TABS = [
  { key: 'rekap', label: 'Rekapitulasi Proposal', icon: '📋' },
  { key: 'prioritas', label: 'Rencana Prioritas', icon: '📊' },
  { key: 'schedule', label: 'Schedule Pekerjaan', icon: '📅' },
];

export default function ProposalPage() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('rekap');
  const [tahun, setTahun] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);

  return (
    <>
      <div className="header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="header-title">Perencanaan Proposal Masuk</div>
          <div className="header-subtitle">
            {profile?.role === 'seksi_embung' ? 'Seksi Embung' : 'Seksi Normalisasi'} — Tahun Anggaran {tahun}
          </div>
        </div>
        <div className="header-right">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>TAHUN</label>
            <select
              value={tahun}
              onChange={e => setTahun(Number(e.target.value))}
              className="form-control"
              style={{ width: 100, padding: '6px 10px', fontWeight: 600 }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Tab Navigation */}
        <div className="tabs" style={{ marginBottom: 0, borderBottom: '2px solid var(--border)', background: 'var(--bg-card)', borderRadius: '10px 10px 0 0', padding: '0 8px' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span style={{ fontSize: 15 }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 10px 10px', minHeight: 400 }}>
          {activeTab === 'rekap' && <TabRekapitulasi tahun={tahun} role={profile?.role} />}
          {activeTab === 'prioritas' && <TabPrioritas tahun={tahun} role={profile?.role} />}
          {activeTab === 'schedule' && <TabSchedule tahun={tahun} role={profile?.role} />}
        </div>
      </div>
    </>
  );
}
