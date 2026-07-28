import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, checkSession, getProfile, login, logout, updateProfile } from './api/client'
import type { Profile, ProfileUpdate } from './api/types'
import './App.css'

function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)

  const [showLogin, setShowLogin] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  const [draft, setDraft] = useState<ProfileUpdate | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    getProfile()
      .then((data) => setProfile(data.profile))
      .catch((e: Error) => setError(e.message))
    checkSession()
      .then((data) => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  useEffect(() => {
    if (authenticated && profile) {
      setDraft({ full_name: profile.full_name, headline: profile.headline, summary: profile.summary })
    } else {
      setDraft(null)
    }
    // profile 은 저장 성공 시에만 바뀌는데, 그때는 draft 를 새로 덮어쓰지 않는다.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated])

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setLoginError(null)
    try {
      await login(passcode)
      setAuthenticated(true)
      setShowLogin(false)
      setPasscode('')
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : '로그인에 실패했습니다.')
    }
  }

  async function handleLogout() {
    await logout().catch(() => {})
    setAuthenticated(false)
    setShowLogin(false)
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setSaveError(null)
    try {
      const data = await updateProfile(draft)
      setProfile(data.profile)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAuthenticated(false)
        setShowLogin(true)
        setSaveError('세션이 만료되었습니다. 다시 로그인해 주세요.')
      } else {
        setSaveError(e instanceof Error ? e.message : '저장에 실패했습니다.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return (
      <main className="cv">
        <p className="state error">불러오지 못했습니다 — {error}</p>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="cv">
        <p className="state">불러오는 중...</p>
      </main>
    )
  }

  if (authenticated && draft) {
    return (
      <main className="cv">
        <header className="cv-header">
          <input
            className="editable title"
            value={draft.full_name}
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
          />
          <input
            className="editable headline"
            value={draft.headline}
            maxLength={200}
            onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
          />
          <textarea
            className="editable summary"
            value={draft.summary ?? ''}
            maxLength={2000}
            onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
          />
        </header>

        {saveError && <p className="state error">{saveError}</p>}

        <footer className="cv-footer edit-actions">
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button type="button" onClick={handleLogout}>
            로그아웃
          </button>
        </footer>
      </main>
    )
  }

  return (
    <main className="cv">
      <header className="cv-header">
        <h1>{profile.full_name}</h1>
        <p className="headline">{profile.headline}</p>
        {profile.summary && <p className="summary">{profile.summary}</p>}
      </header>

      <footer className="cv-footer">
        <span>
          마지막 수정{' '}
          {new Date(profile.updated_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>
        <button type="button" className="link" onClick={() => setShowLogin((v) => !v)}>
          관리자 로그인
        </button>
      </footer>

      {saveError && <p className="state error">{saveError}</p>}

      {showLogin && (
        <form className="login" onSubmit={handleLogin}>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="비밀코드"
          />
          <button type="submit">로그인</button>
          {loginError && <p className="state error">{loginError}</p>}
        </form>
      )}
    </main>
  )
}

export default App
