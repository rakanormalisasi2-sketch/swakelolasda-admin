'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import styles from './login.module.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user, profile, loading, login } = useAuth();

  // If already logged in, redirect to appropriate dashboard
  useEffect(() => {
    if (loading) return;
    if (user && profile?.role) {
      redirectByRole(profile.role);
    }
  }, [user, profile, loading]);

  function redirectByRole(role) {
    if (role === 'superadmin') router.replace('/dashboard/superadmin');
    else if (role === 'peralatan') router.replace('/dashboard/peralatan');
    else if (role === 'seksi_normalisasi' || role === 'seksi_embung') router.replace('/dashboard/seksi');
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const loginEmail = username.includes('@') ? username : `${username.toLowerCase().trim()}@swakelolasda.com`;

    try {
      // login() from AuthContext: sets user+profile in state BEFORE we navigate
      const role = await login(loginEmail, password);

      if (role === 'superadmin' || role === 'peralatan' || role === 'seksi_normalisasi' || role === 'seksi_embung') {
        redirectByRole(role);
      } else {
        setError('Akun Anda tidak memiliki akses ke panel admin web.');
        setBusy(false);
      }
    } catch (err) {
      setError('Username atau password salah. Hubungi Superadmin jika Anda belum memiliki akun.');
      setBusy(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginLeft}>
        <div className={styles.loginBrand}>
          <div className={styles.loginLogo}>
            <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
            </svg>
          </div>
          <div>
            <h2>SWAKELOLASDA</h2>
            <p>Dinas PU Kabupaten Bojonegoro</p>
          </div>
        </div>
        <h1 className={styles.loginHeadline}>Sistem Swakelola<br />Sumber Daya Air</h1>
        <p className={styles.loginDesc}>Pantau posisi operator, ketersediaan alat berat, dan laporan pelaksanaan pekerjaan secara terpusat dan real-time.</p>
        <div className={styles.featureList}>
          {[
            ['Manajemen Alat Berat & Status Real-time', 'M'],
            ['Penugasan & Rekrutmen Operator Lapangan', 'P'],
            ['Laporan Pelaksanaan Otomatis ke Google Sheets', 'L'],
            ['Perencanaan dan Rekapitulasi Proposal', 'R'],
          ].map(([label, ico]) => (
            <div key={label} className={styles.featureItem}>
              <div className={styles.featureIcon}>{ico}</div>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.loginRight}>
        <div className={styles.loginCard}>
          <h2 className={styles.loginCardTitle}>Masuk ke Sistem</h2>
          <p className={styles.loginCardSubtitle}>Gunakan username dan password yang diberikan oleh admin.</p>

          {error && (
            <div className="alert alert-danger">
              <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username" type="text" className="form-control"
                placeholder="Masukkan username"
                value={username} onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password" type="password" className="form-control"
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit" className="btn btn-primary w-full"
              style={{ justifyContent: 'center', padding: '11px 16px', fontSize: '14px', marginTop: '4px' }}
              disabled={busy}
            >
              {busy ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <p className={styles.loginNote}>
            Lupa password atau belum memiliki akun? Hubungi <strong>Superadmin</strong> untuk pengaturan.
          </p>
        </div>
      </div>
    </div>
  );
}
