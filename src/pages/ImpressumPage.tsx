import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ImpressumPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-4">
          <ArrowLeft size={15} /> Zurueck
        </button>

        <h1 className="font-display text-[22px] font-extrabold text-dark mb-4">Impressum</h1>

        <div className="bg-white rounded-card p-4 space-y-4 text-[13px] text-dark leading-relaxed" style={{ border: '1.5px solid #EBEBEB' }}>

          <div className="bg-amber-50 rounded-btn px-3.5 py-2.5 text-[12px] text-amber-800" style={{ border: '1.5px solid #FDE68A' }}>
            Diese Beta-Version wird derzeit von Jo Becker als natuerliche Person betrieben.
            Mit Gruendung der MealDeal UG (haftungsbeschraenkt) wird dieses Impressum aktualisiert.
          </div>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Angaben gemaess Paragraf 5 TMG</h2>
            <p>
              Jo Becker<br />
              [Vollstaendige Adresse wird vor Public Launch ergaenzt]<br />
              <br />
              E-Mail: mealdeal.app@gmail.com<br />
              Web: https://mealdeal-ten.vercel.app
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Verantwortlich fuer den Inhalt nach Paragraf 18 Abs. 2 MStV</h2>
            <p>Jo Becker (Adresse wie oben)</p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Streitschlichtung</h2>
            <p>
              Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                https://ec.europa.eu/consumers/odr/
              </a>
              .
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Haftung fuer Inhalte</h2>
            <p>
              Die Inhalte dieser App wurden mit groesster Sorgfalt erstellt. Fuer die Richtigkeit,
              Vollstaendigkeit und Aktualitaet koennen wir keine Gewaehr uebernehmen.
              Als Diensteanbieter sind wir gemaess Paragraf 7 Abs. 1 TMG fuer eigene Inhalte verantwortlich.
              Nach Paragrafen 8 bis 10 TMG sind wir jedoch nicht verpflichtet, uebermittelte oder gespeicherte
              fremde Informationen zu ueberwachen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Preisangaben</h2>
            <p>
              Alle angezeigten Preise und Angebote stammen aus oeffentlich zugaenglichen Quellen
              der jeweiligen Supermaerkte (Datenquelle: Marktguru). Preise koennen regional variieren
              und sich jederzeit aendern. Verbindlich ist immer der Preis an der Kasse des jeweiligen Marktes.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Keine medizinische Beratung</h2>
            <p>
              MealDeal ist kein Medizinprodukt und ersetzt keine medizinische, diaetetische oder
              ernaehrungsphysiologische Beratung. Kalorien- und Naehrwertangaben sind Schaetzwerte
              auf Basis oeffentlicher Datenquellen. Bei gesundheitlichen Fragen wende dich bitte an
              eine Aerztin, einen Arzt oder eine qualifizierte Ernaehrungsberatung.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Urheberrecht</h2>
            <p>
              Die durch die App-Betreiber erstellten Inhalte und Werke unterliegen dem deutschen
              Urheberrecht. Rezepte duerfen fuer die persoenliche Nutzung gespeichert und ausgedruckt
              werden, eine kommerzielle Weiterverwendung bedarf der ausdruecklichen Zustimmung.
            </p>
          </section>

          <p className="text-[11px] text-muted pt-2">Stand: 28. Mai 2026</p>
        </div>
      </div>
    </div>
  )
}
