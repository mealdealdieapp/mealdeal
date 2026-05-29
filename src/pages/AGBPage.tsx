import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AGBPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[480px] mx-auto px-4 py-6 pb-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-[13px] text-muted font-medium mb-4">
          <ArrowLeft size={15} /> Zurueck
        </button>

        <h1 className="font-display text-[22px] font-extrabold text-dark mb-4">Allgemeine Geschaeftsbedingungen</h1>

        <div className="bg-white rounded-card p-4 space-y-4 text-[13px] text-dark leading-relaxed" style={{ border: '1.5px solid #EBEBEB' }}>

          <div className="bg-amber-50 rounded-btn px-3.5 py-2.5 text-[12px] text-amber-800" style={{ border: '1.5px solid #FDE68A' }}>
            MealDeal befindet sich aktuell in der Beta-Phase. Die kostenpflichtige Premium-Funktion wird zu einem spaeteren Zeitpunkt freigeschaltet. Bis dahin gelten ausschliesslich die Regelungen fuer die kostenfreie Nutzung.
          </div>

          <section>
            <h2 className="font-bold text-[14px] mb-1">1. Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschaeftsbedingungen (AGB) regeln das Vertragsverhaeltnis zwischen dem Anbieter (siehe Ziffer 2) und den Nutzerinnen und Nutzern der Web-Anwendung MealDeal sowie etwaiger nativer Apps (im Folgenden gemeinsam: "App"). Mit der Registrierung erkennst du diese AGB an. Abweichende Bedingungen werden nicht Vertragsbestandteil, es sei denn, der Anbieter stimmt ihrer Geltung ausdruecklich schriftlich zu.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">2. Anbieter</h2>
            <p>
              MealDeal wird waehrend der Beta-Phase betrieben von:<br />
              Jo Becker (MealDeal UG i.G.)<br />
              E-Mail: mealdeal.app@gmail.com<br />
              Web: https://mealdeal-ten.vercel.app<br />
              Mit Eintragung der UG werden die vollstaendigen Angaben im Impressum aktualisiert.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">3. Vertragsgegenstand und Leistungsumfang</h2>
            <p>
              MealDeal verbindet aktuelle Supermarkt-Angebote (Datenquelle: Marktguru) mit Rezepten und einem persoenlichen Wochenplan. Folgende Funktionen stehen im kostenlosen Basis-Account zur Verfuegung:
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Anzeige regionaler Angebote auf Basis der angegebenen Postleitzahl und der ausgewaehlten Maerkte</li>
              <li>Rezept-Discovery mit Filterung nach Ernaehrungsformen</li>
              <li>Manueller Wochenplan und automatisch generierter Einkaufszettel</li>
              <li>Favoriten und Watchlist (Mengen-Limit kann variieren)</li>
              <li>Push-Benachrichtigungen (nur nach ausdruecklicher Einwilligung)</li>
            </ul>
            <p className="mt-2">
              Nach Freischaltung der kostenpflichtigen Premium-Funktion umfasst diese insbesondere die KI-gestuetzte Wochenplan-Generierung mit Kalorien- und Budget-Reglern, erweiterte Allergen- und Praeferenz-Filter, den Family-Modus mit Portionen-Skalierung sowie eine unlimitierte Watchlist. Der konkrete Funktionsumfang wird in der App vor Vertragsabschluss klar dargestellt.
            </p>
            <p className="mt-2">
              Die App ersetzt keine medizinische, diaetetische oder ernaehrungsphysiologische Beratung. Kalorien- und Naehrwertangaben sind Schaetzwerte auf Basis oeffentlicher Datenquellen. Angezeigte Preise sind unverbindlich; massgeblich ist der jeweilige Preis an der Kasse des Supermarkts.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">4. Registrierung und Vertragsabschluss</h2>
            <p>
              Die Nutzung von MealDeal setzt die Registrierung eines Accounts voraus (E-Mail/Passwort oder Single-Sign-On). Mit Abschluss der Registrierung kommt ein unentgeltlicher Nutzungsvertrag zwischen dir und dem Anbieter zustande. Du sicherst zu, mindestens 16 Jahre alt zu sein. Bei minderjaehrigen Nutzerinnen und Nutzern ist die Einwilligung der Erziehungsberechtigten erforderlich.
            </p>
            <p className="mt-2">
              Der Bezug einer kostenpflichtigen Premium-Mitgliedschaft erfolgt durch Auswahl eines Tarifs, Bestaetigung der Bestellung sowie erfolgreiche Zahlungsabwicklung. Der Vertrag ueber die Premium-Mitgliedschaft kommt mit der Bestellbestaetigung per E-Mail oder direkter Anzeige in der App zustande.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">5. Pflichten der Nutzerinnen und Nutzer</h2>
            <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
              <li>Wahre und vollstaendige Angaben bei der Registrierung</li>
              <li>Geheimhaltung der Zugangsdaten; unverzuegliche Information bei Verdacht auf Missbrauch</li>
              <li>Keine automatisierte Massenabfrage der App (Scraping, Bots) ohne ausdrueckliche Zustimmung</li>
              <li>Keine Umgehung technischer Schutzmassnahmen und keine Reverse-Engineering-Versuche</li>
              <li>Keine Eingabe rechtswidriger, beleidigender oder irrefuehrender Inhalte (auch nicht in Feedback-Formularen)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">6. Premium-Mitgliedschaft, Preise, Laufzeit und automatische Verlaengerung</h2>
            <p>
              Premium wird als Abonnement mit monatlicher oder jaehrlicher Laufzeit angeboten. Die jeweils geltenden Preise inklusive Umsatzsteuer werden vor Vertragsabschluss in der App ausgewiesen.
            </p>
            <p className="mt-2">
              Das Abonnement verlaengert sich nach Ablauf der jeweiligen Laufzeit automatisch um den gleichen Zeitraum, sofern es nicht vorher gekuendigt wird. Die Verlaengerung erfolgt auf unbestimmte Zeit und kann jederzeit zum Ende des laufenden Abrechnungszeitraums gekuendigt werden. Du wirst rechtzeitig vor jeder Verlaengerung per E-Mail informiert.
            </p>
            <p className="mt-2">
              Die Kuendigung ist jederzeit ueber die Profil-Einstellungen mit einem deutlich beschrifteten Kuendigungsbutton moeglich (gemaess Paragraf 312k BGB). Alternativ kannst du per E-Mail an mealdeal.app@gmail.com kuendigen. Eine bereits gezahlte Vorauszahlung wird bei Kuendigung anteilig nicht erstattet, soweit nicht zwingende gesetzliche Vorschriften entgegenstehen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">7. Widerrufsrecht fuer Verbraucher</h2>
            <p>
              Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gruenden den Premium-Vertrag zu widerrufen. Die Widerrufsfrist betraegt vierzehn Tage ab dem Tag des Vertragsabschlusses. Um dein Widerrufsrecht auszuueben, musst du uns (mealdeal.app@gmail.com) mittels einer eindeutigen Erklaerung (z.B. E-Mail) ueber deinen Entschluss informieren. Zur Wahrung der Widerrufsfrist reicht es, dass du die Mitteilung vor Ablauf der Widerrufsfrist absendest.
            </p>
            <p className="mt-2">
              <span className="font-semibold">Folgen des Widerrufs:</span> Wenn du den Vertrag widerrufst, erstatten wir dir alle Zahlungen, die wir von dir erhalten haben, unverzueglich und spaetestens binnen vierzehn Tagen ab Eingang deiner Widerrufserklaerung. Fuer die Rueckzahlung verwenden wir dasselbe Zahlungsmittel wie bei der urspruenglichen Transaktion.
            </p>
            <p className="mt-2">
              <span className="font-semibold">Erloeschen des Widerrufsrechts:</span> Bei Vertraegen ueber die Lieferung digitaler Inhalte erlischt das Widerrufsrecht, wenn du vor Vertragsabschluss ausdruecklich zugestimmt hast, dass mit der Ausfuehrung vor Ablauf der Widerrufsfrist begonnen wird, und du bestaetigst, dass du dein Widerrufsrecht damit verlierst (Paragraf 356 Abs. 5 BGB). Wir holen diese Bestaetigung vor Aktivierung der Premium-Funktion ein.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">8. Muster-Widerrufsformular</h2>
            <p>
              Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfuellen und an mealdeal.app@gmail.com senden:
            </p>
            <div className="bg-amber-50 rounded-btn px-3.5 py-2.5 mt-2 text-[12px]" style={{ border: '1.5px solid #FDE68A' }}>
              An: MealDeal, Jo Becker, mealdeal.app@gmail.com<br />
              Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag ueber die Erbringung der folgenden Dienstleistung: MealDeal Premium-Mitgliedschaft.<br />
              Bestellt am: ___ Erhalten am: ___<br />
              Name: ___<br />
              Anschrift: ___<br />
              Datum, Unterschrift: ___
            </div>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">9. Zahlungsbedingungen</h2>
            <p>
              Die Zahlung der Premium-Mitgliedschaft erfolgt ueber den externen Zahlungsdienstleister Stripe (Stripe Payments Europe, Ltd.). Es gelten die jeweiligen Zahlungs- und Datenschutzbedingungen von Stripe. Wir erhalten keine vollstaendigen Zahlungsdaten (z.B. Kreditkartennummern); diese werden ausschliesslich von Stripe verarbeitet.
            </p>
            <p className="mt-2">
              Bei nicht fristgerechter Zahlung sind wir berechtigt, die Premium-Funktionen bis zum Zahlungseingang vorzuenthalten. Der Anspruch auf Bezahlung bleibt unberuehrt.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">10. Verfuegbarkeit, Wartung, Beta-Hinweis</h2>
            <p>
              Wir bemuehen uns um eine hohe Verfuegbarkeit der App, koennen jedoch keine ununterbrochene Erreichbarkeit garantieren. Wartungsfenster, Stoerungen beim Hosting-Anbieter sowie hoehere Gewalt koennen kurzfristig zu Einschraenkungen fuehren.
            </p>
            <p className="mt-2">
              Waehrend der Beta-Phase koennen sich Funktionen jederzeit aendern oder vorrueergehend nicht verfuegbar sein. Gespeicherte Daten koennen im Rahmen der Weiterentwicklung zurueckgesetzt werden; du wirst vorab per E-Mail informiert.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">11. Haftung</h2>
            <p>
              Wir haften unbeschraenkt fuer Vorsatz und grobe Fahrlaessigkeit sowie nach Massgabe des Produkthaftungsgesetzes. Fuer leichte Fahrlaessigkeit haften wir nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht), wobei die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt ist.
            </p>
            <p className="mt-2">
              Eine weitergehende Haftung fuer leichte Fahrlaessigkeit ist ausgeschlossen. Die Haftung fuer Schaeden aus der Verletzung des Lebens, des Koerpers oder der Gesundheit bleibt unberuehrt.
            </p>
            <p className="mt-2">
              MealDeal ist kein Medizinprodukt. Fuer gesundheitliche Folgen aus der Befolgung von Rezepten oder Naehrwertangaben uebernehmen wir keine Haftung. Bei gesundheitlichen Fragen, Allergien oder besonderen Ernaehrungsformen wende dich bitte an eine qualifizierte Fachkraft.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">12. Inhalte und Nutzungsrechte</h2>
            <p>
              Saemtliche Inhalte der App (Rezepte, Texte, Bilder, Logos, Software) sind urheberrechtlich geschuetzt. Eine private Nutzung (Speichern, Ausdrucken, Nachkochen) ist gestattet. Eine kommerzielle Verwertung, Weitergabe an Dritte oder oeffentliche Wiedergabe bedarf der ausdruecklichen schriftlichen Zustimmung.
            </p>
            <p className="mt-2">
              Sofern du der App Inhalte (z.B. Feedback, eigene Rezepte, Bilder) zur Verfuegung stellst, raeumst du dem Anbieter ein einfaches, raeumlich und zeitlich unbeschraenktes Nutzungsrecht ein, soweit dies fuer den Betrieb und die Verbesserung der App erforderlich ist. Du versicherst, dass du ueber die noetigen Rechte verfuegst und keine Rechte Dritter verletzt.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">13. Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung deiner Daten findest du in unserer{' '}
              <a href="/datenschutz" className="text-primary underline">Datenschutzerklaerung</a>. Sie ist Teil der vorvertraglichen Information.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">14. Aenderungen der AGB</h2>
            <p>
              Wir koennen diese AGB mit Wirkung fuer die Zukunft anpassen, soweit dies erforderlich ist und dich nicht unangemessen benachteiligt (z.B. aufgrund geaenderter Gesetzeslage oder neuer Funktionen). Aenderungen werden dir mindestens vier Wochen vor Inkrafttreten per E-Mail oder ueber die App angekuendigt. Widersprichst du den Aenderungen nicht innerhalb der Ankuendigungsfrist, gelten sie als angenommen. Auf das Widerspruchsrecht und die Folgen weisen wir in der Aenderungsmitteilung gesondert hin.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">15. Kuendigung des Basis-Accounts</h2>
            <p>
              Du kannst deinen kostenfreien Basis-Account jederzeit ohne Frist ueber die Profil-Einstellungen ("Account loeschen") oder per E-Mail loeschen. Die vollstaendige Loeschung erfolgt innerhalb von 30 Tagen (Soft-Delete + Backup-Rotation). Eine etwaige Premium-Mitgliedschaft endet zum Ende des laufenden Abrechnungszeitraums.
            </p>
            <p className="mt-2">
              Der Anbieter kann den Vertrag aus wichtigem Grund fristlos kuendigen, insbesondere bei schwerwiegenden Verstoessen gegen diese AGB.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">16. Streitbeilegung</h2>
            <p>
              Die Europaeische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                https://ec.europa.eu/consumers/odr/
              </a>
              . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-[14px] mb-1">17. Schlussbestimmungen</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Zwingende Verbraucherschutzvorschriften des Landes, in dem du deinen gewoehnlichen Aufenthalt hast, bleiben unberuehrt.
            </p>
            <p className="mt-2">
              Ausschliesslicher Gerichtsstand fuer Streitigkeiten mit Kaufleuten ist der Sitz des Anbieters. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt.
            </p>
          </section>

          <p className="text-[11px] text-muted pt-2">Stand: 29. Mai 2026 - Beta-Fassung, juristische Endabnahme vor Open Beta ausstehend.</p>
        </div>
      </div>
    </div>
  )
}
