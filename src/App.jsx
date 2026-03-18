import { useState } from 'react'
import Navbar from './components/Navbar'
import Roadmap from './components/Roadmap'
import KalkulatorAdministrativnihTroskova from './components/KalkulatorAdministrativnihTroskova'
import SavedCalculations from './components/SavedCalculations'
import Resources from './components/Resources'
import LoginModal from './components/LoginModal'

function App() {
  const [objectType, setObjectType] = useState('')
  const [workType, setWorkType] = useState('')
  const [municipality, setMunicipality] = useState('')
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

  const handleReset = () => {
    setShowRoadmap(false)
    setObjectType('')
    setWorkType('')
    setMunicipality('')
  }

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
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-slate-800 text-center mb-4">
          Vaš put od ideje do upotrebne dozvole
        </h1>
        <p className="text-lg md:text-xl text-slate-600 text-center mb-12">
          Isplanirajte gradnju po zakonu, bez stresa i birokratije.
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
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
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
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
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
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-shadow"
            >
              <option value="">Izaberite...</option>
              <option value="Brus">Brus</option>
              <option value="Kruševac">Kruševac</option>
              <option value="Beograd - Stari Grad">Beograd - Stari Grad</option>
              <option value="Novi Sad">Novi Sad</option>
              <option value="Niš">Niš</option>
            </select>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={handleStartPlanning}
            className="px-12 py-5 text-xl font-semibold rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          >
            Započni planiranje
          </button>
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
