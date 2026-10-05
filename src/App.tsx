import { useEffect, useRef, useState, type ReactNode } from 'react'

/* IntersectionObserver reveal. No scroll listeners anywhere on this page. */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-visible')
          io.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

/* The liquid glass material hook.

   A rAF throttled pointer handler reads the pointer position relative to the
   panel and writes three CSS custom properties onto it:
     --mx / --my   percentage position, 0 to 100
     --lift        0 to 1, rises as the pointer approaches the surface

   index.css drives the refraction ring (.liquid::before), the specular
   highlight (.liquid::after) and the inner glint layer (.liquid-glint) from
   those three values, so the light on the panel moves, tilts and brightens
   with the pointer. One document level listener serves every panel. */
function useLiquidGlass() {
  useEffect(() => {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)')

    const panels = Array.from(
      document.querySelectorAll<HTMLElement>('.liquid[data-liquid]'),
    )

    const pointer = { x: 0, y: 0 }
    let queued = false
    let active = -1

    function paint() {
      queued = false
      if (active < 0 || !panels[active]) return
      const el = panels[active]
      const box = el.getBoundingClientRect()
      const px = ((pointer.x - box.left) / box.width) * 100
      const py = ((pointer.y - box.top) / box.height) * 100
      const x = Math.min(100, Math.max(0, px))
      const y = Math.min(100, Math.max(0, py))
      const proximity = 1 - Math.min(1, Math.hypot(x - 50, y - 50) / 74)
      el.style.setProperty('--mx', x.toFixed(2))
      el.style.setProperty('--my', y.toFixed(2))
      el.style.setProperty('--lift', (0.18 + proximity * 0.82).toFixed(3))
    }

    function onMove(e: PointerEvent) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      if (calm.matches) return
      let found = -1
      for (let i = 0; i < panels.length; i += 1) {
        const box = panels[i].getBoundingClientRect()
        if (
          e.clientX >= box.left &&
          e.clientX <= box.right &&
          e.clientY >= box.top &&
          e.clientY <= box.bottom
        ) {
          found = i
          break
        }
      }
      if (found < 0) return
      active = found
      if (!queued) {
        queued = true
        window.requestAnimationFrame(paint)
      }
    }

    function onLeave() {
      active = -1
      panels.forEach((el) => {
        el.style.setProperty('--mx', '26')
        el.style.setProperty('--my', '14')
        el.style.setProperty('--lift', '0.2')
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    document.addEventListener('pointercancel', onLeave)

    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      document.removeEventListener('pointercancel', onLeave)
    }
  }, [])
}

/* Mobile fallback: below 1024px there is no pointer to track, so glint layers
   are dropped and the panels sit on their resting light. */
function NoGlintLayers() {
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const layers = Array.from(document.querySelectorAll<HTMLElement>('.liquid-glint'))
    function sync() {
      layers.forEach((l) => {
        l.style.display = mq.matches ? 'none' : ''
      })
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return null
}

const FLEET = [
  {
    reg: 'G-NBTA',
    name: 'Nimbus Cirrus',
    kind: 'Pilatus PC-12 NGX',
    detail:
      'Single engine turboprop, four club seats and a four berth cabin behind the pilot. Runs the Highlands and the Channel crossings on a single engine reserve.',
    img: 'https://picsum.photos/seed/nimbus-turboprop-on-ramp-dawn/1200/900',
    alt: 'Single engine turboprop parked on a wet apron at first light',
    rows: [
      ['Range', '2,740 km at 290 kt true'],
      ['Cruise', '310 kt at FL 250'],
      ['Seats', '4 club, 4 overnight'],
      ['Base', 'EGLF Farnborough'],
    ],
  },
  {
    reg: 'G-NBSE',
    name: 'Nimbus Meridian',
    kind: 'Dassault Falcon 2000EX',
    detail:
      'The long leg aircraft. Two crew, a four zone cabin and a galley that will actually feed eight people before you land.',
    img: 'https://picsum.photos/seed/nimbus-twinjet-hangar-night/800/600',
    alt: 'Twin engine business jet inside a lit hangar at night',
    rows: [
      ['Range', '7,400 km with tanks'],
      ['Cruise', '447 kt at FL 430'],
      ['Seats', '8 in four zones'],
      ['Base', 'EGCC Manchester'],
    ],
  },
  {
    reg: 'G-NBTH',
    name: 'Nimbus Kestrel',
    kind: 'Pilatus PC-21',
    detail:
      'Aerobatic capable and used for the training days. Flown from EGPH when the weather sits low over the Firth of Forth.',
    img: 'https://picsum.photos/seed/nimbus-training-turboprop-glideslope/800/600',
    alt: 'Training turboprop banking above a coastal runway',
    rows: [
      ['Range', '2,030 km at 250 kt'],
      ['Cruise', '250 kt at FL 220'],
      ['Seats', '1 instructor, 1 student'],
      ['Base', 'EGPH Edinburgh'],
    ],
  },
]

const DESTINATIONS = [
  { icao: 'EGPH', name: 'Edinburgh', note: '48 min from Farnborough' },
  { icao: 'EGLK', name: 'Luton', note: '26 min from Farnborough' },
  { icao: 'EGCC', name: 'Manchester', note: '1 hr 12 min from Farnborough' },
  { icao: 'EGLM', name: 'Duxford', note: 'Charter only' },
  { icao: 'EGPA', name: 'Glasgow', note: 'Fuel stop for EGPI' },
]

type BoardItem = {
  k: string
  kicker: string
  v: string
  rows?: string[][]
}

const BOARD: BoardItem[] = [
  {
    k: 'Charter',
    kicker: 'Whole aircraft, your call sheet',
    v: 'Priced by the leg, not the seat. You set the routing and the captain files it as a training or positioning leg where it fits.',
    rows: [
      ['Minimum', 'Four passengers'],
      ['Notice', 'Two hours at EGLF, same day'],
      ['Included', 'Crew, fuel, handling, catering'],
    ],
  },
  {
    k: 'Onboard',
    kicker: 'Existing sector',
    v: 'A berth on a leg already flying, booked a week out.',
  },
  {
    k: 'Flight review',
    kicker: 'Sixty minutes, one aircraft',
    v: 'An hour with a captain at whichever base suits you.',
  },
]

function QuoteMark() {
  return (
    <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden="true">
      <path
        d="M0 26V14.6C0 6.2 4.4 1 12.4 0l1.4 4.2c-4.4 1.2-6.6 3.8-6.8 7.6h6.4V26H0zm20.2 0V14.6C20.2 6.2 24.6 1 32.6 0L34 4.2c-4.4 1.2-6.6 3.8-6.8 7.6h6.4V26H20.2z"
        fill="currentColor"
      />
    </svg>
  )
}

function ArrowGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path
        d="M2 11L11 2M11 2H4.2M11 2v6.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* A single glass panel with its glint layer and body slot inside it. */
function Panel({
  children,
  className = '',
  bodyClass = '',
  solid = false,
}: {
  children?: ReactNode
  className?: string
  bodyClass?: string
  solid?: boolean
}) {
  return (
    <div className={`liquid ${solid ? 'liquid-solid' : ''} ${className}`} data-liquid>
      <span className="liquid-glint" aria-hidden="true" />
      <div className={`liquid-body ${bodyClass}`}>{children}</div>
    </div>
  )
}

export default function App() {
  useLiquidGlass()
  const [legs, setLegs] = useState('')
  const [from, setFrom] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!from) {
      setError('Choose the airport you are setting off from.')
      return
    }
    if (!legs.trim() || Number(legs) < 2 || Number(legs) > 14) {
      setError('Passenger count has to sit between 2 and 14.')
      return
    }
    setError('')
    setSent(true)
  }

  return (
    <>
      <NoGlintLayers />

      <header className="liquid liquid-bare sticky top-0 z-30 border-x-0 border-t-0">
        <div className="shell flex h-18 max-h-20 items-center justify-between py-3">
          <a href="#top" className="flex items-baseline gap-2.5">
            <span className="font-display text-[1.35rem] font-medium tracking-[-0.03em]">
              Nimbus
            </span>
          </a>
          <nav className="hidden items-center gap-7 md:flex" aria-label="Main">
            <a href="#fleet" className="link-underline text-sm text-slate hover:text-chalk">
              Fleet
            </a>
            <a href="#routes" className="link-underline text-sm text-slate hover:text-chalk">
              Where we fly
            </a>
            <a href="#board" className="link-underline text-sm text-slate hover:text-chalk">
              Board
            </a>
            <a href="#charter" className="link-underline text-sm text-slate hover:text-chalk">
              Contact
            </a>
          </nav>
          <a href="#charter" className="btn btn-primary !py-2 !text-sm">
            Start a charter
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero: stacked headline over a wide, thin glass band. The band is the
            widest liquid surface on the page, so the moving highlight has room
            to travel. Holds the eyebrow, headline, subtext and CTAs, nothing
            else. */}
        <section className="shell flex min-h-[100dvh] flex-col justify-center pt-24 pb-16">
          <Reveal>
            <p className="micro mb-6">Charter aircraft, UK registered</p>
            <h1 className="max-w-[46rem] text-[clamp(2.3rem,5vw,4.1rem)] leading-[1.0] text-chalk">
              Fourteen hours to the meeting that matters.
            </h1>
            <p className="mt-7 max-w-[46ch] text-[1.0625rem] leading-[1.65] text-mist">
              Three aircraft on the ground at Farnborough, Manchester and Edinburgh, flown by
              pilots we employ ourselves.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3.5">
              <a href="#fleet" className="btn btn-primary">
                Meet the fleet
                <span className="btn-icon">
                  <ArrowGlyph />
                </span>
              </a>
              <a href="#charter" className="btn btn-ghost">
                Start a charter
              </a>
            </div>
          </Reveal>

          <Reveal delay={140} className="mt-14 md:mt-16">
            <Panel className="w-full" bodyClass="lp-none">
              <div className="grid items-stretch sm:grid-cols-[13rem_1fr]">
                <img
                  src="https://picsum.photos/seed/nimbus-airliner-cloud-deck-window/900/420"
                  alt="Airliner wing above a cloud deck seen from a cabin window"
                  width={900}
                  height={420}
                  loading="eager"
                  className="h-32 w-full object-cover sm:h-full"
                />
                <dl className="flex flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4 md:px-6">
                  {[
                    ['Movements', 'EGLF, EGCC, EGPH'],
                    ['Next departure', 'G-NBTA 18:40'],
                    ['Crew on ground', 'Nine'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline gap-2.5">
                      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-slate">
                        {k}
                      </dt>
                      <dd className="font-mono text-[0.8125rem] text-chalk">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Panel>
          </Reveal>
        </section>

        {/* Fleet: scroll-snap card row, the fourth layout family. Each card
            carries its own image and its own spec list. */}
        <section id="fleet" className="shell py-24 md:py-32">
          <Reveal>
            <h2 className="max-w-[9.5em] text-[clamp(2rem,3.9vw,3.1rem)] text-chalk">
              Three aircraft, and the hours they cover.
            </h2>
            <p className="mt-5 max-w-[58ch] text-mist">
              Each is flown on our own operation, not brokered out. The registrations are ours and
              the crews have been with us an average of nine years.
            </p>
          </Reveal>

          <div className="mt-14 -mx-1.5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1.5 pb-4 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {FLEET.map((a, i) => (
              <Reveal
                key={a.reg}
                delay={i * 80}
                className="w-[19rem] shrink-0 snap-start md:w-auto"
              >
                <Panel className="flex h-full flex-col" solid={i === 1}>
                  <img
                    src={a.img}
                    alt={a.alt}
                    width={i === 0 ? 1200 : 800}
                    height={i === 0 ? 900 : 600}
                    loading="lazy"
                    className="h-48 w-full shrink-0 object-cover"
                  />
                  <div className="flex flex-1 flex-col gap-5 p-6">
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-xl text-chalk">{a.name}</h3>
                        <span className="font-mono text-xs text-signal">{a.reg}</span>
                      </div>
                      <p className="mt-1.5 font-mono text-[0.8125rem] text-mist">{a.kind}</p>
                    </div>
                    <p className="flex-1 text-[0.9375rem] leading-[1.65] text-mist">{a.detail}</p>
                    <dl className="flex flex-col">
                      {a.rows.map(([k, v]) => (
                        <div
                          key={k}
                          className="rule-top flex items-baseline justify-between gap-4 border-t border-chalk/10 py-2.5 first:border-t-0 first:pt-0"
                        >
                          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-slate">
                            {k}
                          </dt>
                          <dd className="text-sm text-chalk">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </Panel>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Where we fly: image on the right, a stacked ICAO list on the left.
            Second and last image plus text split. */}
        <section id="routes" className="shell py-24 md:py-32">
          <div className="grid gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
            <Reveal className="flex flex-col justify-center">
              <h2 className="max-w-[9em] text-[clamp(2rem,3.9vw,3.1rem)] text-chalk">
                From Farnborough, most of Europe is a sit-down.
              </h2>
              <p className="mt-6 max-w-[54ch] leading-[1.7] text-mist">
                We file under our own UK operating certificate, which means a slot at EGLF does
                not depend on an airline putting us on a passenger manifest. You land, you walk
                out.
              </p>
              <ul className="mt-10 flex flex-col divide-y divide-chalk/10">
                {DESTINATIONS.map((d) => (
                  <li key={d.icao} className="rule-top flex items-baseline justify-between gap-5 py-4">
                    <div className="flex items-baseline gap-4">
                      <span className="font-mono text-[0.8125rem] text-signal">{d.icao}</span>
                      <span className="text-[0.9375rem] text-chalk">{d.name}</span>
                    </div>
                    <span className="shrink-0 text-sm text-mist">{d.note}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={110}>
              <img
                src="https://picsum.photos/seed/nimbus-private-jet-approach-twilight/1000/1200"
                alt="Business jet on approach at twilight with city lights below"
                width={1000}
                height={1200}
                loading="lazy"
                className="h-80 w-full rounded-[26px] object-cover sm:h-[30rem] lg:h-full"
              />
            </Reveal>
          </div>
        </section>

        {/* Board: 2 plus 1 asymmetric split, three boards and three cells. */}
        <section id="board" className="shell py-24 md:py-32">
          <Reveal>
            <h2 className="max-w-[10em] text-[clamp(2rem,3.9vw,3.1rem)] text-chalk">
              Three ways onto the aircraft.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2 md:grid-rows-2">
            {BOARD.map((b, i) => (
              <Reveal
                key={b.k}
                delay={i * 80}
                className={i === 0 ? 'md:row-span-2' : ''}
              >
                <Panel className="h-full" solid={i === 0}>
                  <div className="flex h-full flex-col gap-6">
                    <div>
                      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-signal">
                        {b.kicker}
                      </p>
                      <h3 className="mt-4 text-2xl text-chalk">{b.k}</h3>
                    </div>
                    <p className="max-w-[40ch] leading-[1.65] text-mist">{b.v}</p>
                    {b.rows && (
                      <dl className="mt-auto flex flex-col pt-2">
                        {b.rows.map(([k, v]) => (
                          <div
                            key={k}
                            className="rule-top flex items-baseline justify-between gap-4 border-t border-chalk/10 py-3"
                          >
                            <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-slate">
                              {k}
                            </dt>
                            <dd className="text-sm text-chalk">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </Panel>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Quote: full width band, one family used once. */}
        <section className="shell py-24 md:py-32">
          <Reveal>
            <figure className="px-1 py-2 md:px-6 md:py-6">
              <QuoteMark />
              <blockquote className="mt-8 max-w-[52ch] text-[clamp(1.5rem,2.7vw,2.15rem)] leading-[1.28] tracking-[-0.02em] text-chalk">
                We had ninety minutes between the two meetings and I spent them in the office
                parking lot. That has not happened once since we started using the Kestrel.
              </blockquote>
              <figcaption className="mt-9 text-sm text-mist">
                Rhona Aitken, Operations Director, Aberdeen
              </figcaption>
            </figure>
          </Reveal>
        </section>

        {/* Charter: form on the left, office detail on the right. */}
        <section id="charter" className="shell pb-24 md:pb-32">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <Reveal>
              <Panel bodyClass="p-5 md:p-7">
                <h2 className="max-w-[8em] text-[clamp(2rem,3.9vw,3.1rem)] text-chalk">
                  Tell us where and when.
                </h2>
                <p className="mt-5 max-w-[48ch] leading-[1.7] text-mist">
                  We quote a whole aircraft, not a seat, so the number you get back is the number you
                  pay. Most replies land inside two working hours.
                </p>

                <form className="mt-9 flex flex-col gap-5" onSubmit={submit} noValidate>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="origin" className="text-sm text-chalk">
                      Departure airport
                    </label>
                    <select
                      id="origin"
                      name="origin"
                      className="field appearance-none"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      aria-describedby="origin-hint"
                    >
                      <option value="">Select an ICAO code</option>
                      {DESTINATIONS.map((d) => (
                        <option key={d.icao} value={d.icao}>
                          {d.icao} {d.name}
                        </option>
                      ))}
                    </select>
                    <p id="origin-hint" className="font-mono text-[0.6875rem] text-slate">
                      Farnborough EGLF, Manchester EGCC or Edinburgh EGPH
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="pax" className="text-sm text-chalk">
                      Passengers aboard
                    </label>
                    <input
                      id="pax"
                      name="pax"
                      className="field"
                      value={legs}
                      onChange={(e) => setLegs(e.target.value)}
                      placeholder="4"
                      inputMode="numeric"
                      aria-describedby="pax-hint"
                    />
                    <p id="pax-hint" className="font-mono text-[0.6875rem] text-slate">
                      Between 2 and 14 on any of the three aircraft
                    </p>
                  </div>

                  {error && (
                    <p role="alert" className="text-sm text-signal">
                      {error}
                    </p>
                  )}

                  {sent ? (
                    <div
                      className="liquid-solid rounded-[26px] px-5 py-4 text-sm text-signal"
                      role="status"
                    >
                      Logged against {from}. The duty captain has your request and will call the
                      number on file.
                    </div>
                  ) : (
                    <button type="submit" className="btn btn-primary self-start">
                      Send the request
                      <span className="btn-icon">
                        <ArrowGlyph />
                      </span>
                    </button>
                  )}
                </form>
              </Panel>
            </Reveal>

            <Reveal delay={120} className="flex flex-col justify-center">
              <dl className="flex flex-col gap-8">
                {[
                  ['Charter desk', '01235 448 210, 24 hours'],
                  ['Registered office', 'Tarmac House, EGLF Farnborough'],
                  ['Accountable manager', 'Rhona Aitken'],
                  ['Licence', 'UK AOC, UK Air Crew Licence'],
                ].map(([k, v]) => (
                  <div key={k} className="rule-top border-t border-chalk/12 pt-4">
                    <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-slate">
                      {k}
                    </dt>
                    <dd className="mt-2 text-sm text-chalk">{v}</dd>
                  </div>
                ))}
              </dl>
              <img
                src="https://picsum.photos/seed/nimbus-hangar-crew-walkround/900/640"
                alt="Two crew walking a round of a business jet outside a hangar"
                width={900}
                height={640}
                loading="lazy"
                className="mt-12 h-56 w-full rounded-[26px] object-cover sm:h-64"
              />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="liquid liquid-bare border-x-0 border-b-0">
        <div className="shell grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:py-16">
          <div>
            <p className="font-display text-lg text-chalk">Nimbus Aviation</p>
            <p className="mt-3 max-w-[40ch] text-sm leading-[1.65] text-mist">
              Three aircraft, nine pilots and a crew room at Farnborough that is staffed from five in
              the morning.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-3 text-sm">
            <a href="#fleet" className="link-underline text-mist hover:text-chalk">
              Fleet
            </a>
            <a href="#routes" className="link-underline text-mist hover:text-chalk">
              Where we fly
            </a>
            <a href="#board" className="link-underline text-mist hover:text-chalk">
              Board
            </a>
          </nav>
          <div className="text-sm text-mist">
            <p>Tarmac House, EGLF</p>
            <p className="mt-1">Farnborough GU17 0FA</p>
            <a href="#charter" className="link-underline mt-4 inline-block hover:text-chalk">
              Start a charter
            </a>
          </div>
        </div>
        <div className="shell rule-top border-t border-chalk/10 py-7">
          <p className="font-mono text-[0.6875rem] text-slate">
            Developed by{' '}
            <a href="https://thediyadevelopers.com" className="link-underline text-chalk">
              Diya Developers
            </a>
          </p>
        </div>
      </footer>
    </>
  )
}