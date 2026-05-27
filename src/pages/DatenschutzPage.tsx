import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function DatenschutzPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-4">
          <ArrowLeft size={15} /> Zurueck
        </button>

        <h1 className="font-display text-[22px] font-extrabold text-dark mb-4">Datenschutzerklaerung</h1>

        <div className="bg-white rounded-card p-4 space-y-4 text-[13px] text-dark leading-relaxed" style={{ border: '1.5px solid #EBEBEB' }}>

          <div className="bg-amber-50 rounded-btn px-3.5 py-2.5 text-[12px] text-amber-800" style={{ border: '1.5px solid #FDE68A' }}>
            Diese App befindet sich im Beta-Test. Funktionen und gespeicherte Daten koennen sich jederzeit aendern.
          </div>

          <section>
            <h2 className="font-bold text-[14px] mb-1">1. Verantwortlicher</h2>
            <p>
              MealDeal (Privatprojekt in Entwicklung, UG i.G.)<br />
              Vollstaendige Angaben werden vor dem oeffentlichen Launch im Impressum ergaenzt.<br />
              E-Mail: mealdeal.app@gmail.com
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">2. Welche Daten verarbeiten wir</h2>
            <p>Wir speichern die Daten, die fuer den Betrieb der App notwendig sind:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              <li><span className="font-semibold">Zugangsdaten</span> - E-Mail-Adresse und gehashtes Passwort</li>
              <li><span className="font-semibold">Postleitzahl</span> - Filterung regionaler Supermarkt-Angebote</li>
              <li><span className="font-semibold">Ausgewaehlte Maerkte und Ernaehrungspraeferenzen</span></li>
              <li><span className="font-semibold">Wochenplan und Einkaufsliste</span> - selbst gepflegte Listen</li>
              <li><span className="font-semibold">Kaufverlauf</span> - abgeschlossene Einkaeufe mit Ersparnis-Berechnung</li>
              <li><span className="font-semibold">Feedback</span> - freiwillig eingereichte Hinweise zur App</li>
              <li><span className="font-semibold">Optional: Gesundheitsdaten</span> - Geschlecht, Alter, Gewicht, Groesse, Aktivitaetslevel, Ziel und Kalorienbedarf. Diese Daten gelten als besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) und werden nur nach separater, ausdruecklicher Einwilligung erhoben. Diese Einwilligung kann jederzeit in den Profil-Einstellungen widerrufen werden.</li>
              <li><span className="font-semibold">Technische Daten</span> - IP-Hash, User-Agent (nur zur Dokumentation von Einwilligungen sowie zur Missbrauchs-Erkennung)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">3. Zwecke und Rechtsgrundlagen</h2>
            <p>Die Verarbeitung dient ausschliesslich der App-Funktionalitaet:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Anzeige passender Supermarkt-Angebote (Art. 6 Abs. 1 lit. b DSGVO - Vertragserfuellung)</li>
              <li>Personalisierung von Rezeptvorschlaegen (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Speicherung von Wochenplan und Einkaufsliste (Art. 6 Abs. 1 lit. b DSGVO)</li>
              <li>Berechnung des Kalorien- und Makronaehrstoffbedarfs (Art. 9 Abs. 2 lit. a DSGVO - ausdrueckliche Einwilligung)</li>
              <li>Verbesserung der App durch Feedback und Fehler-Diagnose (Art. 6 Abs. 1 lit. f DSGVO - berechtigtes Interesse)</li>
            </ul>
            <p className="mt-2 font-semibold">Es findet keine Nutzung der Daten fuer Werbezwecke statt. Wir verkaufen keine Daten.</p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">4. Auftragsverarbeiter und Drittlaender</h2>
            <p>Wir nutzen folgende Dienstleister, mit denen Auftragsverarbeitungsvertraege nach Art. 28 DSGVO bestehen:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1">
              <li><span className="font-semibold">Supabase Inc.</span> - Datenbank, Authentifizierung, Storage. Server-Region: EU (AWS Frankfurt). Headquarters USA - Standardvertragsklauseln (SCC).</li>
              <li><span className="font-semibold">Vercel Inc. (USA)</span> - Hosting der Web-App. Edge-Functions auf Region Frankfurt gepinnt. SCC.</li>
              <li><span className="font-semibold">Sentry (Functional Software, Inc., USA)</span> - Fehlerueberwachung. Wir uebermitteln Fehler-Stacktraces ohne personenbezogene Inhalte. SCC.</li>
              <li><span className="font-semibold">Google Ireland Ltd.</span> - Gemini API zur automatischen Klassifikation von Produkten (kein Nutzer-Bezug, nur Produkt-Namen aus oeffentlichen Angeboten).</li>
              <li><span className="font-semibold">OpenAI, L.L.C. (USA)</span> - Text-Embeddings fuer das Matching zwischen Rezept-Zutaten und Angeboten (kein Nutzer-Bezug, nur Zutat- und Produkt-Namen). SCC.</li>
              <li><span className="font-semibold">Anthropic, PBC (USA)</span> - Claude API zur Rezept- und Naehrwert-Anreicherung (kein Nutzer-Bezug). SCC.</li>
              <li><span className="font-semibold">Marktguru Deutschland GmbH</span> - Quelle fuer Supermarkt-Angebote (keine Uebermittlung personenbezogener Daten an Marktguru).</li>
              <li><span className="font-semibold">Telegram (fuer interne Monitoring-Alerts)</span> - keine Nutzerdaten.</li>
            </ul>
            <p className="mt-2">Bei Uebermittlungen in die USA sichern wir das Schutzniveau ueber Standardvertragsklauseln der EU-Kommission ab. Die entsprechenden Vertraege koennen auf Anfrage eingesehen werden.</p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">5. Speicherdauer</h2>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Account-Daten: bis zur Loeschung des Accounts</li>
              <li>Server-Logs: maximal 90 Tage</li>
              <li>Backups: maximal 30 Tage</li>
              <li>Einwilligungs-Protokoll: bis zur Account-Loeschung (Nachweispflicht Art. 7 Abs. 1 DSGVO)</li>
              <li>Nach Account-Loeschung: vollstaendige Entfernung innerhalb von 30 Tagen (Soft-Delete + Backup-Rotation)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">6. Sicherheit</h2>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Alle Datenuebertragungen sind TLS-verschluesselt</li>
              <li>Passwoerter werden gehasht gespeichert (bcrypt)</li>
              <li>Zugriff auf Daten ist durch Row Level Security (RLS) je User abgesichert</li>
              <li>Sentry erhaelt nur Stacktraces ohne Nutzer-Eingaben</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">7. Deine Rechte</h2>
            <p>Du hast jederzeit das Recht auf:</p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li><span className="font-semibold">Auskunft (Art. 15)</span> - welche Daten gespeichert sind</li>
              <li><span className="font-semibold">Berichtigung (Art. 16)</span> - Korrektur direkt im Profil moeglich</li>
              <li><span className="font-semibold">Loeschung (Art. 17)</span> - Account-Loeschung in der App oder per Mail</li>
              <li><span className="font-semibold">Einschraenkung (Art. 18)</span> - auf Anfrage per Mail</li>
              <li><span className="font-semibold">Widerspruch (Art. 21)</span> - per Mail</li>
              <li><span className="font-semibold">Datenuebertragbarkeit (Art. 20)</span> - Export deiner Daten als JSON</li>
              <li><span className="font-semibold">Widerruf der Einwilligung (Art. 7 Abs. 3)</span> - jederzeit in den Profil-Einstellungen, insbesondere fuer Gesundheitsdaten</li>
              <li><span className="font-semibold">Beschwerde</span> - bei der zustaendigen Datenschutz-Aufsichtsbehoerde</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">8. Cookies und Tracking</h2>
            <p>
              MealDeal setzt nur technisch notwendige Cookies (Authentifizierung ueber Supabase, Session-Persistenz im lokalen Speicher).
              Es gibt kein Werbe-Tracking, keine Drittanbieter-Cookies und keine Analyse-Tools mit Cookies. Ein Cookie-Banner ist daher nicht erforderlich.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">9. Beta-Test</h2>
            <p>
              Diese App befindet sich derzeit in der Beta-Phase. Funktionen koennen sich aendern und es koennen Fehler auftreten.
              Gespeicherte Daten koennen im Rahmen der Weiterentwicklung zurueckgesetzt werden - du wirst vorab per E-Mail informiert.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">10. Kontakt</h2>
            <p>
              Bei Fragen zum Datenschutz erreichst du uns unter:<br />
              <span className="font-semibold">mealdeal.app@gmail.com</span>
            </p>
          </section>

          <p className="text-[11px] text-muted pt-2">Stand: 28. Mai 2026</p>
        </div>
      </div>
    </div>
  )
}
