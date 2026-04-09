import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function ImpressumPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-4">
          <ArrowLeft size={15} /> Zurück
        </button>

        <h1 className="font-display text-[22px] font-extrabold text-dark mb-4">Impressum</h1>

        <div className="bg-white rounded-card p-4 space-y-4 text-[13px] text-dark leading-relaxed" style={{ border: '1.5px solid #EBEBEB' }}>
          <section>
            <h2 className="font-bold text-[14px] mb-1">Angaben gemäß § 5 TMG</h2>
            <p>
              MealDeal App (Beta)<br />
              Kontakt: mealdeal.app@gmail.com
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Kontakt</h2>
            <p>E-Mail: mealdeal.app@gmail.com</p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Haftungsausschluss</h2>
            <p>
              Die Inhalte dieser App wurden mit größter Sorgfalt erstellt. Für die Richtigkeit,
              Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
              Insbesondere übernehmen wir keine Haftung für die Richtigkeit von Preisangaben und
              Nährwertinformationen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Preisangaben</h2>
            <p>
              Alle angezeigten Preise und Angebote stammen aus öffentlich zugänglichen Quellen
              der jeweiligen Supermärkte. Preise können regional variieren und sich jederzeit ändern.
              Verbindlich ist immer der Preis an der Kasse.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">Urheberrecht</h2>
            <p>
              Die durch die App-Betreiber erstellten Inhalte und Werke unterliegen dem deutschen
              Urheberrecht. Rezepte dienen der persönlichen Nutzung.
            </p>
          </section>

          <p className="text-[11px] text-muted pt-2">Stand: März 2026</p>
        </div>
      </div>
    </div>
  )
}
