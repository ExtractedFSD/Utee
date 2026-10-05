/**
 * Every fixed word in the patient report, in one place, so the PDF, the
 * clinic's preview and the tests all agree. Clinical content is from the
 * UTI Institute's "Understanding Your Result" (Lodestar) document and the
 * "Understanding Your Results and Next Steps" text supplied by Utee.
 *
 * The report is descriptive. It is not a prescription or a treatment plan,
 * and the Important Information section says so on every report.
 */

export const REPORT_TITLE = "Your Utee Test Results";

/** External pages the report points to. Placeholders until the pages exist. */
export const REPORT_LINKS = {
  utiInstituteBooking: process.env.NEXT_PUBLIC_UTI_INSTITUTE_BOOKING_URL ?? "https://www.theutiinstitute.com/utee",
  uteeShop: process.env.NEXT_PUBLIC_UTEE_SHOP_URL ?? "https://myutee.com/collections/all",
  pharmacyFirst: "https://www.nhs.uk/nhs-services/pharmacies/how-pharmacies-can-help/",
  portal: process.env.NEXT_PUBLIC_APP_URL ?? "https://portal.myutee.com",
} as const;

export type Paragraphs = readonly string[];

export const HOW_IT_WORKS = {
  title: "How the Lodestar Dx Test Works",
  body: [
    "Lodestar Dx is an advanced molecular diagnostic tool that brings 21st-century precision to the detection of Urinary Tract Infections (UTIs). Specifically, this targeted panel scans directly for the six most clinically significant uropathogens: Escherichia coli, Enterococcus, Staphylococcus saprophyticus, Proteus mirabilis, Pseudomonas aeruginosa, and Klebsiella pneumoniae.",
    "Traditionally, testing for a UTI involved sending a sample to a laboratory and waiting several days to see if bacteria would grow. This method, known as a standard urine culture, relies on a testing standard designed in the 1950s.",
    "Lodestar Dx works differently. Instead of waiting for bacteria to grow in a laboratory, this test scans your urine sample directly for the unique genetic signatures (the DNA) of the bacteria most frequently responsible for UTIs. This highly targeted approach allows us to identify specific pathogens rapidly and with a high degree of precision. Crucially, its accuracy is not compromised if you are currently taking antibiotics or if they are in a dormant (quiescent) state.",
  ],
} as const;

export const UROBIOME = {
  title: "The Urobiome and Test Sensitivity",
  body: [
    "For many decades, it was a common medical belief that a healthy bladder was completely sterile. We now know this is incorrect. Much like the human gut, the bladder has its own natural, healthy ecosystem of microorganisms known as the 'urobiome'. Because we do not want to flag these healthy bacteria as a problem, this test is calibrated to only trigger a positive result when a known uropathogen is present at levels high enough to suggest an active infection, therefore lessening the chance of picking up your natural urobiome.",
  ],
} as const;

export const ANTIBIOTIC_PROFILE = {
  title: "Antibiotic profile",
  body: [
    "A major advantage of identifying the exact pathogen is that it allows direct targeting of the infection, selecting the antibiotic best suited to eradicate that specific bacterium.",
    "The choice of antibiotics can be guided by the latest 'antibiogram' data. This report uses the latest data from a region in the south of the UK, which has analysed every single positive urine culture from both local community practices and regional hospitals, mapping out exactly which antibiotics are currently most effective in that specific area.",
    "However, because bacteria are highly adaptable, there is still a chance that a specific strain may have developed a level of resistance to a normally effective antibiotic.",
  ],
} as const;

export type PathogenProfile = {
  key: string;
  name: string;
  /** Short name for tiles and headings. */
  short: string;
  intro: string;
  behaviour: Paragraphs;
  antibiotics: string;
};

/** Keyed by the lab sheet's organism keys (see lib/lab-sheet.ts). */
export const PATHOGEN_PROFILES: Record<string, PathogenProfile> = {
  e_coli: {
    key: "e_coli",
    name: "Escherichia coli (E. coli)",
    short: "E. coli",
    intro:
      "E. coli is a very common type of bacteria that normally lives harmlessly in the intestines of humans and animals. While it is a healthy and necessary part of your digestive system, it can cause problems if it travels to other parts of the body. E. coli is the number one cause of urinary tract infections (UTIs) worldwide, accounting for roughly 80% of all cases in the community.",
    behaviour: [
      "The specific strains of E. coli that cause UTIs have evolved highly specialised survival skills. They feature tiny, hair-like structures (called fimbriae) that act like microscopic velcro. This helps the bacteria stick tightly to the lining of the bladder, making it very difficult for the body to simply flush them out with urine.",
      "Furthermore, E. coli can sometimes invade the bladder cells themselves. Once inside, they can form 'intracellular communities', also known as embedded infections, essentially hiding within the bladder lining. This allows them to evade the body's white blood cells and is a key reason why some people experience recurrent UTIs, as the bacteria can re-emerge at a later date.",
    ],
    antibiotics:
      "Nitrofurantoin, pivmecillinam, or fosfomycin are often the most effective choices for E. coli. Cefalexin, co-amoxiclav and ciprofloxacin can also be effective, but the resistance rates are higher. E. coli is commonly resistant to amoxicillin and trimethoprim.",
  },
  enterococcus: {
    key: "enterococcus",
    name: "Enterococcus species",
    short: "Enterococcus",
    intro:
      "Enterococcus is a very hardy, resilient family of bacteria that naturally lives harmlessly in the human intestines and genital tract. While it is not typically an issue for completely healthy individuals, it can cause problems if it takes hold in the urinary system. It is considered an opportunistic bacterium and is a frequent cause of urinary tract infections (UTIs), particularly in older adults, patients who have urinary catheters or in patients who have recently had a course of antibiotics.",
    behaviour: [
      "The specific strains of Enterococcus that cause UTIs rely on their exceptional toughness. In a laboratory setting, they can survive extreme temperatures, high salt concentrations, and a wide pH range. This environmental toughness is exactly what allows them to persist on hospital surfaces and medical equipment.",
      "Another one of their defining characteristics is the ability to build 'biofilms', a highly organised bacterial community. This biofilm mass attaches firmly to the lining of the bladder or to foreign objects like catheters and acts as a physical barrier that prevents the body's white blood cells and antibiotics from effectively clearing the infection.",
      "Combined with the fact that Enterococcus has a natural resistance to many common antibiotics, this makes the bacteria capable of persisting quietly for long periods if it is not accurately targeted.",
    ],
    antibiotics:
      "Amoxicillin/co-amoxiclav, nitrofurantoin, or fosfomycin are often the most effective choices for Enterococcus. However, Enterococcus is naturally resistant to trimethoprim, pivmecillinams and aminoglycosides such as gentamicin.",
  },
  staph_saprophyticus: {
    key: "staph_saprophyticus",
    name: "Staphylococcus saprophyticus",
    short: "Staph. saprophyticus",
    intro:
      "Staphylococcus saprophyticus is a normal resident of the human skin, naturally living harmlessly around the genital and perineal areas. While it does not cause issues on the skin, it can cause uncomfortable problems if it is introduced into the urinary system. It is a common cause of UTI in younger, otherwise healthy women, and is often associated with sexual activity.",
    behaviour: [
      "Staphylococcus saprophyticus is highly specialised for the urinary system. It produces specific surface proteins that act like a biological glue, allowing it to easily and firmly attach to the cells lining the urethra and bladder. This allows it to rapidly establish an infection before it can be flushed out.",
      "Furthermore, once attached, it produces an enzyme called urease that alters the local chemistry of the urine. This creates a highly favourable micro-environment for the bacteria to multiply rapidly. This firm attachment and rapid multiplication usually provoke a strong, acute inflammatory response from the body, resulting in sudden and noticeable discomfort.",
    ],
    antibiotics:
      "Amoxicillin/co-amoxiclav, nitrofurantoin, trimethoprim and levofloxacin are often the most effective choices for Staphylococcus.",
  },
  proteus_mirabilis: {
    key: "proteus_mirabilis",
    name: "Proteus mirabilis",
    short: "Proteus mirabilis",
    intro:
      "Proteus mirabilis can be found in the human gut as well as widely distributed in the natural environment, such as in soil and water. While perfectly harmless in its natural environment, it behaves in a very unique and highly disruptive way when it is introduced to the urinary tract.",
    behaviour: [
      "Proteus is highly mobile and essentially acts as a chemical factory. Once in the bladder, it produces copious amounts of an enzyme that rapidly breaks down urea (a normal waste product in urine) into ammonia. This chemical reaction drastically changes the chemistry of the urine, making it much less acidic (more alkaline).",
      "Furthermore, this highly alkaline environment causes naturally occurring minerals in the urine, specifically magnesium and calcium, to crystallise quickly. This can lead to the formation of specific types of kidney or bladder stones, known as 'infection stones'. The bacteria can then hide inside the microscopic layers of these stones, creating a protected reservoir that makes the infection very difficult for the body to clear.",
    ],
    antibiotics:
      "Co-amoxiclav, cefalexin, fosfomycin or ciprofloxacin are often the most effective choices for Proteus. However, Proteus is naturally resistant to nitrofurantoin and has high resistance rates to trimethoprim and amoxicillin.",
  },
  pseudomonas_aeruginosa: {
    key: "pseudomonas_aeruginosa",
    name: "Pseudomonas aeruginosa",
    short: "Pseudomonas aeruginosa",
    intro:
      "Pseudomonas aeruginosa is the ultimate environmental survivor, found abundantly in nature, especially in soil, water, and on plants. It is considered an 'opportunistic' bacteria, meaning it rarely infects healthy people out in the community but takes advantage of those who are already vulnerable, such as patients who have had prolonged hospital stays or rely on a urinary catheter.",
    behaviour: [
      "Pseudomonas is a remarkably sophisticated pathogen. It utilises a chemical communication system called 'quorum sensing' to coordinate with other bacteria. Once established in the urinary tract, it is notorious for producing a thick, rubbery mucus to form dense biofilms along the bladder wall or catheter surfaces.",
      "This thick, protective layer is notoriously difficult for the body's white blood cells and antibiotics to penetrate. Because of its complex biology and environmental origins, Pseudomonas also possesses advanced natural resistance to many standard antibiotics, making it one of the more complex infections to manage.",
    ],
    antibiotics:
      "Quinolones such as ciprofloxacin or aminoglycosides such as gentamicin and amikacin are often the most effective choices for Pseudomonas. However, Pseudomonas is naturally resistant to most of the first line UTI antibiotics such as co-amoxiclav, cefalexin, nitrofurantoin, trimethoprim and fosfomycin.",
  },
  klebsiella_pneumoniae: {
    key: "klebsiella_pneumoniae",
    name: "Klebsiella pneumoniae",
    short: "Klebsiella pneumoniae",
    intro:
      "Klebsiella pneumoniae is a common type of bacteria that naturally lives harmlessly in the human intestines and in the environment. While it is safe when it stays in the gut, it can cause significant infections if it spreads to the urinary tract, particularly in older individuals or people with underlying health conditions.",
    behaviour: [
      "The hallmark of Klebsiella is its formidable physical defence system. Each individual bacterium is wrapped in a thick, complex sugary coating called a 'polysaccharide capsule'. This acts like a microscopic suit of armour as it uses tiny hooks to cling to the bladder wall, establishing a firm foothold in the urinary tract.",
      "Furthermore, when the body sends white blood cells to engulf and destroy the invading bacteria, this thick, slippery capsule prevents the immune cells from getting a grip. This allows the bacteria to effectively evade destruction. Combined with its ability to develop significant antibiotic resistance, this makes Klebsiella a robust and persistent resident once it takes hold.",
    ],
    antibiotics:
      "Ciprofloxacin is often the most effective choice for Klebsiella. Cefalexin, co-amoxiclav and pivmecillinam can also be effective, but the resistance rates are higher. However, a high proportion of Klebsiella is resistant to nitrofurantoin, trimethoprim, amoxicillin and fosfomycin.",
  },
};

export const BEHAVIOUR_HEADING = "How it behaves in the urinary tract";
export const ANTIBIOTICS_HEADING = "Suggested antibiotics";

export const NO_PATHOGEN = {
  title: "No pathogen detected",
  body: [
    "The Lodestar Dx test did not detect clinically significant levels of DNA for the six most common uropathogens in your urine. This means the test was negative for Escherichia coli, Enterococcus species, Staphylococcus saprophyticus, Pseudomonas aeruginosa, Klebsiella pneumoniae and Proteus mirabilis.",
  ],
} as const;

export const IMPORTANT_INFORMATION = {
  title: "Important Information",
  body: [
    "While Lodestar Dx is a highly sophisticated diagnostic tool, it is important to understand its limitations. The test is specifically designed to detect the most common and clinically significant bacteria that cause UTIs. It does not screen for every possible microorganism, meaning that rarer pathogens will not be detected by this specific panel. Furthermore, as with any medical diagnostic tool in the world, no test is ever 100% accurate.",
    "This report is purely descriptive and is designed to give you a better understanding of the specific bacteria detected in your sample. It is not a prescription or a treatment plan. For all medical advice, to discuss what these results mean in the context of your specific symptoms, or to arrange appropriate treatment, always speak to a healthcare professional.",
  ],
} as const;

export const NEXT_STEPS = {
  title: "Understanding Your Results and Next Steps",
  common: {
    title: "UTIs Are Remarkably Common",
    body: [
      "If you are suffering from a urinary tract infection, you are far from alone. UTIs are incredibly common across all demographics. In the UK, it is estimated that 1 in 2 women will experience a UTI in their lifetime, compared to around 1 in 7 men. While less frequently discussed, they are also common in children, affecting around 8% of girls and 2% of boys during childhood.",
    ],
  },
  recurrent: {
    title: "Recurrent vs. Chronic UTIs",
    intro: "For more and more patients, a UTI is not just a one-off event.",
    items: [
      {
        term: "Recurrent UTIs",
        text: "These are traditionally defined in the medical community as having two or more confirmed infections within six months, or three or more within a year.",
      },
      {
        term: "Chronic UTIs",
        text: "Medical understanding is evolving to recognise a new category of chronic UTIs. Rather than entirely distinct episodes, these present as long-term, ongoing, \"grumbling\" symptoms that never fully resolve, often punctuated by severe symptom flares in the middle. This is often associated with (and is thought to be caused by) biofilms and deep embedded bacteria.",
      },
    ],
  },
  investigations: {
    title: "Important Investigations",
    body: [
      "For persistent or recurrent symptoms, the key initial investigation is an Ultrasound KUB (Kidneys, Ureters, and Bladder). This scan is essential to ensure that everything is structurally normal in your urinary tract and to confirm that your bladder is emptying well.",
      "In certain cases, particularly if there is blood in your urine (haematuria) or if abnormalities are found on the ultrasound scan, more invasive tests may be required. These can include a cystoscopy (a camera examination of the inside of the bladder) and further imaging like a CT or MRI scan. It is important to speak to a healthcare professional, such as your GP or a urologist, to guide you through these investigations.",
    ],
  },
  consultation: {
    title: "Booking a Consultation",
    intro:
      "If you would like a medical consultation to discuss your Utee test results, please book an appointment with a healthcare professional such as your GP.",
    items: [
      {
        term: "Pharmacy First",
        text: "If you are aged between 18 and 65, you can use the NHS Pharmacy First service for an assessment. However, please be aware that participating pharmacists can currently only prescribe 3 days of Nitrofurantoin.",
        link: REPORT_LINKS.pharmacyFirst,
        linkLabel: "Find out about Pharmacy First",
      },
      {
        term: "The UTI Institute",
        text: "You can also book a private consultation directly. Whether you require a private prescription based on your results or a full, comprehensive consultation, our specialists are here to help.",
        link: REPORT_LINKS.utiInstituteBooking,
        linkLabel: "Book a consultation with the UTI Institute",
      },
    ],
  },
  prevention: {
    title: "Preventing Future Infections",
    intro:
      "When it comes to UTI prevention, good hydration and personal hygiene are important, but they often simply aren't enough. Thankfully, highly effective non-antibiotic options are now available:",
    items: [
      { term: "D-Mannose", text: "A natural sugar that actively prevents bacteria from sticking to the walls of the urinary tract." },
      {
        term: "High-Dose PACs (Proanthocyanidins)",
        text: "Derived from cranberries, PACs are highly effective at stopping bacterial adherence. (Note: standard cranberry juice is not enough, as you would have to drink impractically large, sugary volumes to reach the required clinical dose).",
      },
      {
        term: "Lactobacilli Probiotics",
        text: "Specifically for women, these targeted probiotics help to restore healthy vaginal flora and maintain a natural, protective environment.",
      },
    ],
    outro: "Often, a carefully balanced combination of these ingredients is the most effective way to create a beneficial effect and keep infections at bay.",
  },
  supplements: {
    title: "Utee Supplements",
    body: [
      "To make this easier, Utee provides these specific supplements. We are a UK-based company founded with Cherry Healey, a previous UTI sufferer who understands the condition intimately. Our products are not generic health supplements; they are designed specifically for UTI patients, by people who truly understand the physical and emotional toll of the condition.",
    ],
    link: REPORT_LINKS.uteeShop,
    linkLabel: "Explore the Utee range",
  },
} as const;

export const PARTNERS = {
  body: [
    "This report was created in collaboration with Consultant Urologists specialising in complex UTIs at the UTI Institute.",
    "Furthermore, our diagnostic testing is delivered in partnership with Llusern Scientific Ltd, a UK-registered, Wales-based company. In order to ensure quality and safety, Llusern Scientific's testing technology holds ISO 13485 quality management certification and carries UKCA certification from the UK MHRA.",
  ],
} as const;

export const SIGNED_HEADING = "Signed";

/** The six panel targets in sheet order, for the results tiles. */
export const PANEL_ORDER = [
  "e_coli",
  "enterococcus",
  "staph_saprophyticus",
  "proteus_mirabilis",
  "pseudomonas_aeruginosa",
  "klebsiella_pneumoniae",
] as const;
