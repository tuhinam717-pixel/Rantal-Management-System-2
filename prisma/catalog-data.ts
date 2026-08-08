/** Catalogue fixtures for the seed. Kept separate so seed.ts stays readable. */

export const CATEGORIES = [
  { name: "Photography", slug: "photography" },
  { name: "Audio Visual", slug: "audio-visual" },
  { name: "Construction", slug: "construction" },
  { name: "Events", slug: "events" },
  { name: "Power Tools", slug: "power-tools" },
  { name: "Outdoor & Camping", slug: "outdoor-camping" },
  { name: "Medical Equipment", slug: "medical-equipment" },
];

export interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  category: string;
  description: string;
  imageUrl: string;
  totalStock: number;
  depositValue: number;
  depositType?: "FIXED" | "PERCENTAGE";
  prices: { HOUR: number; DAY: number; WEEK: number; MONTH: number };
  variants: {
    sku: string;
    brand: string;
    manufacturer: string;
    color: string;
    size: string;
    stock: number;
  }[];
}

export const PRODUCTS: SeedProduct[] = [
  // ---------------------------------------------------------------- photo
  {
    name: "Canon EOS R5 Camera Kit",
    slug: "canon-eos-r5-kit",
    sku: "CAM-R5-001",
    category: "photography",
    description:
      "45MP full-frame mirrorless body with a 24-105mm f/4 lens, two batteries, charger and a padded carry case.",
    imageUrl: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80",
    totalStock: 4,
    depositValue: 15000,
    prices: { HOUR: 250, DAY: 900, WEEK: 5000, MONTH: 16000 },
    variants: [
      { sku: "CAM-R5-001-BLK", brand: "Canon", manufacturer: "Canon Inc.", color: "Black", size: "Body + 24-105mm", stock: 4 },
    ],
  },
  {
    name: "Sony A7S III Cinema Body",
    slug: "sony-a7s-iii",
    sku: "CAM-A7S-002",
    category: "photography",
    description:
      "Low-light cinema workhorse. 12MP full-frame sensor, 4K120, dual CFexpress slots.",
    imageUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80",
    totalStock: 3,
    depositValue: 18000,
    prices: { HOUR: 300, DAY: 1100, WEEK: 6000, MONTH: 19000 },
    variants: [
      { sku: "CAM-A7S-002-BLK", brand: "Sony", manufacturer: "Sony Corporation", color: "Black", size: "Body only", stock: 3 },
    ],
  },
  {
    name: "DJI Ronin 4D Cinema Camera",
    slug: "dji-ronin-4d",
    sku: "GIM-R4D-003",
    category: "photography",
    description:
      "4-axis stabilised cinema camera system with LiDAR focusing and a full-frame 6K sensor.",
    imageUrl: "https://images.unsplash.com/photo-1606986628253-05620e9b3b0f?w=800&q=80",
    totalStock: 2,
    depositValue: 40000,
    prices: { HOUR: 700, DAY: 2500, WEEK: 14000, MONTH: 45000 },
    variants: [
      { sku: "GIM-R4D-003-6K", brand: "DJI", manufacturer: "SZ DJI Technology", color: "Grey", size: "6K", stock: 2 },
    ],
  },
  {
    name: "Studio Lighting Kit (3-point)",
    slug: "studio-lighting-kit",
    sku: "LGT-STU-004",
    category: "photography",
    description:
      "Three 200W bi-colour COB LEDs with softboxes, stands and a reflector. Mains or V-mount powered.",
    imageUrl: "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80",
    totalStock: 8,
    depositValue: 6000,
    prices: { HOUR: 180, DAY: 650, WEEK: 3500, MONTH: 11000 },
    variants: [
      { sku: "LGT-STU-004-3PT", brand: "Godox", manufacturer: "Godox Photo Equipment", color: "Black", size: "3-light", stock: 8 },
    ],
  },
  {
    name: "DJI Mavic 3 Pro Drone",
    slug: "dji-mavic-3-pro",
    sku: "DRN-MV3-005",
    category: "photography",
    description:
      "Triple-camera aerial system with a 4/3 CMOS Hasselblad sensor, 43 minute flight time and three batteries.",
    imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80",
    totalStock: 3,
    depositValue: 30000,
    prices: { HOUR: 500, DAY: 1800, WEEK: 9500, MONTH: 30000 },
    variants: [
      { sku: "DRN-MV3-005-FLY", brand: "DJI", manufacturer: "SZ DJI Technology", color: "Grey", size: "Fly More Combo", stock: 3 },
    ],
  },

  // ------------------------------------------------------------------- av
  {
    name: "Line Array PA System (2kW)",
    slug: "line-array-pa-2kw",
    sku: "AV-PAS-006",
    category: "audio-visual",
    description:
      "Two-tower line array with subwoofers, digital mixer, stands and cabling. Covers up to 500 guests.",
    imageUrl: "https://images.unsplash.com/photo-1508973379184-7517410fb0bc?w=800&q=80",
    totalStock: 2,
    depositValue: 25000,
    prices: { HOUR: 900, DAY: 3200, WEEK: 18000, MONTH: 58000 },
    variants: [
      { sku: "AV-PAS-006-2KW", brand: "RCF", manufacturer: "RCF S.p.A.", color: "Black", size: "2kW", stock: 2 },
    ],
  },
  {
    name: "4K Laser Projector + 200in Screen",
    slug: "laser-projector-4k",
    sku: "AV-PRJ-007",
    category: "audio-visual",
    description:
      "7000-lumen 4K laser projector with a 200 inch fast-fold screen and rigging kit.",
    imageUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80",
    totalStock: 3,
    depositValue: 20000,
    prices: { HOUR: 600, DAY: 2200, WEEK: 12000, MONTH: 38000 },
    variants: [
      { sku: "AV-PRJ-007-4K", brand: "Epson", manufacturer: "Seiko Epson", color: "White", size: "200 inch", stock: 3 },
    ],
  },
  {
    name: "Wireless Microphone Set (4 channel)",
    slug: "wireless-mic-set",
    sku: "AV-MIC-008",
    category: "audio-visual",
    description:
      "Four-channel UHF system with two handheld and two lavalier transmitters, rack receiver included.",
    imageUrl: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
    totalStock: 10,
    depositValue: 5000,
    prices: { HOUR: 150, DAY: 550, WEEK: 3000, MONTH: 9500 },
    variants: [
      { sku: "AV-MIC-008-4CH", brand: "Shure", manufacturer: "Shure Incorporated", color: "Black", size: "4 channel", stock: 10 },
    ],
  },
  {
    name: "LED Video Wall Panel (500x500)",
    slug: "led-video-wall-panel",
    sku: "AV-LED-009",
    category: "audio-visual",
    description:
      "P3.9 indoor LED cabinet, 500x500mm. Rent by the panel and build any size wall.",
    imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    totalStock: 48,
    depositValue: 4000,
    prices: { HOUR: 120, DAY: 420, WEEK: 2400, MONTH: 7800 },
    variants: [
      { sku: "AV-LED-009-P39", brand: "Absen", manufacturer: "Absen Optoelectronic", color: "Black", size: "500x500mm", stock: 48 },
    ],
  },

  // --------------------------------------------------------- construction
  {
    name: "Aluminium Scaffolding Tower (6m)",
    slug: "scaffolding-tower-6m",
    sku: "CON-SCF-010",
    category: "construction",
    description:
      "Mobile access tower with a 6 metre working height, guard rails, toe boards and lockable castors.",
    imageUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80",
    totalStock: 6,
    depositValue: 8000,
    prices: { HOUR: 350, DAY: 1200, WEEK: 6500, MONTH: 20000 },
    variants: [
      { sku: "CON-SCF-010-6M", brand: "Youngman", manufacturer: "Youngman Group", color: "Silver", size: "6m", stock: 6 },
    ],
  },
  {
    name: "Concrete Mixer (350L)",
    slug: "concrete-mixer-350l",
    sku: "CON-MIX-011",
    category: "construction",
    description:
      "Diesel-powered tilting drum mixer, 350 litre capacity, towable on site.",
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80",
    totalStock: 4,
    depositValue: 12000,
    prices: { HOUR: 400, DAY: 1500, WEEK: 8000, MONTH: 26000 },
    variants: [
      { sku: "CON-MIX-011-350", brand: "Belle", manufacturer: "Altrad Belle", color: "Orange", size: "350L", stock: 4 },
    ],
  },
  {
    name: "Mini Excavator (1.5 tonne)",
    slug: "mini-excavator-15t",
    sku: "CON-EXC-012",
    category: "construction",
    description:
      "Compact tracked excavator with rubber tracks, three buckets and an operator canopy.",
    imageUrl: "https://images.unsplash.com/photo-1621922688758-359fc864071e?w=800&q=80",
    totalStock: 2,
    // Percentage deposit: high-value plant scales the hold with the rent.
    depositType: "PERCENTAGE",
    depositValue: 30,
    prices: { HOUR: 1200, DAY: 4500, WEEK: 24000, MONTH: 78000 },
    variants: [
      { sku: "CON-EXC-012-15T", brand: "Kubota", manufacturer: "Kubota Corporation", color: "Orange", size: "1.5 tonne", stock: 2 },
    ],
  },
  {
    name: "Diesel Generator (15 kVA)",
    slug: "diesel-generator-15kva",
    sku: "CON-GEN-013",
    category: "construction",
    description:
      "Silenced 15 kVA three-phase generator on a trailer, 8 hour tank, auto start.",
    imageUrl: "https://images.unsplash.com/photo-1620283085439-39620a1e21c4?w=800&q=80",
    totalStock: 5,
    depositValue: 15000,
    prices: { HOUR: 450, DAY: 1600, WEEK: 8800, MONTH: 28000 },
    variants: [
      { sku: "CON-GEN-013-15K", brand: "Cummins", manufacturer: "Cummins Inc.", color: "Yellow", size: "15 kVA", stock: 5 },
    ],
  },

  // --------------------------------------------------------------- events
  {
    name: "Round Banquet Table (10 seat)",
    slug: "banquet-table-10",
    sku: "EVT-TBL-014",
    category: "events",
    description:
      "1.8 metre round folding banquet table seating ten guests. Linen not included.",
    imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80",
    totalStock: 60,
    depositValue: 250,
    prices: { HOUR: 80, DAY: 300, WEEK: 1500, MONTH: 4500 },
    variants: [
      { sku: "EVT-TBL-014-WHT", brand: "Lifetime", manufacturer: "Lifetime Products", color: "White", size: "1.8m", stock: 60 },
    ],
  },
  {
    name: "Chiavari Chair",
    slug: "chiavari-chair",
    sku: "EVT-CHR-015",
    category: "events",
    description:
      "Gold resin Chiavari chair with an ivory cushion. Stackable and event-ready.",
    imageUrl: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80",
    totalStock: 240,
    depositValue: 100,
    prices: { HOUR: 25, DAY: 90, WEEK: 450, MONTH: 1400 },
    variants: [
      { sku: "EVT-CHR-015-GLD", brand: "Ecoline", manufacturer: "Ecoline Seating", color: "Gold", size: "Standard", stock: 240 },
    ],
  },
  {
    name: "Marquee Tent (9m x 12m)",
    slug: "marquee-tent-9x12",
    sku: "EVT-TNT-016",
    category: "events",
    description:
      "Clear-span marquee with sidewalls, flooring and lighting. Crew installation included.",
    imageUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    totalStock: 3,
    depositValue: 20000,
    prices: { HOUR: 1500, DAY: 5500, WEEK: 30000, MONTH: 95000 },
    variants: [
      { sku: "EVT-TNT-016-912", brand: "Roder", manufacturer: "Roder HTS Hocker", color: "White", size: "9m x 12m", stock: 3 },
    ],
  },
  {
    name: "Portable Dance Floor (6m x 6m)",
    slug: "dance-floor-6x6",
    sku: "EVT-FLR-017",
    category: "events",
    description:
      "Interlocking oak-effect dance floor with edge ramps. Covers 36 square metres.",
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7ea0d1a0c1a3?w=800&q=80",
    totalStock: 4,
    depositValue: 7000,
    prices: { HOUR: 400, DAY: 1400, WEEK: 7500, MONTH: 24000 },
    variants: [
      { sku: "EVT-FLR-017-66", brand: "Alulite", manufacturer: "Alulite Systems", color: "Oak", size: "6m x 6m", stock: 4 },
    ],
  },

  // ---------------------------------------------------------- power tools
  {
    name: "Rotary Hammer Drill (SDS-Max)",
    slug: "rotary-hammer-drill",
    sku: "PWR-DRL-018",
    category: "power-tools",
    description:
      "1500W SDS-Max combination hammer with vibration control and a chisel set.",
    imageUrl: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=80",
    totalStock: 12,
    depositValue: 3000,
    prices: { HOUR: 120, DAY: 450, WEEK: 2400, MONTH: 7500 },
    variants: [
      { sku: "PWR-DRL-018-MAX", brand: "Bosch", manufacturer: "Robert Bosch GmbH", color: "Blue", size: "SDS-Max", stock: 12 },
    ],
  },
  {
    name: "Floor Sander (200mm belt)",
    slug: "floor-sander-200",
    sku: "PWR-SND-019",
    category: "power-tools",
    description:
      "Belt floor sander with dust extraction. Abrasives charged separately on return.",
    imageUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80",
    totalStock: 6,
    depositValue: 5000,
    prices: { HOUR: 200, DAY: 750, WEEK: 4000, MONTH: 13000 },
    variants: [
      { sku: "PWR-SND-019-200", brand: "Hiretech", manufacturer: "Hiretech Ltd", color: "Grey", size: "200mm", stock: 6 },
    ],
  },
  {
    name: "Pressure Washer (200 bar)",
    slug: "pressure-washer-200bar",
    sku: "PWR-PSW-020",
    category: "power-tools",
    description:
      "Petrol pressure washer, 200 bar, with turbo nozzle and 15 metre hose.",
    imageUrl: "https://images.unsplash.com/photo-1610478920392-95888b4b2c88?w=800&q=80",
    totalStock: 8,
    depositValue: 4000,
    prices: { HOUR: 150, DAY: 550, WEEK: 3000, MONTH: 9500 },
    variants: [
      { sku: "PWR-PSW-020-200", brand: "Karcher", manufacturer: "Alfred Karcher SE", color: "Yellow", size: "200 bar", stock: 8 },
    ],
  },

  // ------------------------------------------------------------- outdoors
  {
    name: "4-Person Camping Tent",
    slug: "camping-tent-4p",
    sku: "OUT-TNT-021",
    category: "outdoor-camping",
    description:
      "Waterproof dome tent with a sewn-in groundsheet, porch and carry bag.",
    imageUrl: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80",
    totalStock: 20,
    depositValue: 1500,
    prices: { HOUR: 60, DAY: 220, WEEK: 1100, MONTH: 3500 },
    variants: [
      { sku: "OUT-TNT-021-4P", brand: "Coleman", manufacturer: "Coleman Company", color: "Green", size: "4 person", stock: 20 },
    ],
  },
  {
    name: "Camping Stove & Cookset",
    slug: "camping-stove-set",
    sku: "OUT-STV-022",
    category: "outdoor-camping",
    description:
      "Twin-burner gas stove with a windshield, pot set and igniter. Gas sold separately.",
    imageUrl: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800&q=80",
    totalStock: 25,
    depositValue: 800,
    prices: { HOUR: 40, DAY: 150, WEEK: 750, MONTH: 2400 },
    variants: [
      { sku: "OUT-STV-022-2BR", brand: "Campingaz", manufacturer: "Campingaz", color: "Silver", size: "2 burner", stock: 25 },
    ],
  },

  // ---------------------------------------------------------------- medical
  {
    name: "Electric Hospital Bed",
    slug: "electric-hospital-bed",
    sku: "MED-BED-023",
    category: "medical-equipment",
    description:
      "Three-function electric care bed with side rails, mattress and a remote handset.",
    imageUrl: "https://images.unsplash.com/photo-1580281658626-ee379f3cce93?w=800&q=80",
    totalStock: 10,
    depositValue: 10000,
    prices: { HOUR: 200, DAY: 700, WEEK: 3800, MONTH: 11000 },
    variants: [
      { sku: "MED-BED-023-3FN", brand: "Invacare", manufacturer: "Invacare Corporation", color: "White", size: "Standard", stock: 10 },
    ],
  },
  {
    name: "Foldable Wheelchair",
    slug: "foldable-wheelchair",
    sku: "MED-WCH-024",
    category: "medical-equipment",
    description:
      "Lightweight self-propelled wheelchair with removable footrests and a seatbelt.",
    imageUrl: "https://images.unsplash.com/photo-1583912267550-d6c2ac3196c0?w=800&q=80",
    totalStock: 15,
    depositValue: 4000,
    prices: { HOUR: 90, DAY: 320, WEEK: 1700, MONTH: 5200 },
    variants: [
      { sku: "MED-WCH-024-STD", brand: "Karma", manufacturer: "Karma Medical", color: "Blue", size: "18 inch", stock: 15 },
    ],
  },
];

export const CUSTOMERS = [
  { name: "Demo Customer", email: "customer@rentflow.test", password: "Customer@123", phone: "+91 98200 11111" },
  { name: "Ravi Sharma", email: "ravi.sharma@example.com", password: "Customer@123", phone: "+91 98200 22222" },
  { name: "Anita Desai", email: "anita.desai@example.com", password: "Customer@123", phone: "+91 98200 33333" },
  { name: "Karan Mehta", email: "karan.mehta@example.com", password: "Customer@123", phone: "+91 98200 44444" },
  { name: "Meera Iyer", email: "meera.iyer@example.com", password: "Customer@123", phone: "+91 98200 55555" },
  { name: "Farhan Qureshi", email: "farhan.qureshi@example.com", password: "Customer@123", phone: "+91 98200 66666" },
];
