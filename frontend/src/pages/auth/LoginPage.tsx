import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { ShieldCheck, Loader2, Mail, Lock, Wrench, Users } from 'lucide-react'
import { useLogin } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'

interface FormData {
  email: string
  password: string
}

const FEATURES = [
  { icon: ShieldCheck, title: 'Asset registry', subtitle: 'Full lifecycle tracking' },
  { icon: Wrench, title: 'Maintenance scheduling', subtitle: 'Stay ahead of upkeep' },
  { icon: Users, title: 'Role-based access', subtitle: 'COO, HR, IT & Maintenance' },
]

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore()
  const login = useLogin()
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>()

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#fdfeff' }}>
      <style>{`
        @keyframes hamsLoginDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(8px, -10px) scale(1.03); }
        }
        @keyframes hamsLoginPulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.15); }
        }
        @keyframes hamsLoginIconPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(255,255,255,0.06); }
        }
        .hams-login-ring { animation: hamsLoginDrift 14s ease-in-out infinite; }
        .hams-login-glow { animation: hamsLoginPulseGlow 6s ease-in-out infinite; }
        .hams-login-feature-icon { animation: hamsLoginIconPulse 4s ease-in-out infinite; }
      `}</style>

      {/* ── Left panel: brand story ─────────────────────────── */}
      <div style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #1d7d99 0%, #0f4c5c 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px',
        minHeight: '100vh',
      }}>
        {/* Decorative rings */}
        <div className="hams-login-ring" style={{
          position: 'absolute', width: '320px', height: '320px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)', top: '-120px', left: '-100px',
        }} />
        <div className="hams-login-ring" style={{
          position: 'absolute', width: '220px', height: '220px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)', bottom: '-80px', right: '-60px', animationDelay: '3s',
        }} />
        <div className="hams-login-ring" style={{
          position: 'absolute', width: '420px', height: '420px', borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)', opacity: 0.5,
          top: '50%', left: '50%', margin: '-210px 0 0 -210px', animationDelay: '6s',
        }} />
        {/* Soft glows */}
        <div className="hams-login-glow" style={{
          position: 'absolute', width: '260px', height: '260px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', filter: 'blur(40px)', top: '10%', right: '10%',
        }} />
        <div className="hams-login-glow" style={{
          position: 'absolute', width: '260px', height: '260px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)', filter: 'blur(40px)', bottom: '8%', left: '6%', animationDelay: '3s',
        }} />

        {/* Brand */}
        <div style={{
          position: 'absolute', top: '40px', left: '48px', zIndex: 1,
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={17} color="white" />
          </div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>HAMS</span>
        </div>

        {/* Hero copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ color: 'white', fontSize: '27px', fontWeight: 700, lineHeight: 1.35, marginBottom: '12px' }}>
            Hospital asset<br />management,<br />simplified.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', lineHeight: 1.6, maxWidth: '320px' }}>
            Track, assign, and maintain every IT and facility asset across Cutis Hospital from one place.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '32px' }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  className="hams-login-feature-icon"
                  style={{
                    width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0,
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animationDelay: `${i * 1.3}s`,
                  }}
                >
                  <f.icon size={15} color="white" />
                </div>
                <div>
                  <p style={{ color: 'white', fontSize: '12.5px', fontWeight: 600, margin: 0 }}>{f.title}</p>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11.5px', margin: 0 }}>{f.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: sign-in form ───────────────────────── */}
      <div style={{
        width: '420px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px', background: '#fdfeff',
      }}>
        <div style={{ width: '100%', maxWidth: '300px' }}>
          <h2 style={{ color: '#173b46', fontSize: '21px', fontWeight: 700, marginBottom: '5px' }}>Sign in</h2>
          <p style={{ color: '#6f8d96', fontSize: '13px', marginBottom: '26px' }}>
            Welcome back — enter your details
          </p>

          <form onSubmit={handleSubmit((d) => login.mutate(d))}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#3d5a64', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '6px', display: 'block' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: '#8fa9b1', pointerEvents: 'none',
                }} />
                <input
                  {...register('email', { required: 'Email is required' })}
                  type="email"
                  placeholder="you@hospital.com"
                  autoComplete="email"
                  style={{
                    width: '100%', padding: '11.5px 14px 11.5px 38px', borderRadius: '10px',
                    background: '#f4fafb', border: '1.5px solid #dcebee',
                    color: '#173b46', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1d7d99'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,125,153,0.12)'
                    e.currentTarget.style.background = '#fff'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#dcebee'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.background = '#f4fafb'
                  }}
                />
              </div>
              {errors.email && (
                <p style={{ color: '#ea0606', fontSize: '11px', marginTop: '4px' }}>{errors.email.message}</p>
              )}
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{ color: '#3d5a64', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.02em', marginBottom: '6px', display: 'block' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{
                  position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
                  color: '#8fa9b1', pointerEvents: 'none',
                }} />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '11.5px 14px 11.5px 38px', borderRadius: '10px',
                    background: '#f4fafb', border: '1.5px solid #dcebee',
                    color: '#173b46', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                    transition: 'all 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1d7d99'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,125,153,0.12)'
                    e.currentTarget.style.background = '#fff'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#dcebee'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.background = '#f4fafb'
                  }}
                />
              </div>
              {errors.password && (
                <p style={{ color: '#ea0606', fontSize: '11px', marginTop: '4px' }}>{errors.password.message}</p>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0 18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6f8d96', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '13px', height: '13px', accentColor: '#1d7d99' }} />
                Remember me
              </label>
              <a href="#" style={{ fontSize: '12px', color: '#1d7d99', fontWeight: 600, textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>

            {login.isError && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '18px',
                background: '#fde7e7', color: '#cf2020', fontSize: '13px',
              }}>
                Invalid credentials. Please try again.
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(155deg, #1d7d99 0%, #0f4c5c 100%)',
                color: 'white', fontSize: '13.5px', fontWeight: 700, letterSpacing: '0.01em',
                cursor: login.isPending ? 'default' : 'pointer',
                opacity: login.isPending ? 0.85 : 1,
                boxShadow: '0 10px 24px rgba(15,76,92,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'transform 0.15s, box-shadow 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                if (login.isPending) return
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(15,76,92,0.38)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,76,92,0.3)'
              }}
            >
              {login.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#7f9aa2', fontSize: '12px', marginTop: '20px' }}>
            Need help? <a href="#" style={{ color: '#1d7d99', fontWeight: 600, textDecoration: 'none' }}>Contact IT support</a>
          </p>
        </div>
      </div>
    </div>
  )
}