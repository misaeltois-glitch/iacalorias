import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Camera, Check, Eye, EyeOff, LogOut, Trash2, User, Lock, Activity, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from '@/hooks/use-session';

const ACCENT = '#0D9F6E';
const BASE = import.meta.env.BASE_URL ?? '/';
const AUTH_TOKEN_KEY = 'ia-calorias-auth-token';

function authHeaders(): HeadersInit {
  const t = localStorage.getItem(AUTH_TOKEN_KEY);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function resizeImageToBase64(file: File, maxDim = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface ProfileData {
  name: string;
  avatarUrl: string;
  weight: string;
  height: string;
  age: string;
  sex: string;
  objective: string;
}

const OBJECTIVES = [
  { value: 'lose', label: 'Perder peso' },
  { value: 'maintain', label: 'Manter peso' },
  { value: 'gain', label: 'Ganhar massa' },
];

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, logout, updateLocalUser } = useAuth();
  const { sessionId } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [profile, setProfile] = useState<ProfileData>({
    name: '', avatarUrl: '', weight: '', height: '', age: '', sex: '', objective: '',
  });

  const [passSection, setPassSection] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetch(`${BASE}api/user/profile?sessionId=${sessionId}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setProfile({
          name: d.name ?? '',
          avatarUrl: d.avatarUrl ?? '',
          weight: d.biometrics?.weight?.toString() ?? '',
          height: d.biometrics?.height?.toString() ?? '',
          age: d.biometrics?.age?.toString() ?? '',
          sex: d.biometrics?.sex ?? '',
          objective: d.biometrics?.objective ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImageToBase64(file);
      setProfile(p => ({ ...p, avatarUrl: base64 }));
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(''); setSaveOk(false);
    try {
      const body: Record<string, any> = {
        name: profile.name,
        avatarUrl: profile.avatarUrl || null,
        sessionId,
      };
      if (profile.weight) body.weight = parseFloat(profile.weight);
      if (profile.height) body.height = parseFloat(profile.height);
      if (profile.age) body.age = parseInt(profile.age);
      if (profile.sex) body.sex = profile.sex;
      if (profile.objective) body.objective = profile.objective;

      const r = await fetch(`${BASE}api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Erro ao salvar');
      updateLocalUser({ name: d.name, avatarUrl: d.avatarUrl });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally { setSaving(false); }
  };

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErr(''); setPassMsg('');
    if (newPass !== confirmPass) { setPassErr('As senhas não coincidem.'); return; }
    setPassLoading(true);
    try {
      const r = await fetch(`${BASE}api/user/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || 'Erro ao alterar senha');
      setPassMsg('Senha alterada com sucesso!');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      setPassErr(err.message);
    } finally { setPassLoading(false); }
  };

  const handleDeleteData = async () => {
    try {
      await fetch(`${BASE}api/user/data`, { method: 'DELETE', headers: authHeaders() });
    } catch {}
    await logout();
    navigate('/');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: '10px',
    background: 'var(--bg-2)', color: 'var(--text-1)',
    border: '1.5px solid var(--border-strong)',
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const initials = (profile.name || user?.email || '?').slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <Loader2 size={32} color={ACCENT} style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', fontFamily: "'Plus Jakarta Sans', sans-serif", paddingBottom: '40px' }}>
      {/* ── APP BAR ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg)', borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-1)', fontSize: '15px', fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
          <ArrowLeft size={20} /> Voltar
        </button>
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-1)' }}>Meu Perfil</span>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            background: saveOk ? 'rgba(13,159,110,0.12)' : `linear-gradient(135deg, ${ACCENT}, #057A55)`,
            color: saveOk ? ACCENT : '#fff', fontSize: '14px', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}
        >
          {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : saveOk ? <Check size={14} /> : null}
          {saving ? 'Salvando...' : saveOk ? 'Salvo!' : 'Salvar'}
        </button>
      </div>

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '24px 16px 0' }}>

        {/* ── AVATAR SECTION ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '96px', height: '96px', borderRadius: '50%',
              background: profile.avatarUrl ? 'transparent' : `linear-gradient(135deg, ${ACCENT}, #057A55)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '36px', fontWeight: 800, color: '#fff',
              overflow: 'hidden', flexShrink: 0,
              boxShadow: '0 4px 20px rgba(13,159,110,0.25)',
            }}>
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{initials}</span>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '30px', height: '30px', borderRadius: '50%',
                background: ACCENT, border: '2px solid var(--bg)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Camera size={14} color="#fff" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)' }}>
              {profile.name || user?.email?.split('@')[0] || 'Usuário'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>{user?.email}</div>
          </div>
        </div>

        {saveError && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
            {saveError}
          </div>
        )}

        {/* ── SECTION: DADOS PESSOAIS ── */}
        <Section icon={<User size={16} />} title="Dados Pessoais">
          <Field label="Nome">
            <input
              type="text" value={profile.name}
              onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
              placeholder="Como você quer ser chamado?"
              style={inputStyle}
            />
          </Field>
          <Field label="Email">
            <input type="email" value={user?.email ?? ''} readOnly style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
          </Field>
        </Section>

        {/* ── SECTION: DADOS FÍSICOS ── */}
        <Section icon={<Activity size={16} />} title="Dados Físicos">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Peso (kg)">
              <input type="number" min="30" max="300" step="0.1" value={profile.weight} onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))} placeholder="70" style={inputStyle} />
            </Field>
            <Field label="Altura (cm)">
              <input type="number" min="100" max="250" value={profile.height} onChange={e => setProfile(p => ({ ...p, height: e.target.value }))} placeholder="170" style={inputStyle} />
            </Field>
            <Field label="Idade">
              <input type="number" min="10" max="120" value={profile.age} onChange={e => setProfile(p => ({ ...p, age: e.target.value }))} placeholder="30" style={inputStyle} />
            </Field>
            <Field label="Sexo">
              <select value={profile.sex} onChange={e => setProfile(p => ({ ...p, sex: e.target.value }))} style={{ ...inputStyle, appearance: 'none' }}>
                <option value="">Selecione</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </Field>
          </div>
          <Field label="Objetivo">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {OBJECTIVES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setProfile(p => ({ ...p, objective: o.value }))}
                  style={{
                    padding: '9px 16px', borderRadius: '10px', border: `2px solid ${profile.objective === o.value ? ACCENT : 'var(--border)'}`,
                    background: profile.objective === o.value ? 'rgba(13,159,110,0.1)' : 'var(--bg-2)',
                    color: profile.objective === o.value ? ACCENT : 'var(--text-2)',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* ── SECTION: SEGURANÇA ── */}
        <Section icon={<Lock size={16} />} title="Segurança">
          <button
            type="button"
            onClick={() => setPassSection(v => !v)}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              background: 'var(--bg-2)', border: '1.5px solid var(--border)',
              color: 'var(--text-1)', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            Alterar senha
            <span style={{ fontSize: '18px', color: 'var(--text-3)', lineHeight: 1, transform: passSection ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>+</span>
          </button>

          {passSection && (
            <form onSubmit={handleChangePass} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
              {passErr && <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.09)', color: '#f87171', fontSize: '13px' }}>{passErr}</div>}
              {passMsg && <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(13,159,110,0.09)', color: ACCENT, fontSize: '13px' }}>{passMsg}</div>}
              <Field label="Senha atual">
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} value={currentPass} onChange={e => setCurrentPass(e.target.value)} placeholder="••••••••" required style={{ ...inputStyle, paddingRight: '44px' }} />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', padding: 0 }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="Nova senha">
                <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 6 caracteres" required style={inputStyle} />
              </Field>
              <Field label="Confirmar nova senha">
                <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" required style={inputStyle} />
              </Field>
              <button type="submit" disabled={passLoading} style={{
                padding: '12px', borderRadius: '10px', border: 'none', background: ACCENT, color: '#fff',
                fontSize: '14px', fontWeight: 700, cursor: passLoading ? 'not-allowed' : 'pointer',
                opacity: passLoading ? 0.7 : 1, fontFamily: 'inherit',
              }}>
                {passLoading ? 'Alterando...' : 'Confirmar nova senha'}
              </button>
            </form>
          )}
        </Section>

        {/* ── SECTION: CONTA ── */}
        <Section icon={<AlertTriangle size={16} />} title="Conta" accent="rgba(239,68,68,0.12)" borderColor="rgba(239,68,68,0.2)">
          <button
            onClick={async () => { await logout(); navigate('/'); }}
            style={{
              width: '100%', padding: '13px 14px', borderRadius: '10px',
              background: 'var(--bg-2)', border: '1.5px solid var(--border)',
              color: 'var(--text-1)', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit',
            }}
          >
            <LogOut size={16} color="var(--text-2)" /> Sair da conta
          </button>

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              style={{
                width: '100%', padding: '13px 14px', borderRadius: '10px',
                background: 'rgba(239,68,68,0.07)', border: '1.5px solid rgba(239,68,68,0.2)',
                color: '#f87171', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'inherit',
              }}
            >
              <Trash2 size={16} /> Apagar meus dados
            </button>
          ) : (
            <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <p style={{ fontSize: '14px', color: '#f87171', margin: '0 0 12px', fontWeight: 600 }}>⚠️ Esta ação é permanente</p>
              <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Todos os seus dados serão apagados: análises, histórico e configurações. Sua conta também será encerrada.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDeleteConfirm(false)} style={{ flex: 1, padding: '11px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-1)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={handleDeleteData} style={{ flex: 1, padding: '11px', borderRadius: '9px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Confirmar exclusão
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Section({ icon, title, children, accent, borderColor }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  accent?: string;
  borderColor?: string;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <div style={{ color: ACCENT }}>{icon}</div>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      <div style={{
        background: accent ?? 'var(--bg-2)',
        border: `1px solid ${borderColor ?? 'var(--border)'}`,
        borderRadius: '16px', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-3)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</label>
      {children}
    </div>
  );
}
