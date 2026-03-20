import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import { DEFAULT_OPSTINA, opstineSrbije } from './data/opstineSrbije.js'
import Roadmap from './components/Roadmap'
import KalkulatorAdministrativnihTroskova from './components/KalkulatorAdministrativnihTroskova'
import SavedCalculations from './components/SavedCalculations'
import Resources from './components/Resources'
import LoginModal from './components/LoginModal'

function App() {
  const [objectType, setObjectType] = useState('')
  const [workType, setWorkType] = useState('')
  const [municipality, setMunicipality] = useState(DEFAULT_OPSTINA)
  const [showRoadmap, setShowRoadmap] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true')
  const [calculationsRefreshTrigger, setCalculationsRefreshTrigger] = useState(0)

  const toggleModal = () => setIsModalOpen((prev) => !prev)

  const handleLoginSuccess = () => setIsLoggedIn(true)

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userEmail')
    setIsLoggedIn(false)
  }

  const handleStartPlanning = () => {
    setShowRoadmap(true)
  }

  const [pendingScrollToArchive, setPendingScrollToArchive] = useState(false)

  /** Opens roadmap/calculator/archive and scrolls to archive after the section mounts. */
  const handleGoToArchive = () => {
    setShowRoadmap(true)
    setPendingScrollToArchive(true)
  }

  useEffect(() => {
    if (!pendingScrollToArchive || !showRoadmap) return
    const timer = window.setTimeout(() => {
      document.getElementById('arhiva-proracuna')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      setPendingScrollToArchive(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [pendingScrollToArchive, showRoadmap])

  const handleReset = () => {
    setShowRoadmap(false)
    setObjectType('')
    setWorkType('')
    setMunicipality(DEFAULT_OPSTINA)
  }

  const selectFieldClasses =
    'w-full min-h-[48px] px-4 py-3 text-base rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow'

  return (
    <div className="min-h-screen">
      <Navbar toggleModal={toggleModal} isLoggedIn={isLoggedIn} onLogout={handleLogout} />
      {/* Hero: background image + overlay - no parent bg covering it */}
      <section className="relative px-4 sm:px-6 py-16 md:py-24 overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80&w=2000")`,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 z-[1] bg-white/70" aria-hidden />
        <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-slate-900 tracking-tight leading-tight mb-4">
            Dobrodošli u Vaš Građevinski Asistent
          </h1>
          <p className="text-lg md:text-xl text-slate-600 leading-relaxed">
            Vaš put od ideje do upotrebne dozvole — isplanirajte gradnju po zakonu, bez stresa i
            birokratije.
          </p>
        </div>

        <p className="text-center text-sm font-medium text-slate-500 uppercase tracking-wide mb-4">
          Prvi korak
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div>
            <label
              htmlFor="tip-objekta"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Tip objekta
            </label>
            <select
              id="tip-objekta"
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              className={selectFieldClasses}
            >
              <option value="">Izaberite...</option>
              <option value="Stambeni objekat">Stambeni objekat</option>
              <option value="Pomoćni objekat">Pomoćni objekat</option>
              <option value="Ekonomski objekat">Ekonomski objekat</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="vrsta-radova"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Vrsta radova
            </label>
            <select
              id="vrsta-radova"
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className={selectFieldClasses}
            >
              <option value="">Izaberite...</option>
              <option value="Nova gradnja">Nova gradnja</option>
              <option value="Rekonstrukcija/Dogradnja">Rekonstrukcija/Dogradnja</option>
              <option value="Adaptacija">Adaptacija</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="opstina"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Opština
            </label>
            <select
              id="opstina"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              className={selectFieldClasses}
              aria-label="Opština ili grad"
            >
              {opstineSrbije.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-10 md:mt-12 flex flex-col items-center gap-4 max-w-md mx-auto w-full px-1">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={handleGoToArchive}
              className="w-full sm:w-auto min-w-[min(100%,280px)] px-8 py-4 text-base sm:text-lg font-semibold rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
            >
              Idi na moju arhivu proračuna
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleStartPlanning}
                className="w-full sm:w-auto min-w-[min(100%,280px)] px-8 py-4 text-base sm:text-lg font-semibold rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
              >
                Pokreni novi projekat
              </button>
              <button
                type="button"
                onClick={toggleModal}
                className="text-base text-slate-700 hover:text-blue-700 font-medium underline underline-offset-4 decoration-slate-300 hover:decoration-blue-400 transition-colors py-2 px-2"
              >
                Uloguj se da vidiš tvoje projekte
              </button>
            </>
          )}
        </div>
        </div>
      </section>

      <div className="bg-gradient-to-b from-white to-sky-50">
        <Resources />

      {showRoadmap && (
        <>
          <Roadmap onReset={handleReset} />
          <KalkulatorAdministrativnihTroskova
            isLoggedIn={isLoggedIn}
            objectType={objectType}
            workType={workType}
            municipality={municipality}
            onCalculationSaved={() => setCalculationsRefreshTrigger((p) => p + 1)}
          />
          <SavedCalculations isLoggedIn={isLoggedIn} refreshTrigger={calculationsRefreshTrigger} />
        </>
      )}
      </div>

      {isModalOpen && <LoginModal onClose={toggleModal} onLoginSuccess={handleLoginSuccess} />}
    </div>
  )
}

export default App
