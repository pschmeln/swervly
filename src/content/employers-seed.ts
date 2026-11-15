// Swervly P2 candidate seed — University of Cincinnati CEAS publicly named co-op employers.
// Sources: https://www.ceas.uc.edu/admissions/undergraduate/choose-your-major.html
//          https://www.ceas.uc.edu/admissions/undergraduate/transfer-guide.html
//          https://www.ceas.uc.edu/real-world-learning/co-op.html
// Review aliases, legal names and optional cities with Peter before seeding the database.
// A null city means unverified, not "no location". Co-op work location belongs to the rotation, not necessarily employer HQ.
export const EMPLOYERS_SEED: { name: string; aliases: string[]; industry: string | null; city: string | null }[] = [
  {
    "name": "Siemens Digital Industries Software",
    "aliases": [
      "Siemens PLM Software",
      "Siemens PLM"
    ],
    "industry": "Engineering software",
    "city": null
  },
  {
    "name": "AtriCure",
    "aliases": [
      "AtriCure Inc.",
      "Atricure"
    ],
    "industry": "Medical devices",
    "city": "Mason, OH"
  },
  {
    "name": "Messer Construction",
    "aliases": [
      "Messer Construction Company"
    ],
    "industry": "Construction",
    "city": null
  },
  {
    "name": "Copeland",
    "aliases": [],
    "industry": "HVAC and industrial technology",
    "city": null
  },
  {
    "name": "GE Appliances",
    "aliases": [
      "GE Appliances, a Haier company"
    ],
    "industry": "Home appliances",
    "city": null
  },
  {
    "name": "KLH Engineers",
    "aliases": [
      "Kohrs Lonnemann Heil Engineers",
      "KLH"
    ],
    "industry": "Engineering design",
    "city": null
  },
  {
    "name": "Honda",
    "aliases": [
      "Honda Development & Manufacturing of America"
    ],
    "industry": "Automotive",
    "city": null
  },
  {
    "name": "Kinetic Vision",
    "aliases": [],
    "industry": "Product development and engineering",
    "city": null
  },
  {
    "name": "thyssenkrupp Bilstein of America",
    "aliases": [
      "ThyssenKrupp Bilstein of America",
      "Bilstein"
    ],
    "industry": "Automotive components",
    "city": null
  },
  {
    "name": "Toyota",
    "aliases": [],
    "industry": "Automotive",
    "city": null
  },
  {
    "name": "Honeywell Intelligrated",
    "aliases": [
      "Intelligrated"
    ],
    "industry": "Warehouse automation",
    "city": null
  },
  {
    "name": "Duke Energy",
    "aliases": [],
    "industry": "Electric utilities",
    "city": null
  },
  {
    "name": "L3Harris FOS",
    "aliases": [],
    "industry": "Defense and aerospace systems",
    "city": null
  },
  {
    "name": "LG&E and KU Energy",
    "aliases": [
      "LG & E and KU Energy"
    ],
    "industry": "Electric utilities",
    "city": null
  },
  {
    "name": "Material Handling Systems",
    "aliases": [
      "Material Handling Systems Inc."
    ],
    "industry": "Industrial automation",
    "city": null
  },
  {
    "name": "New Eagle Consulting",
    "aliases": [],
    "industry": "Automotive electronics",
    "city": null
  },
  {
    "name": "Northrop Grumman",
    "aliases": [
      "Northrop Grumman Corporation"
    ],
    "industry": "Aerospace and defense",
    "city": null
  },
  {
    "name": "WHS Engineering",
    "aliases": [
      "WHS Engineering Inc"
    ],
    "industry": "Engineering services",
    "city": null
  },
  {
    "name": "Cincinnati Test Systems",
    "aliases": [
      "CTS"
    ],
    "industry": "Industrial testing",
    "city": null
  },
  {
    "name": "Standex-Meder Electronics",
    "aliases": [],
    "industry": "Electronic components",
    "city": null
  },
  {
    "name": "Valco Melton",
    "aliases": [],
    "industry": "Industrial equipment",
    "city": null
  },
  {
    "name": "Crown Equipment",
    "aliases": [
      "Crown Equipment Corporation"
    ],
    "industry": "Material handling equipment",
    "city": null
  },
  {
    "name": "Cincinnati Incorporated",
    "aliases": [],
    "industry": "Industrial manufacturing",
    "city": null
  },
  {
    "name": "Stress Engineering Services",
    "aliases": [],
    "industry": "Engineering consulting",
    "city": null
  },
  {
    "name": "University of Cincinnati",
    "aliases": [
      "UC"
    ],
    "industry": "Higher education and research",
    "city": "Cincinnati, OH"
  },
  {
    "name": "Safran Landing Systems",
    "aliases": [],
    "industry": "Aerospace components",
    "city": null
  },
  {
    "name": "Rhinestahl",
    "aliases": [],
    "industry": "Aerospace tooling and services",
    "city": null
  },
  {
    "name": "Gulfstream Aerospace",
    "aliases": [
      "Gulfstream Aerospace Corporation"
    ],
    "industry": "Aerospace manufacturing",
    "city": null
  },
  {
    "name": "NMG Aerospace",
    "aliases": [],
    "industry": "Aerospace manufacturing",
    "city": null
  },
  {
    "name": "PCC Airfoils",
    "aliases": [
      "PCC Airfoils, LLC"
    ],
    "industry": "Aerospace manufacturing",
    "city": null
  },
  {
    "name": "CMTA Engineers",
    "aliases": [
      "CMTA"
    ],
    "industry": "Building systems engineering",
    "city": null
  },
  {
    "name": "Hixson",
    "aliases": [],
    "industry": "Architecture and engineering",
    "city": null
  },
  {
    "name": "Helix Electric",
    "aliases": [
      "Helix Electric, Inc."
    ],
    "industry": "Electrical contracting",
    "city": null
  },
  {
    "name": "Rosendin Electric",
    "aliases": [
      "Rosendin"
    ],
    "industry": "Electrical contracting",
    "city": null
  },
  {
    "name": "Cook Medical",
    "aliases": [],
    "industry": "Medical devices",
    "city": null
  },
  {
    "name": "Cincinnati Children’s Hospital Medical Center",
    "aliases": [
      "Cincinnati Children’s",
      "Cincinnati Childrens Hospital"
    ],
    "industry": "Healthcare and research",
    "city": null
  },
  {
    "name": "Enable Injections",
    "aliases": [],
    "industry": "Medical devices",
    "city": null
  },
  {
    "name": "Ethicon",
    "aliases": [],
    "industry": "Medical devices",
    "city": null
  },
  {
    "name": "Guerbet",
    "aliases": [
      "Guerbet LLC"
    ],
    "industry": "Medical imaging",
    "city": null
  },
  {
    "name": "Medpace",
    "aliases": [
      "Medpace Inc."
    ],
    "industry": "Clinical research",
    "city": null
  },
  {
    "name": "DuBois Chemicals",
    "aliases": [],
    "industry": "Specialty chemicals",
    "city": null
  },
  {
    "name": "SABIC",
    "aliases": [],
    "industry": "Chemicals and materials",
    "city": null
  },
  {
    "name": "Givaudan",
    "aliases": [],
    "industry": "Flavors and fragrances",
    "city": null
  },
  {
    "name": "BASF",
    "aliases": [
      "BASF Corporation"
    ],
    "industry": "Chemicals",
    "city": null
  },
  {
    "name": "Lubrizol",
    "aliases": [],
    "industry": "Specialty chemicals",
    "city": null
  },
  {
    "name": "Owens Corning",
    "aliases": [],
    "industry": "Building materials",
    "city": null
  },
  {
    "name": "Patheon",
    "aliases": [],
    "industry": "Pharmaceutical manufacturing",
    "city": null
  },
  {
    "name": "The Kleingers Group",
    "aliases": [],
    "industry": "Civil engineering",
    "city": null
  },
  {
    "name": "Ohio Department of Transportation",
    "aliases": [
      "ODOT"
    ],
    "industry": "Transportation infrastructure",
    "city": null
  },
  {
    "name": "Danis",
    "aliases": [
      "Danis Building Construction Company"
    ],
    "industry": "Construction",
    "city": null
  }
];
