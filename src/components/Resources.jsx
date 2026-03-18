const institutions = [
  {
    title: 'CEOP - eDozvole',
    description:
      'Centralna evidencija objedinjenih procedura za podnošenje zahteva za gradnju.',
    url: 'https://ceop.apr.gov.rs/',
    icon: '📋',
  },
  {
    title: 'eKatastar (RGZ)',
    description:
      'Republički geodetski zavod – pregled katastarskih parcela i nepokretnosti.',
    url: 'https://ekatastar.rgz.gov.rs/',
    icon: '🗺️',
  },
  {
    title: 'GeoSrbija',
    description: 'Pregled parcela na mapi i prostorni podaci.',
    url: 'https://geosrbija.rs/',
    icon: '📍',
  },
  {
    title: 'eUprava',
    description:
      'Državni portal za elektronske usluge – dokumenta, dozvole i prijave.',
    url: 'https://euprava.gov.rs/',
    icon: '🏛️',
  },
  {
    title: 'Ministarstvo građevinarstva',
    description:
      'Zvanični portal Ministarstva – propisi, informacije i vodiči za gradnju.',
    url: 'https://www.mgsi.gov.rs/',
    icon: '🏗️',
  },
]

export default function Resources() {
  return (
    <section
      id="institucije"
      className="scroll-mt-20 px-4 sm:px-6 py-16 md:py-24 max-w-5xl mx-auto"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 text-center">
        Adresar Institucija
      </h2>
      <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
        Ključne institucije i portali za postupke vezane za gradnju u Srbiji.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {institutions.map((inst) => (
          <article
            key={inst.title}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl">
                {inst.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 mb-1.5">{inst.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {inst.description}
                </p>
                <a
                  href={inst.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Otvori
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
