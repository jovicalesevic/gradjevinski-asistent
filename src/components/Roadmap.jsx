const constructionSteps = [
  {
    id: 1,
    title: 'Informacija o lokaciji',
    description: 'Saznajte šta je dozvoljeno graditi na vašoj parceli prema planu generalne regulacije.',
    link: 'https://www.rgz.gov.rs/',
    linkLabel: 'RGZ – Republički geodetski zavod',
  },
  {
    id: 2,
    title: 'Idejno rešenje (IDR)',
    description: 'Angažujte arhitektu za izradu idejnog rešenja koje je osnov za dobijanje uslova.',
  },
  {
    id: 3,
    title: 'Lokacijski uslovi',
    description: 'Dobijanje tehničkih uslova za priključenje na struju, vodu i kanalizaciju kroz CEOP.',
    link: 'https://ceop.apr.gov.rs/',
    linkLabel: 'CEOP – Centralni elektronski obrt priključaka',
  },
  {
    id: 4,
    title: 'Građevinska dozvola',
    description: 'Glavni korak ka legalnoj gradnji. Potreban je Projekat za građevinsku dozvolu (PGD).',
  },
  {
    id: 5,
    title: 'Prijava radova',
    description: 'Obavestite nadležne organe o datumu početka izvođenja radova na terenu.',
  },
  {
    id: 6,
    title: 'Kontrola temelja',
    description: 'Obavezna potvrda geometra da je objekat postavljen u skladu sa projektom.',
  },
  {
    id: 7,
    title: 'Upotrebna dozvola',
    description: 'Finalna provera objekta i upis prava svojine u Katastar nepokretnosti.',
  },
]

export default function Roadmap({ onReset }) {
  return (
    <section id="dashboard" className="px-4 sm:px-6 py-12 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-8 text-center">
        Put do upotrebne dozvole
      </h2>

      <div className="relative">
        {/* Vertical line - centered with step circles */}
        <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-4">
          {constructionSteps.map((step) => (
            <div
              key={step.id}
              className="relative flex gap-4 pl-2"
            >
              {/* Step number circle */}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
                {step.id}
              </div>

              {/* Step content card */}
              <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="font-bold text-slate-800">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{step.description}</p>
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block rounded px-2.5 py-1 text-xs font-medium text-blue-600 underline underline-offset-2 hover:bg-blue-50 hover:text-blue-700"
                  >
                    {step.linkLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex justify-center">
        <button
          type="button"
          onClick={onReset}
          className="px-6 py-3 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
        >
          Reset
        </button>
      </div>
    </section>
  )
}
