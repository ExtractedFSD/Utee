/**
 * Every user-facing tracker string that could be read as medical, safety or
 * promotional wording. Reviewed for compliance before launch; change here,
 * not in components. Plain English, UK spelling, no diagnosis, no product
 * claims, no treatment advice.
 */

export const CONSENT_VERSION = "2026-09-29.1";

export const copy = {
  consent: {
    title: "Before you start tracking",
    intro:
      "The tracker keeps a private record of your UTIs so you can see your own history and share it with a GP or clinic if you choose. It records what you tell it and nothing more.",
    trackerText:
      "I consent to Utee storing the symptoms, triggers, treatments, tests and notes I log in the tracker. This is health information. It is stored in the UK, only I can see it, and I can export or delete it at any time from the tracker settings.",
    trackerLabel: "I agree to Utee storing my tracker entries",
    researchTitle: "Optional: help research",
    researchText:
      "I also consent to Utee using my tracker entries, with anything that could identify me removed, in combined figures for research and reporting. This is optional and I can switch it off at any time.",
    researchLabel: "Use my anonymised entries for research (optional)",
    separateNote:
      "This is separate from the consent you give when you use a Utee test. You can withdraw either at any time in settings.",
    button: "Start tracking",
  },

  aboutMe: {
    title: "About you",
    intro:
      "A few questions asked once, so you don't have to answer them every time. You can change them later in settings.",
    pregnantHint: "If yes, we'll show safety information whenever you log a new UTI.",
    preventiveTitle: "Are you taking or doing anything to help prevent UTIs?",
    preventiveHint: "Choose everything that applies. You can change this any time. Nothing here is a recommendation.",
    button: "Save and continue",
  },

  redFlag: {
    title: "Please get medical help today",
    body:
      "Some of what you've logged can need prompt attention. Contact your GP today, or call NHS 111. If you feel very unwell, call 999.",
    pregnancyBody:
      "Because you've told us you are pregnant or trying, please contact your GP or midwife today about these symptoms, or call NHS 111. If you feel very unwell, call 999.",
    footnote: "This is safety information only. The tracker does not tell you what is causing your symptoms.",
  },

  dashboard: {
    welcomeTitle: "Your UTI tracker",
    welcomeBody:
      "Log each UTI as it happens and build a record you can show a GP or clinic. You can also add ones you remember from the past.",
    logFirst: "Log your first UTI",
    logPast: "Add a past UTI",
    openEpisodeDay: (day: number) => `Day ${day} of this UTI`,
    logToday: "Log today",
    editToday: "Edit today",
    openEpisodeLink: "Open this UTI",
    seeHistory: "See full history",
    feelBetter: "I feel better",
    sinceLast: (days: number) =>
      days === 0 ? "Your last UTI ended today" : `${days} day${days === 1 ? "" : "s"} since your last UTI ended`,
    logNew: "Log a UTI",
    lastYear: "My last 12 months",
    patterns: "My patterns",
    patternsEmpty: "Once you've logged a few UTIs, this card will show which triggers and symptoms you log most, and how you rated each antibiotic.",
    tests: "My tests",
    testsEmpty: "Any Utee test you take will show here with its status.",
    history: "History",
    quickActions: "Quick actions",
    downloadSummary: "Download GP summary",
    orderTest: "Order a Utee test",
    orderTestNote: "Available any time. Not a recommendation based on what you've logged.",
    community: "Utee community",
    communityBody: "Talk with other people who understand. Opens in a new tab.",
    prevention: "What I'm taking",
    preventionEmpty: "Nothing logged yet. Add anything you take or do to help prevent UTIs, so your record shows what you've tried and what you feel helps.",
    preventionManage: "Manage",
    preventionAdd: "Add what I'm taking",
    preventionHelps: "helps",
  },

  prevention: {
    title: "What I'm taking",
    intro: "Everything you take or do to help prevent UTIs, and whether you feel it helps. Only you can say. This is your record, not advice.",
    current: "Taking now",
    past: "Tried before",
    nothingYet: "Nothing here yet.",
    add: "Add something",
    addButton: "Add",
    since: (date: string) => `Since ${date}`,
    between: (from: string | null, to: string) => (from ? `${from} to ${to}` : `Until ${to}`),
    startDate: "When did you start?",
    helping: "Is it helping?",
    helpingHint: "Only you can say. Kept for your own record.",
    notes: "Notes",
    stop: "I've stopped this",
    restart: "Start again",
    remove: "Remove",
    whichAntibiotic: "Which antibiotic?",
    otherLabel: "Other, name it",
    groupNote: "Groups are for finding things quickly. Nothing here is a recommendation.",
    edit: "Edit",
  },

  patterns: {
    trigger: (label: string, times: number, of: number) => `${label}: logged in ${times} of ${of} UTIs`,
    antibiotic: (name: string, worked: number, rated: number) =>
      `${name}: you said it worked ${worked} of ${rated} time${rated === 1 ? "" : "s"}`,
    symptom: (label: string, times: number, of: number) => `${label}: ${times} of ${of} UTIs`,
  },

  log: {
    title: "Log a UTI",
    when: "When did it start?",
    symptoms: "What are you noticing?",
    symptomsPast: "What did you notice?",
    stillGoing: "Is it still going?",
    ongoing: "Still going",
    over: "It's over",
    whenEnded: "When did it end?",
    sameAsLast: "Same as last time",
    save: "Save",
    triggers: "Anything that might have set it off?",
    treatment: "Treatment",
    tests: "Tests",
    notes: "Notes",
    feeling: "How are you feeling today?",
    closeEpisode: "I feel better now",
    closed: (date: string) => `Ended ${date}`,
    reopen: "Reopen",
    didItWork: "Did it work?",
    didItWorkHint: "Only you can say. This is kept for your own record.",
    courseHint: "Choose the length your prescriber gave you.",
    uteeTestLinked: "Linked to your Utee test in the portal.",
    uteeTestLink: "Link a Utee test",
    uteeTestNone: "You don't have a Utee test to link yet.",
  },

  episode: {
    back: "Tracker",
    title: "Your UTI",
    started: (date: string, day: number) => `Started ${date} · Day ${day}`,
    ended: (date: string, days: number) => `Ended ${date} · ${days} day${days === 1 ? "" : "s"}`,
    feelBetter: "I feel better",
    reopen: "Reopen",
    closedNote: "This UTI is closed. You can still add to it or reopen it.",
    menu: "More actions",
    delete: "Delete this UTI",
    deleteConfirmTitle: "Delete this UTI?",
    deleteConfirmBody: "Everything logged for it will be permanently removed. This cannot be undone.",
    deleteConfirmButton: "Yes, delete it",
    cancel: "Cancel",
    changeStart: "Change start date",
    today: (date: string) => `Today, ${date}`,
    feelingQuestion: "How are you feeling?",
    noticingQuestion: "What are you noticing today?",
    sameAsYesterday: "Same as yesterday",
    saved: "Saved",
    aboutTitle: "About this UTI",
    add: "Add",
    edit: "Edit",
    editing: "Editing below",
    remove: "Remove",
    done: "Done",
    rows: {
      symptoms: "What you noticed",
      triggers: "Possible triggers",
      treatment: "Treatment",
      tests: "Tests",
      notes: "Notes",
    },
    addNote: "Add a note",
    addAnotherAntibiotic: "Add another antibiotic",
    addAntibiotic: "Add an antibiotic",
    addTest: "Add a test",
    yoursBefore: "Yours before",
    showAll: "Show all",
    willAskOn: (date: string) => `We'll ask how it went on ${date}`,
    willAskOnClose: "We'll ask how it went when you close this UTI",
    askToday: "We'll ask how it went in your check-in today",
    howDidItGo: (name: string) => `How did ${name} go?`,
    downloadSummary: "Download GP summary",
    whenBetter: "When did you start feeling better?",
  },

  antibiotics: {
    search: "Search by name or brand",
    previous: "Ones you've logged before",
    noMatch: "No match. Choose Other and type the name.",
    otherLabel: "Name",
    groupNote: "Groups are for finding things quickly. Nothing here is a recommendation.",
  },

  settings: {
    title: "Tracker settings",
    export: "Export my data",
    exportBody: "Everything in your tracker, as a file you keep.",
    exportJson: "Download JSON",
    exportCsv: "Download CSV",
    delete: "Delete my tracker data",
    deleteBody:
      "Permanently deletes every UTI, symptom, treatment, test, note and check-in you've logged, and your tracker consents. This cannot be undone. Your portal account and any Utee tests are not affected.",
    deleteConfirm: "Type DELETE to confirm",
    deleteButton: "Delete everything",
    reminders: "Reminders",
    remindersBody:
      "Optional emails from Utee. They never mention symptoms or UTIs in the subject line or body.",
    reminderDaily: "A daily check-in while a UTI is open",
    reminderMonthly: "A monthly nudge to log anything I've missed",
    consents: "Consents",
    consentTracker: "Storing my tracker entries",
    consentResearch: "Anonymised research use",
    consentWithdrawNote:
      "Withdrawing tracker consent stops the tracker. To remove your data as well, use Delete my tracker data.",
    aboutMe: "About you",
  },

  reminders: {
    dailySubject: "Your Utee check-in",
    dailyBody:
      "You asked us to remind you to check in. Open your tracker whenever you have a moment.",
    monthlySubject: "A quick note from Utee",
    monthlyBody:
      "You asked for a monthly reminder. If there's anything you'd like to add to your tracker, it's ready when you are.",
    button: "Open my tracker",
  },

  pdf: {
    prevention: "Prevention, as reported by the patient",
    title: "My UTI history",
    footer: "Recorded by the patient using the Utee tracker. Not a clinical record.",
    generated: (date: string) => `Generated ${date}`,
    range: (from: string, to: string) => `${from} to ${to}`,
    noEpisodes: "No UTIs recorded in this period.",
    uteeTest: "Utee test",
    reportInPortal: "Clinical report available in the Utee portal",
  },

  history: {
    title: "My UTI history",
    empty: "Nothing logged yet.",
    ongoing: "Ongoing",
    days: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
  },
};
