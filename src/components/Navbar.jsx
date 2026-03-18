import { useState, useEffect, useRef } from 'react'

export default function Navbar({ toggleModal, isLoggedIn, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const userDropdownRefDesktop = useRef(null)
  const userDropdownRefMobile = useRef(null)

  const closeMenu = () => setMenuOpen(false)

  useEffect(() => {
    function handleClickOutside(event) {
      const insideDesktop = userDropdownRefDesktop.current?.contains(event.target)
      const insideMobile = userDropdownRefMobile.current?.contains(event.target)
      if (!insideDesktop && !insideMobile) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    onLogout?.()
    setUserDropdownOpen(false)
  }

  return (
    <nav className="relative flex items-center justify-between px-4 sm:px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
      <span className="text-xl font-semibold text-slate-800 tracking-tight">
        GrađevinskiAsistent
      </span>

      {/* Desktop: links + button */}
      <div className="hidden md:flex items-center gap-4">
        <a
          href="#institucije"
          className="text-slate-600 hover:text-slate-800 font-medium transition-colors"
        >
          Institucije
        </a>
        {isLoggedIn ? (
          <div className="relative" ref={userDropdownRefDesktop}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-50 text-sky-800 font-medium hover:bg-sky-100 hover:text-sky-900 transition-colors border border-sky-200"
            >
              <svg className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="max-w-[160px] truncate">{localStorage.getItem('userEmail') || 'Prijavljen'}</span>
              <svg className={`h-4 w-4 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userDropdownOpen && (
              <div className="absolute right-0 mt-1 w-56 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm text-slate-500">Prijavljen kao</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{localStorage.getItem('userEmail')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Odjavi se
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleModal}
            className="px-5 py-2.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            Prijavi se
          </button>
        )}
      </div>

      {/* Mobile: hamburger + Prijavi se */}
      <div className="flex md:hidden items-center gap-2">
        {isLoggedIn ? (
          <div className="relative" ref={userDropdownRefMobile}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-50 text-sky-800 text-sm font-medium hover:bg-sky-100 border border-sky-200"
            >
              <svg className="h-4 w-4 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="max-w-[120px] truncate">{localStorage.getItem('userEmail') || 'Prijavljen'}</span>
              <svg className={`h-3.5 w-3.5 shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {userDropdownOpen && (
              <div className="absolute right-0 mt-1 w-48 rounded-lg bg-white shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Prijavljen kao</p>
                  <p className="text-sm font-medium text-slate-800 truncate">{localStorage.getItem('userEmail')}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Odjavi se
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={toggleModal}
            className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors shadow-sm"
          >
            Prijavi se
          </button>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          aria-label="Meni"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {menuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <>
          <button
            type="button"
            onClick={closeMenu}
            className="fixed inset-0 z-40 bg-black/20 md:hidden"
            aria-label="Zatvori meni"
          />
          <div className="absolute top-full left-0 right-0 md:hidden bg-white border-b border-slate-200 shadow-lg z-50">
            <div className="px-4 py-4 flex flex-col gap-2">
              <a
                href="#institucije"
                onClick={closeMenu}
                className="py-3 px-4 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Institucije
              </a>
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
