import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DatenschutzPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-4">
          <ArrowLeft size={15} /> Zurück
        </button>

        <h1 className="font-display text-[22px] font-extrabold text-dark mb-4">Datenschutzerklärung</h1>

        <div className="bg-white rounded-card p-4 space-y-4 text-[13px] text-dark leading-relaxed" style={{ border: '1.5px solid #EBEBEB' }}>

          <div className="bg-amber-50 rounded-btn px-3.5 py-2.5 text-[12px] text-amber-800" style={{ border: '1.5px solid #FDE68A' }}>
            Diese App befindet sich im Beta-Test. Funktionen und gespeicherte Daten können sich jederzeit ändern.
          </div>

          <section>
            <h2 className="font-bold text-[14px] mb-1">1. Verantwortlicher</h2>
            <p>
              MealDeal (Privatprojekt in Entwicklung)<br />
              Wird vor dem öffentlichen Launch ergänzt<br />
              E-Mail: mealdeal.app@gmail.com
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">2. Welche Daten werden gespeichert</h2>
            <p>Wir speichern ausschließlich die Daten, die für den Betrieb der App notwendig sind:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              <li><span className="font-semibold">E-Mail-Adresse</span> — für Login und Kontoverwaltung</li>
              <li><span className="font-semibold">Postleitzahl</span> — um dir regionale Supermarkt-Angebote anzuzeigen</li>
              <li><span className="font-semibold">Ausgewählte Märkte</span> — um Angebote auf deine Supermärkte zu filtern</li>
              <li><span className="font-semibold">Ernährungspräferenzen</span> — um Rezepte und Angebote an deine Ernährung anzupassen</li>
              <li><span className="font-semibold">Wochenplan</span> — deine geplanten Mahlzeiten pro Woche</li>
              <li><span className="font-semibold">Einkaufsliste</span> — deine aktuelle Einkaufsliste mit abgehakten Artikeln</li>
              <li><span className="font-semibold">Kaufverlauf</span> — abgeschlossene Einkäufe mit Ersparnis-Berechnung</li>
              <li><span className="font-semibold">Feedback</span> — von dir freiwillig eingereichtes Feedback zur App</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">3. Zweck der Datenverarbeitung</h2>
            <p>Alle erhobenen Daten dienen ausschließlich der App-Funktionalität:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Anzeige passender Supermarkt-Angebote in deiner Region</li>
              <li>Personalisierung von Rezeptvorschlägen</li>
              <li>Speicherung deines Wochenplans und deiner Einkaufsliste</li>
              <li>Berechnung deiner Ersparnis</li>
              <li>Verbesserung der App auf Basis deines Feedbacks</li>
            </ul>
            <p className="mt-2 font-semibold">Es findet keine Nutzung der Daten für Werbezwecke statt.</p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">4. Keine Weitergabe an Dritte</h2>
            <p>
              Deine Daten werden nicht an Dritte weitergegeben, verkauft oder für Werbung verwendet.
              Es gibt keine Tracking-Dienste, keine Analyse-Tools von Drittanbietern und keine Werbenetzwerke in dieser App.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">5. Speicherung und Sicherheit</h2>
            <p>
              Deine Daten werden auf Servern von <span className="font-semibold">Supabase</span> gespeichert.
              Die Server befinden sich in der <span className="font-semibold">EU (AWS Region Frankfurt, Deutschland)</span>.
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Alle Datenübertragungen sind TLS/SSL-verschlüsselt</li>
              <li>Passwörter werden gehasht gespeichert (bcrypt)</li>
              <li>Zugriff auf Daten ist durch Row Level Security (RLS) auf deinen Account beschränkt</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">6. Rechtsgrundlage</h2>
            <p>
              Die Verarbeitung erfolgt auf Basis deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)
              sowie zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">7. Deine Rechte</h2>
            <p>Du hast jederzeit das Recht auf:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li><span className="font-semibold">Auskunft</span> — welche Daten über dich gespeichert sind</li>
              <li><span className="font-semibold">Berichtigung</span> — Korrektur falscher Daten</li>
              <li><span className="font-semibold">Löschung</span> — vollständige Löschung deines Accounts und aller Daten</li>
              <li><span className="font-semibold">Widerruf</span> — Widerruf deiner Einwilligung mit Wirkung für die Zukunft</li>
              <li><span className="font-semibold">Datenübertragbarkeit</span> — Export deiner Daten in einem gängigen Format</li>
              <li><span className="font-semibold">Beschwerde</span> — bei einer Datenschutz-Aufsichtsbehörde</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">8. Löschung deiner Daten</h2>
            <p>
              Um deinen Account und alle gespeicherten Daten vollständig zu löschen,
              sende eine E-Mail an <span className="font-semibold">mealdeal.app@gmail.com</span>.
              Wir löschen deine Daten innerhalb von 30 Tagen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">9. Beta-Test</h2>
            <p>
              Diese App befindet sich derzeit in der Entwicklung (Beta-Phase).
              Funktionen können sich ändern und es können Fehler auftreten.
              Gespeicherte Daten können im Rahmen der Weiterentwicklung zurückgesetzt werden.
              Du wirst vorab informiert, falls dies der Fall sein sollte.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">10. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz erreichst du uns unter:<br />
              <span className="font-semibold">mealdeal.app@gmail.com</span>
            </p>
          </section>

          <p className="text-[11px] text-muted pt-2">Stand: März 2026</p>
        </div>
      </div>
    </div>
  )
}
