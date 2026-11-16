import { useState } from 'react'
import type { ReactNode } from 'react'
import { attendedPillClass, targetPillClass, windowPillClass } from '../lib/ui.ts'

type Language = 'en' | 'ro'

type Entry = { name: string; text: ReactNode }

type GuideText = {
  title: string
  languageLabel: string
  intro: ReactNode[]
  termsHeading: string
  terms: Entry[]
  startHeading: string
  steps: Entry[]
  calendarHeading: string
  calendarIntro: string
  targetPill: string
  windowPill: string
  attendedPill: string
  inWindow: string
  deviation: string
  noMark: string
  calendar: ReactNode[]
  changesHeading: string
  changesIntro: ReactNode
  changes: Entry[]
  dashboardHeading: string
  dashboardIntro: ReactNode
  dashboard: Entry[]
  studiesHeading: string
  studies: ReactNode[]
  backupHeading: string
  backup: ReactNode[]
  dataHeading: string
  data: ReactNode[]
}

const content: { en: GuideText; ro: GuideText } = {
  en: {
    title: 'User guide',
    languageLabel: 'Language',
    intro: [
      <>
        Doctor Schedule keeps track of visit windows for doctors who run protocols with a schedule of assessments.
        You describe a protocol once, as a timeline: its visits, how many weeks apart they fall, and how many days
        either side of each target date still count. You give each patient the date of their first visit, and the
        app works out every visit after it and draws all your patients on one calendar, each protocol in its own
        colour. A visit attended outside its window is marked as a deviation, so you see it coming instead of
        finding it afterwards.
      </>,
      <>
        Nobody books anything. There are no appointment slots: the patient comes in on any day inside the window,
        and you record the day they came.
      </>,
      <>
        The round button with a moon, 🌙, in the header beside <b>Sign out</b>, makes the pages dark; it then shows a
        sun, ☀️, which makes them light again. Until you first press it, the app follows your device's light or dark
        setting; after that, this browser remembers your choice.
      </>,
    ],
    termsHeading: 'Terms',
    terms: [
      {
        name: 'Timeline',
        text: (
          <>
            A protocol, described once: its visits, the week each one falls in, and a window around each. Each
            timeline gets a colour of its own, and its patients' visits are drawn in it. Timelines are made on the{' '}
            <b>Timelines</b> page.
          </>
        ),
      },
      {
        name: 'Visit',
        text: (
          <>
            One visit of a timeline, numbered #1, #2, … in the order the visits happen. For each patient, a visit
            has a target date: the day the protocol plans it for.
          </>
        ),
      },
      {
        name: 'Week',
        text: (
          <>
            When a visit falls, counted in weeks. A timeline usually counts from week 0, the baseline visit; a
            screening visit before it can be at a negative week, such as −2.
          </>
        ),
      },
      {
        name: 'Window',
        text: (
          <>
            The days either side of a target date that still count, written ± days. A patient who comes on any day
            inside the window, the first and last days included, has come on time. A window of ± 0 days is the
            target day alone.
          </>
        ),
      },
      {
        name: 'Anchor date',
        text: (
          <>
            The date of a patient's first visit. Every other target date is counted forward from it, by the weeks
            between the two visits. If the timeline starts with screening at a negative week, the anchor is the
            screening day, not baseline.
          </>
        ),
      },
      {
        name: 'Snapshot',
        text: (
          <>
            Adding a patient copies their timeline's visits and procedures onto them. That copy is the patient's
            own: changing the timeline afterwards moves no patient already on it.
          </>
        ),
      },
      {
        name: 'Deviation',
        text: (
          <>
            A visit attended outside its window. It is marked ⚠ wherever the visit is shown, and the visit's note
            is the place to say why.
          </>
        ),
      },
      {
        name: 'Procedure, and the Schedule of assessments',
        text: (
          <>
            A procedure is one thing done at a visit, such as bloods or an ECG. The <b>Schedule of assessments</b>{' '}
            is the grid in the timeline form that says which procedures happen at which visit: a row for each
            procedure, a column for each visit, and a tick where they meet.
          </>
        ),
      },
      {
        name: 'Procedure set',
        text: (
          <>
            A named list of procedures, such as those of a standard visit, kept on the <b>Procedure sets</b> page.
            Applying a set to a timeline copies its names in. Nothing links the timeline back to the set, so editing
            or deleting a set changes no timeline.
          </>
        ),
      },
    ],
    startHeading: 'Getting started',
    steps: [
      {
        name: 'Create a timeline',
        text: (
          <>
            Open <b>Timelines</b>, give the timeline a name and describe its visits. <b>Fixed spacing</b> asks for
            the number of visits, the weeks between them and one window for all of them, with the first visit at
            week 0. <b>Per-visit spacing</b> gives each visit its own week and window, for protocols with uneven
            gaps. The preview shows the dates the visits would fall on for a first visit on the day you pick. Add
            procedures with <b>+ Add procedure</b> and tick them under the visits they belong to, then press{' '}
            <b>Create timeline</b>.
          </>
        ),
      },
      {
        name: 'Add a patient',
        text: (
          <>
            Open <b>Patients</b>, type a name or a code, choose the timeline and pick the date of the first visit,
            then press <b>Add patient</b>. The timeline's visits are copied onto the patient, and every target date
            is worked out from that first date.
          </>
        ),
      },
      {
        name: 'Find them on the calendar',
        text: (
          <>
            Open <b>Calendar</b>. Each visit sits on its target day in its timeline's colour, with the days of its
            window tinted around it. <b>‹</b> and <b>›</b> change the month, and <b>Today</b> comes back to this
            one.
          </>
        ),
      },
      {
        name: 'Record a visit',
        text: (
          <>
            Once the patient has come, open <b>Patients</b> and press <b>Record</b> on that visit's row. Pick the
            day they came in <b>Attended on</b>, add a note if there is something to keep, and press <b>Save</b>.
            The row then shows ✓ if the day was inside the window, or ⚠ if it was not. A day in the future is
            refused: attendance is recorded after the visit.
          </>
        ),
      },
    ],
    calendarHeading: 'Reading the calendar',
    calendarIntro:
      "Colour says which protocol a visit belongs to; the marks say where it stands. The samples here are grey; on the calendar each one is in its timeline's colour.",
    targetPill: "Solid: the visit's target day.",
    windowPill:
      "Tinted: a day inside the visit's window. Coming on this day is still on time. Window days show only while nothing is recorded for the visit.",
    attendedPill: 'Unfilled, with a coloured edge: the day the patient came, when it was not the target day.',
    inWindow: 'Attended inside the window.',
    deviation: 'Deviation: attended outside the window.',
    noMark: 'No mark: nothing recorded yet.',
    calendar: [
      <>
        A day shows at most three pills. When more visits fall on it, it shows two and "+N more". Today's date sits
        in a filled circle.
      </>,
      <>
        Click or tap a day with visits to open it. Every visit of that day gets a card: the patient, the timeline,
        the target date, the window, the day attended, the procedures planned for that visit, and its note.{' '}
        <b>Close</b>, Escape or a click outside the cards closes it.
      </>,
      <>
        On a wide screen, resting the mouse on a day with visits shows them in a panel at the side of the screen.
        On a phone the calendar is a list of the month's days instead, with no panel: tap a day to open it.
      </>,
      <>
        <b>Legend</b>, above the calendar, lists your timelines with their colours, and the marks above. A visit in
        grey belongs to a patient whose timeline was deleted: the patient keeps every date and record, and only the
        timeline's name and colour are gone.
      </>,
    ],
    changesHeading: 'Changing a schedule',
    changesIntro: (
      <>
        Each patient's schedule is their own copy, so it is changed on the <b>Patients</b> page, one patient at a
        time. <b>Edit</b> on a patient opens three forms, and each visit's row has one of its own.
      </>
    ),
    changes: [
      {
        name: 'Name and Note',
        text: (
          <>
            Change the patient's name or code, and a note about the patient, then press <b>Save</b>.
          </>
        ),
      },
      {
        name: 'Move dates',
        text: (
          <>
            Sets a new date for the first visit. Every target date and window moves with it. Days already recorded
            keep their date and are checked again against the moved windows, so a ✓ can turn into a ⚠, or the other
            way round.
          </>
        ),
      },
      {
        name: 'Switch',
        text: (
          <>
            Moves the patient to another timeline. The schedule is rebuilt from it, with the first visit on the same
            date and the new timeline's procedures. Days attended and notes carry over by visit number: what was
            recorded on #3 stays on #3. If the new timeline has no visit with that number, what was recorded there is
            dropped; the form names those visits before you switch, and the confirmation says it again. Visits are
            matched by number, not by meaning: if the new timeline starts with a screening visit the old one did not
            have, the old #1 becomes the screening visit. Check the dates after a switch, and use{' '}
            <b>Move dates</b> if the first visit should fall on another day.
          </>
        ),
      },
      {
        name: 'Record, Clear date and Note',
        text: (
          <>
            <b>Record</b> on a visit's row (<b>Edit</b>, once something is recorded) opens that visit.{' '}
            <b>Attended on</b> is the day the patient came; <b>Clear date</b> empties it, for a day recorded by
            mistake; <b>Note</b> keeps anything worth keeping, such as why a visit was a deviation. Nothing is saved
            until you press <b>Save</b>, and changing one visit never moves another.
          </>
        ),
      },
      {
        name: 'Editing a timeline',
        text: (
          <>
            Editing a timeline on the <b>Timelines</b> page never moves a patient already on it: each one keeps the
            copy made when they were added. The change reaches only patients added to the timeline, or switched to
            it, after you save it.
          </>
        ),
      },
      {
        name: 'Procedures added later',
        text: (
          <>
            For the same reason, procedures added or ticked on a timeline later do not reach the patients already on
            it. Their visits were copied before, so the calendar's cards for those visits keep saying "None planned".
          </>
        ),
      },
    ],
    dashboardHeading: 'Dashboard',
    dashboardIntro: (
      <>
        The <b>Dashboard</b> is the first page after you sign in. It is worked out from your patients' schedules
        each time it opens. <b>Overdue</b> and <b>Recent deviations</b> show five rows at first, and "+N more"
        shows the rest.
      </>
    ),
    dashboard: [
      {
        name: 'Needs attention',
        text: (
          <>
            <b>Closing soon</b>: visits with nothing recorded whose window closes in the next three days.{' '}
            <b>Overdue</b>: visits whose window has closed with nothing recorded, the latest first. Its link opens
            the <b>Calendar</b>.
          </>
        ),
      },
      {
        name: 'At a glance',
        text: (
          <>
            Four numbers, each beside another to compare it with: active patients (those with a visit not yet
            recorded whose window has not closed) out of all patients; timelines in use by an active patient, out of
            all timelines; visits with a target date this month, against last month; and deviations as a share of
            the visits recorded.
          </>
        ),
      },
      {
        name: 'This week',
        text: (
          <>
            Visits with nothing recorded whose target date falls in the next seven days, today included. Its link
            opens <b>Patients</b>.
          </>
        ),
      },
      {
        name: 'Recent deviations',
        text: (
          <>
            Every visit attended outside its window, the latest first. Its link opens <b>Patients</b>.
          </>
        ),
      },
      {
        name: 'Recently saved',
        text: (
          <>
            The last three articles saved on <b>Studies</b>, with a link there.
          </>
        ),
      },
    ],
    studiesHeading: 'Studies',
    studies: [
      <>
        <b>Studies</b> searches Europe PMC, a free database of biomedical articles. Type a few words: the search runs
        when you stop typing, or at once on Enter, and shows the first 25 results. Each result shows its title,
        authors, journal and year, its abstract folded under <b>Abstract</b>, and <b>Open on Europe PMC</b>, a link
        to the article there.
      </>,
      <>
        <b>Save</b> keeps a result under <b>Saved articles</b>, newest first. On a saved article, <b>Add note</b>{' '}
        opens a box for a note of your own, kept by <b>Save note</b>; a note saved empty is removed. <b>Delete</b>{' '}
        takes the article off your list, and it can be saved again from a search. The search and its results are
        not kept when you leave the page; saved articles are.
      </>,
    ],
    backupHeading: 'Backup',
    backup: [
      <>
        The database behind the app keeps no backups of its own. <b>Download backup</b>, on the <b>Backup</b> page,
        saves everything in your account as one file: timelines, patients, procedure sets and saved articles. The
        file holds your patients' names and notes, so keep it as carefully as a paper file.
      </>,
      <>
        <b>Import</b> loads such a file, but only into an empty account, so that nothing is mixed in or
        overwritten: a new account, for example. Choosing a file only reads it and says what it holds; nothing is
        written until you press <b>Import</b>. If an import stops halfway, the page says what was written; delete
        that before trying again.
      </>,
    ],
    dataHeading: 'Your data',
    data: [
      <>
        A patient is a name, which may be a real name or a code such as P-014, a timeline, the date of the first
        visit, the visits with the days attended, and your notes. Nothing else about a patient is stored: no date
        of birth, no contact details, no identity number. If you use codes, keep names out of the notes too.
      </>,
      <>
        Each account belongs to one doctor, and sees only its own timelines, patients, procedure sets and saved
        articles.
      </>,
    ],
  },
  ro: {
    title: 'Ghid de utilizare',
    languageLabel: 'Limba',
    intro: [
      <>
        Doctor Schedule urmărește ferestrele de vizită pentru medicii care conduc protocoale cu un program de
        evaluări. Descrieți un protocol o singură dată, ca timeline: vizitele lui, la câte săptămâni distanță cad
        și câte zile înainte și după fiecare dată-țintă mai sunt valabile. Dați fiecărui pacient data primei
        vizite, iar aplicația calculează toate vizitele care urmează și îi desenează pe toți pacienții pe un singur
        calendar, fiecare protocol în culoarea lui. O vizită efectuată în afara ferestrei ei este marcată ca
        abatere, astfel încât o vedeți din timp, în loc să o descoperiți după aceea.
      </>,
      <>
        Nimeni nu face programări. Nu există intervale orare rezervate: pacientul vine în orice zi din fereastră,
        iar dumneavoastră înregistrați ziua în care a venit.
      </>,
      <>
        Butonul rotund cu luna, 🌙, din antet de lângă <b>Sign out</b>, face paginile întunecate; apoi arată un
        soare, ☀️, care le face din nou luminoase. Până la prima apăsare, aplicația urmează setarea de luminos sau
        întunecat a dispozitivului; după aceea, acest browser ține minte alegerea.
      </>,
    ],
    termsHeading: 'Termeni',
    terms: [
      {
        name: 'Timeline',
        text: (
          <>
            Un protocol, descris o singură dată: vizitele lui, săptămâna în care cade fiecare și o fereastră în
            jurul fiecăreia. Fiecare timeline primește o culoare proprie, iar vizitele pacienților lui sunt desenate
            în ea. Timeline-urile se creează pe pagina <b>Timelines</b>.
          </>
        ),
      },
      {
        name: 'Vizită',
        text: (
          <>
            O vizită a unui timeline, numerotată #1, #2, … în ordinea în care au loc vizitele. Pentru fiecare
            pacient, o vizită are o dată-țintă: ziua pentru care o planifică protocolul.
          </>
        ),
      },
      {
        name: 'Săptămână',
        text: (
          <>
            Momentul unei vizite, numărat în săptămâni. Un timeline numără de obicei de la săptămâna 0, vizita
            inițială (baseline); o vizită de screening dinaintea ei poate fi într-o săptămână negativă, de exemplu
            −2.
          </>
        ),
      },
      {
        name: 'Fereastră',
        text: (
          <>
            Zilele dinainte și de după o dată-țintă care mai sunt valabile, scrise ± zile. Un pacient care vine în
            oricare zi din fereastră, inclusiv în prima și în ultima, a venit la timp. O fereastră de ± 0 zile este
            doar ziua-țintă.
          </>
        ),
      },
      {
        name: 'Data de ancorare',
        text: (
          <>
            Data primei vizite a unui pacient. Toate celelalte date-țintă se calculează înainte pornind de la ea,
            după săptămânile dintre cele două vizite. Dacă timeline-ul începe cu un screening într-o săptămână
            negativă, data de ancorare este ziua screeningului, nu a vizitei inițiale.
          </>
        ),
      },
      {
        name: 'Copie (snapshot)',
        text: (
          <>
            Adăugarea unui pacient copiază pe el vizitele și procedurile timeline-ului său. Copia îi aparține
            pacientului: modificarea ulterioară a timeline-ului nu mută niciun pacient aflat deja pe el.
          </>
        ),
      },
      {
        name: 'Abatere',
        text: (
          <>
            O vizită efectuată în afara ferestrei ei. Este marcată cu ⚠ oriunde apare vizita, iar nota vizitei este
            locul în care se poate spune de ce.
          </>
        ),
      },
      {
        name: 'Procedură și Schedule of assessments',
        text: (
          <>
            O procedură este un lucru făcut la o vizită, de exemplu analize de sânge sau un ECG.{' '}
            <b>Schedule of assessments</b> (programul de evaluări) este grila din formularul timeline-ului care arată
            ce proceduri au loc la fiecare vizită: un rând pentru fiecare procedură, o coloană pentru fiecare vizită
            și o bifă acolo unde se întâlnesc.
          </>
        ),
      },
      {
        name: 'Set de proceduri',
        text: (
          <>
            O listă de proceduri cu un nume, de exemplu cele ale unei vizite obișnuite, păstrată pe pagina{' '}
            <b>Procedure sets</b>. Aplicarea unui set pe un timeline îi copiază numele. Nimic nu leagă timeline-ul
            înapoi de set, așa că modificarea sau ștergerea unui set nu schimbă niciun timeline.
          </>
        ),
      },
    ],
    startHeading: 'Primii pași',
    steps: [
      {
        name: 'Creați un timeline',
        text: (
          <>
            Deschideți <b>Timelines</b>, dați timeline-ului un nume și descrieți-i vizitele. <b>Fixed spacing</b>{' '}
            cere numărul de vizite, săptămânile dintre ele și o singură fereastră pentru toate, cu prima vizită în
            săptămâna 0. <b>Per-visit spacing</b> dă fiecărei vizite propria săptămână și propria fereastră, pentru
            protocoalele cu intervale inegale. Previzualizarea arată datele în care ar cădea vizitele pentru o primă
            vizită în ziua aleasă. Adăugați proceduri cu <b>+ Add procedure</b> și bifați-le sub vizitele cărora le
            aparțin, apoi apăsați <b>Create timeline</b>.
          </>
        ),
      },
      {
        name: 'Adăugați un pacient',
        text: (
          <>
            Deschideți <b>Patients</b>, scrieți un nume sau un cod, alegeți timeline-ul și data primei vizite, apoi
            apăsați <b>Add patient</b>. Vizitele timeline-ului sunt copiate pe pacient, iar fiecare dată-țintă este
            calculată pornind de la acea primă dată.
          </>
        ),
      },
      {
        name: 'Găsiți-l în calendar',
        text: (
          <>
            Deschideți <b>Calendar</b>. Fiecare vizită stă în ziua ei țintă, în culoarea timeline-ului, cu zilele
            ferestrei colorate mai deschis în jurul ei. <b>‹</b> și <b>›</b> schimbă luna, iar <b>Today</b> revine
            la luna curentă.
          </>
        ),
      },
      {
        name: 'Înregistrați o vizită',
        text: (
          <>
            După ce pacientul a venit, deschideți <b>Patients</b> și apăsați <b>Record</b> pe rândul acelei vizite.
            Alegeți ziua în care a venit în <b>Attended on</b>, adăugați o notă dacă este ceva de păstrat și
            apăsați <b>Save</b>. Rândul arată apoi ✓ dacă ziua a fost în fereastră sau ⚠ dacă nu a fost. O zi din viitor
            este refuzată: prezența se înregistrează după vizită.
          </>
        ),
      },
    ],
    calendarHeading: 'Citirea calendarului',
    calendarIntro:
      'Culoarea arată cărui protocol îi aparține o vizită; marcajele arată în ce stadiu se află. Exemplele de aici sunt gri; în calendar fiecare are culoarea timeline-ului său.',
    targetPill: 'Plină: ziua-țintă a vizitei.',
    windowPill:
      'Colorată mai deschis: o zi din fereastra vizitei. Venirea în această zi este încă la timp. Zilele ferestrei apar doar cât timp nu este nimic înregistrat pentru vizită.',
    attendedPill: 'Neumplută, cu marginea colorată: ziua în care a venit pacientul, când aceasta nu a fost ziua-țintă.',
    inWindow: 'Efectuată în fereastră.',
    deviation: 'Abatere: efectuată în afara ferestrei.',
    noMark: 'Niciun marcaj: nimic înregistrat încă.',
    calendar: [
      <>
        O zi arată cel mult trei etichete. Când în ea cad mai multe vizite, arată două și „+N more”. Data de azi stă
        într-un cerc plin.
      </>,
      <>
        Faceți clic sau atingeți o zi cu vizite pentru a o deschide. Fiecare vizită din acea zi primește un card:
        pacientul, timeline-ul, data-țintă, fereastra, ziua prezentării, procedurile planificate pentru acea vizită
        și nota ei. <b>Close</b>, tasta Escape sau un clic în afara cardurilor o închid.
      </>,
      <>
        Pe un ecran lat, când țineți mouse-ul pe o zi cu vizite, acestea apar într-un panou în marginea ecranului.
        Pe telefon, calendarul este în schimb o listă a zilelor lunii, fără panou: atingeți o zi pentru a o
        deschide.
      </>,
      <>
        <b>Legend</b>, deasupra calendarului, arată timeline-urile cu culorile lor și marcajele de mai sus. O vizită
        gri aparține unui pacient al cărui timeline a fost șters: pacientul își păstrează toate datele și
        înregistrările, iar doar numele și culoarea timeline-ului au dispărut.
      </>,
    ],
    changesHeading: 'Modificarea unui program',
    changesIntro: (
      <>
        Programul fiecărui pacient este copia lui, așa că se modifică pe pagina <b>Patients</b>, câte un pacient pe
        rând. <b>Edit</b> pe un pacient deschide trei formulare, iar rândul fiecărei vizite îl are pe al său.
      </>
    ),
    changes: [
      {
        name: 'Name și Note',
        text: (
          <>
            Schimbați numele sau codul pacientului și o notă despre el, apoi apăsați <b>Save</b>.
          </>
        ),
      },
      {
        name: 'Move dates',
        text: (
          <>
            Stabilește o dată nouă pentru prima vizită. Fiecare dată-țintă și fiecare fereastră se mută odată cu ea.
            Zilele deja înregistrate își păstrează data și sunt verificate din nou față de ferestrele mutate, așa că
            un ✓ poate deveni ⚠ sau invers.
          </>
        ),
      },
      {
        name: 'Switch',
        text: (
          <>
            Mută pacientul pe alt timeline. Programul este refăcut după acesta, cu prima vizită la aceeași dată și cu
            procedurile noului timeline. Zilele de prezentare și notele trec mai departe după numărul vizitei: ce era
            înregistrat la #3 rămâne la #3. Dacă noul timeline nu are o vizită cu acel număr, ce era înregistrat
            acolo se pierde; formularul numește acele vizite înainte de schimbare, iar confirmarea o spune din nou.
            Vizitele sunt potrivite după număr, nu după sens: dacă noul timeline începe cu un screening pe care cel
            vechi nu îl avea, vechiul #1 devine vizita de screening. Verificați datele după o schimbare și folosiți{' '}
            <b>Move dates</b> dacă prima vizită trebuie să cadă în altă zi.
          </>
        ),
      },
      {
        name: 'Record, Clear date și Note',
        text: (
          <>
            <b>Record</b> pe rândul unei vizite (<b>Edit</b>, după ce s-a înregistrat ceva) deschide acea vizită.{' '}
            <b>Attended on</b> este ziua în care a venit pacientul; <b>Clear date</b> o golește, pentru o zi
            înregistrată din greșeală; <b>Note</b> păstrează orice merită păstrat, de exemplu de ce o vizită a fost o
            abatere. Nimic nu se salvează până nu apăsați <b>Save</b>, iar modificarea unei vizite nu le mută
            niciodată pe celelalte.
          </>
        ),
      },
      {
        name: 'Modificarea unui timeline',
        text: (
          <>
            Modificarea unui timeline pe pagina <b>Timelines</b> nu mută niciodată un pacient aflat deja pe el:
            fiecare își păstrează copia făcută când a fost adăugat. Modificarea ajunge doar la pacienții adăugați pe
            timeline sau mutați pe el după ce o salvați.
          </>
        ),
      },
      {
        name: 'Proceduri adăugate ulterior',
        text: (
          <>
            Din același motiv, procedurile adăugate sau bifate ulterior pe un timeline nu ajung la pacienții aflați
            deja pe el. Vizitele lor au fost copiate înainte, așa că pe cardurile acelor vizite din calendar scrie în
            continuare „None planned”.
          </>
        ),
      },
    ],
    dashboardHeading: 'Dashboard',
    dashboardIntro: (
      <>
        <b>Dashboard</b> este prima pagină după autentificare. Este calculată din programele pacienților de fiecare
        dată când se deschide. <b>Overdue</b> și <b>Recent deviations</b> arată la început cinci rânduri, iar
        „+N more” le arată pe celelalte.
      </>
    ),
    dashboard: [
      {
        name: 'Needs attention',
        text: (
          <>
            <b>Closing soon</b>: vizitele fără nimic înregistrat a căror fereastră se închide în următoarele trei
            zile. <b>Overdue</b>: vizitele a căror fereastră s-a închis fără să fie înregistrat nimic, cele mai
            recente primele. Legătura lui deschide <b>Calendar</b>.
          </>
        ),
      },
      {
        name: 'At a glance',
        text: (
          <>
            Patru numere, fiecare lângă altul cu care să fie comparat: pacienții activi (cei cu o vizită încă
            neînregistrată a cărei fereastră nu s-a închis) din totalul pacienților; timeline-urile folosite de un
            pacient activ, din totalul timeline-urilor; vizitele cu data-țintă în luna aceasta, față de luna
            trecută; și abaterile, ca procent din vizitele înregistrate.
          </>
        ),
      },
      {
        name: 'This week',
        text: (
          <>
            Vizitele fără nimic înregistrat a căror dată-țintă cade în următoarele șapte zile, inclusiv azi.
            Legătura lui deschide <b>Patients</b>.
          </>
        ),
      },
      {
        name: 'Recent deviations',
        text: (
          <>
            Toate vizitele efectuate în afara ferestrei, cele mai recente primele. Legătura lui deschide{' '}
            <b>Patients</b>.
          </>
        ),
      },
      {
        name: 'Recently saved',
        text: (
          <>
            Ultimele trei articole salvate pe <b>Studies</b>, cu o legătură către pagină.
          </>
        ),
      },
    ],
    studiesHeading: 'Studies',
    studies: [
      <>
        <b>Studies</b> caută în Europe PMC, o bază de date gratuită de articole biomedicale. Scrieți câteva cuvinte:
        căutarea pornește când vă opriți din scris sau imediat la Enter și arată primele 25 de rezultate. Fiecare
        rezultat arată titlul, autorii, revista și anul, rezumatul pliat sub <b>Abstract</b> și{' '}
        <b>Open on Europe PMC</b>, o legătură către articol pe acel site.
      </>,
      <>
        <b>Save</b> păstrează un rezultat în <b>Saved articles</b>, cele mai noi primele. Pe un articol salvat,{' '}
        <b>Add note</b> deschide o casetă pentru o notă proprie, păstrată cu <b>Save note</b>; o notă salvată goală
        este ștearsă. <b>Delete</b> scoate articolul din listă, iar el poate fi salvat din nou dintr-o căutare.
        Căutarea și rezultatele ei nu se păstrează când părăsiți pagina; articolele salvate, da.
      </>,
    ],
    backupHeading: 'Backup',
    backup: [
      <>
        Baza de date din spatele aplicației nu păstrează copii de siguranță proprii. <b>Download backup</b>, pe
        pagina <b>Backup</b>, salvează tot ce conține contul într-un singur fișier: timeline-urile, pacienții,
        seturile de proceduri și articolele salvate. Fișierul conține numele și notele pacienților, așa că păstrați-l
        cu aceeași grijă ca pe un dosar pe hârtie.
      </>,
      <>
        <b>Import</b> încarcă un astfel de fișier, dar doar într-un cont gol, ca nimic să nu fie amestecat sau
        suprascris: de exemplu, un cont nou. Alegerea unui fișier doar îl citește și spune ce conține; nimic nu este
        scris până nu apăsați <b>Import</b>. Dacă un import se oprește la jumătate, pagina spune ce s-a scris;
        ștergeți acele date înainte de a încerca din nou.
      </>,
    ],
    dataHeading: 'Datele dumneavoastră',
    data: [
      <>
        Un pacient înseamnă un nume, care poate fi un nume real sau un cod precum P-014, un timeline, data primei
        vizite, vizitele cu zilele de prezentare și notele dumneavoastră. Nimic altceva despre pacient nu este
        stocat: nicio dată de naștere, nicio informație de contact, niciun cod numeric personal. Dacă folosiți
        coduri, nu scrieți nume nici în note.
      </>,
      <>
        Fiecare cont aparține unui singur medic și vede doar propriile timeline-uri, pacienți, seturi de proceduri și
        articole salvate.
      </>,
    ],
  },
}

const headingClass = 'text-lg font-semibold text-slate-900'

function languageClass(active: boolean): string {
  return active
    ? 'rounded-md bg-white px-3 py-1.5 text-slate-900 shadow-sm'
    : 'rounded-md px-3 py-1.5 text-slate-500 hover:text-slate-900'
}

function paragraphs(list: ReactNode[]) {
  return list.map((paragraph, index) => <p key={index}>{paragraph}</p>)
}

function entryList(entries: Entry[]) {
  return (
    <dl className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.name}>
          <dt className="font-medium text-slate-900">{entry.name}</dt>
          <dd>{entry.text}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function UserGuide() {
  const [language, setLanguage] = useState<Language>('en')
  const text = content[language]

  return (
    <div
      lang={language}
      className="max-w-3xl space-y-8 p-4 leading-relaxed break-words text-slate-700 sm:p-6"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{text.title}</h1>
          <div
            role="group"
            aria-label={text.languageLabel}
            className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium"
          >
            <button
              aria-pressed={language === 'en'}
              onClick={() => setLanguage('en')}
              className={languageClass(language === 'en')}
            >
              EN
            </button>
            <button
              aria-pressed={language === 'ro'}
              onClick={() => setLanguage('ro')}
              className={languageClass(language === 'ro')}
            >
              RO
            </button>
          </div>
        </div>
        {paragraphs(text.intro)}
      </div>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.termsHeading}</h2>
        {entryList(text.terms)}
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.startHeading}</h2>
        <ol className="space-y-4">
          {text.steps.map((step, index) => (
            <li key={step.name} className="flex gap-3">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-medium text-slate-900">{step.name}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.calendarHeading}</h2>
        <p>{text.calendarIntro}</p>
        <ul className="space-y-2">
          <li className="flex items-baseline gap-3">
            <span className={`w-24 shrink-0 ${targetPillClass}`}>P-014 · #2</span>
            <span className="min-w-0">{text.targetPill}</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className={`w-24 shrink-0 ${windowPillClass}`}>P-014 · #2</span>
            <span className="min-w-0">{text.windowPill}</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className={`w-24 shrink-0 ${attendedPillClass}`}>✓ P-014 · #2</span>
            <span className="min-w-0">{text.attendedPill}</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="w-24 shrink-0 px-1.5 text-slate-900">✓</span>
            <span className="min-w-0">{text.inWindow}</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="w-24 shrink-0 px-1.5 text-slate-900">⚠</span>
            <span className="min-w-0">{text.deviation}</span>
          </li>
          <li className="flex items-baseline gap-3">
            <span className="w-24 shrink-0" />
            <span className="min-w-0">{text.noMark}</span>
          </li>
        </ul>
        {paragraphs(text.calendar)}
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.changesHeading}</h2>
        <p>{text.changesIntro}</p>
        {entryList(text.changes)}
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.dashboardHeading}</h2>
        <p>{text.dashboardIntro}</p>
        {entryList(text.dashboard)}
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.studiesHeading}</h2>
        {paragraphs(text.studies)}
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.backupHeading}</h2>
        {paragraphs(text.backup)}
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>{text.dataHeading}</h2>
        {paragraphs(text.data)}
      </section>
    </div>
  )
}
