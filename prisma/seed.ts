import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number; // in INR
  currency: string;
  attributes: Record<string, any>;
  rating: number;
  imageUrl: string;
  deliveryEstimate: string;
  status: string;
  stock: number;
}

const PRODUCTS: SeedProduct[] = [
  // 1. Headphones
  {
    sku: "HP-ANC-001",
    name: "SoundMax ANC Pro",
    description: "Flagship hybrid active noise cancelling wireless over-ear headphones with 40mm beryllium drivers.",
    category: "headphones",
    price: 4499,
    currency: "INR",
    attributes: {
      brand: "SoundMax",
      wireless: true,
      anc: true,
      battery_hours: 35,
      bluetooth_version: "5.3",
      codec: ["LDAC", "AAC", "SBC"],
      weight_grams: 250,
      microphone: "Dual Beamforming"
    },
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 12
  },
  {
    sku: "HP-STU-002",
    name: "AuraSound Studio One",
    description: "Reference-grade studio monitoring wired headphones with ultra-wide frequency response.",
    category: "headphones",
    price: 6999,
    currency: "INR",
    attributes: {
      brand: "AuraSound",
      wireless: false,
      anc: false,
      impedance_ohms: 80,
      cable_length_m: 3.0,
      open_back: false,
      frequency_range: "5Hz - 35kHz"
    },
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-3 days",
    status: "ACTIVE",
    stock: 7
  },
  {
    sku: "HP-BT-003",
    name: "PulseBass HD Wireless",
    description: "Extra bass wireless headphones with quick charge and foldable lightweight design.",
    category: "headphones",
    price: 2999,
    currency: "INR",
    attributes: {
      brand: "PulseBass",
      wireless: true,
      anc: false,
      battery_hours: 40,
      fast_charge: "10 mins = 5 hrs",
      weight_grams: 210
    },
    rating: 4.2,
    imageUrl: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 18
  },
  {
    sku: "HP-GAM-004",
    name: "Vortex 7.1 Surround Gaming Headset",
    description: "Immersive spatial audio headset with retractable broadcast mic and RGB accent lighting.",
    category: "headphones",
    price: 3499,
    currency: "INR",
    attributes: {
      brand: "Vortex",
      wireless: false,
      surround_sound: "7.1 Virtual",
      rgb: true,
      connector: "USB-A & 3.5mm",
      noise_isolation: true
    },
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-4 days",
    status: "ACTIVE",
    stock: 14
  },

  // 2. Earbuds
  {
    sku: "EB-ANC-001",
    name: "AeroBuds Pro 2",
    description: "True wireless earbuds with smart transparency mode, adaptive ANC, and wireless charging case.",
    category: "earbuds",
    price: 4999,
    currency: "INR",
    attributes: {
      brand: "AeroTech",
      wireless: true,
      anc: true,
      battery_hours: 30,
      ip_rating: "IPX5",
      wireless_charging: true,
      spatial_audio: true
    },
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 25
  },
  {
    sku: "EB-SPT-002",
    name: "FitPulse Sport Earbuds",
    description: "Ergonomic secure-fit ear hooks with sweat resistance and deep bass tuning for workouts.",
    category: "earbuds",
    price: 2499,
    currency: "INR",
    attributes: {
      brand: "FitPulse",
      wireless: true,
      anc: false,
      battery_hours: 24,
      ip_rating: "IPX7",
      ear_hooks: true
    },
    rating: 4.3,
    imageUrl: "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-3 days",
    status: "ACTIVE",
    stock: 20
  },
  {
    sku: "EB-MIN-003",
    name: "NovaPods Lite",
    description: "Ultra-compact pocket earbuds with crystal-clear call clarity and featherlight build.",
    category: "earbuds",
    price: 1499,
    currency: "INR",
    attributes: {
      brand: "NovaAudio",
      wireless: true,
      anc: false,
      battery_hours: 20,
      weight_per_bud_grams: 3.5,
      touch_controls: true
    },
    rating: 4.1,
    imageUrl: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-3 days",
    status: "ACTIVE",
    stock: 35
  },

  // 3. Laptops
  {
    sku: "LP-AIR-001",
    name: "TechBook Air 14",
    description: "Featherlight productivity ultrabook powered by 8-core CPU, crisp 2.8K IPS display, and all-day battery.",
    category: "laptops",
    price: 69999,
    currency: "INR",
    attributes: {
      brand: "TechBook",
      screen_size_inch: 14.0,
      resolution: "2880x1800",
      ram_gb: 16,
      storage_gb: 512,
      storage_type: "NVMe SSD",
      processor: "Core i7 Gen 13",
      weight_kg: 1.25,
      battery_hours: 14
    },
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-3 days",
    status: "ACTIVE",
    stock: 8
  },
  {
    sku: "LP-PRO-002",
    name: "TechBook Pro 16 Max",
    description: "High-performance workstation laptop for creators, rendering, coding, and heavy multitasking.",
    category: "laptops",
    price: 124999,
    currency: "INR",
    attributes: {
      brand: "TechBook",
      screen_size_inch: 16.0,
      resolution: "3456x2160 Mini-LED",
      ram_gb: 32,
      storage_gb: 1024,
      storage_type: "NVMe Gen 4 SSD",
      gpu: "RTX 4070 8GB",
      weight_kg: 2.1
    },
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-3 days",
    status: "ACTIVE",
    stock: 4
  },
  {
    sku: "LP-GAM-003",
    name: "NitroStrike 15 Gaming",
    description: "Competitive esports laptop with 165Hz high-refresh display and advanced liquid-metal cooling.",
    category: "laptops",
    price: 84999,
    currency: "INR",
    attributes: {
      brand: "NitroStrike",
      screen_size_inch: 15.6,
      refresh_rate_hz: 165,
      ram_gb: 16,
      storage_gb: 512,
      gpu: "RTX 4060 6GB",
      keyboard_rgb: "4-Zone"
    },
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "3-5 days",
    status: "ACTIVE",
    stock: 6
  },

  // 4. Keyboards
  {
    sku: "KB-MEC-001",
    name: "KeyPro Mechanical K2",
    description: "75% compact wireless mechanical keyboard with hot-swappable tactile brown switches and Mac/Windows layout.",
    category: "keyboards",
    price: 5499,
    currency: "INR",
    attributes: {
      brand: "KeyPro",
      form_factor: "75%",
      switch_type: "Gateron Brown",
      hot_swappable: true,
      wireless: true,
      bluetooth_version: "5.1",
      backlight: "RGB",
      battery_mah: 4000
    },
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 15
  },
  {
    sku: "KB-LOW-002",
    name: "SlimType Wireless Air",
    description: "Ultra-slim low-profile scissor switch keyboard with multi-device pairing and aluminum top plate.",
    category: "keyboards",
    price: 3299,
    currency: "INR",
    attributes: {
      brand: "SlimType",
      form_factor: "100% Full Size",
      switch_type: "Scissor",
      wireless: true,
      multi_device_pairing: 3,
      thickness_mm: 5.8
    },
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-3 days",
    status: "ACTIVE",
    stock: 22
  },
  {
    sku: "KB-CUS-003",
    name: "CustomCraft Pro 65",
    description: "Custom mechanical keyboard with CNC aluminum case, polycarbonate plate, and pre-lubed linear red switches.",
    category: "keyboards",
    price: 8999,
    currency: "INR",
    attributes: {
      brand: "CustomCraft",
      form_factor: "65%",
      switch_type: "Custom Linear Red",
      hot_swappable: true,
      wireless: true,
      case_material: "CNC Anodized Aluminum",
      gasket_mount: true
    },
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "3-4 days",
    status: "ACTIVE",
    stock: 5
  },

  // 5. Mice
  {
    sku: "MS-ERG-001",
    name: "MasterGrip MX Ergonomic",
    description: "High-precision wireless ergonomic mouse with MagSpeed electromagnetic scroll wheel and thumb gestures.",
    category: "mice",
    price: 7499,
    currency: "INR",
    attributes: {
      brand: "MasterGrip",
      sensor: "Darkfield 8000 DPI",
      wireless: true,
      multi_device: true,
      battery_days: 70,
      ergonomic_angle: "57 degrees",
      silent_clicks: true
    },
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 19
  },
  {
    sku: "MS-GAM-002",
    name: "HyperGlide Ultralight Gaming Mouse",
    description: "58-gram ultra-lightweight honeycomb gaming mouse with 26,000 DPI optical sensor and PTFE feet.",
    category: "mice",
    price: 3999,
    currency: "INR",
    attributes: {
      brand: "HyperGlide",
      weight_grams: 58,
      dpi: 26000,
      polling_rate_hz: 1000,
      wireless: true,
      rgb: true
    },
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-3 days",
    status: "ACTIVE",
    stock: 24
  },
  {
    sku: "MS-SLM-003",
    name: "SilentClick Portable Mouse",
    description: "Whisper-quiet optical travel mouse with dual Bluetooth and 2.4GHz receiver connectivity.",
    category: "mice",
    price: 999,
    currency: "INR",
    attributes: {
      brand: "SilentClick",
      wireless: true,
      dpi: 1600,
      noise_reduction_pct: 90,
      battery_type: "1x AA"
    },
    rating: 4.3,
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 40
  },

  // 6. Monitors
  {
    sku: "MN-4K-001",
    name: "VisionView 27 4K Pro Display",
    description: "27-inch 4K IPS HDR400 color-accurate designer monitor with 90W USB-C charging and height-adjustable stand.",
    category: "monitors",
    price: 28999,
    currency: "INR",
    attributes: {
      brand: "VisionView",
      size_inch: 27,
      resolution: "3840x2160 (4K)",
      panel: "IPS",
      color_gamut: "99% sRGB / 95% DCI-P3",
      usb_c_power_w: 90,
      refresh_rate_hz: 60
    },
    rating: 4.7,
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-4 days",
    status: "ACTIVE",
    stock: 9
  },
  {
    sku: "MN-GAM-002",
    name: "SpeedCurve 34 Ultrawide Curved Monitor",
    description: "34-inch WQHD 144Hz 1500R curved gaming monitor with 1ms response time and FreeSync Premium.",
    category: "monitors",
    price: 36999,
    currency: "INR",
    attributes: {
      brand: "SpeedCurve",
      size_inch: 34,
      aspect_ratio: "21:9 Ultrawide",
      resolution: "3440x1440",
      curvature: "1500R",
      refresh_rate_hz: 144,
      response_time_ms: 1
    },
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "3-5 days",
    status: "ACTIVE",
    stock: 5
  },
  {
    sku: "MN-FHD-003",
    name: "ClearEdge 24 IPS Office Monitor",
    description: "Slim bezel 24-inch Full HD eye-care office display with low blue light and flicker-free technology.",
    category: "monitors",
    price: 9499,
    currency: "INR",
    attributes: {
      brand: "ClearEdge",
      size_inch: 24,
      resolution: "1920x1080 (FHD)",
      panel: "IPS",
      refresh_rate_hz: 75,
      ports: ["HDMI 1.4", "VGA"]
    },
    rating: 4.4,
    imageUrl: "https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-3 days",
    status: "ACTIVE",
    stock: 16
  },

  // 7. Webcams
  {
    sku: "WC-4K-001",
    name: "StreamClear 4K Ultra Webcam",
    description: "4K 60FPS AI-framing professional webcam with HDR sensor and dual stereo noise-cancelling mics.",
    category: "webcams",
    price: 8499,
    currency: "INR",
    attributes: {
      brand: "StreamClear",
      resolution: "4K @ 60fps",
      fov_degrees: 90,
      auto_focus: true,
      ai_framing: true,
      privacy_shutter: true,
      connection: "USB-C"
    },
    rating: 4.6,
    imageUrl: "https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 11
  },
  {
    sku: "WC-FHD-002",
    name: "FocusHD 1080p Stream Cam",
    description: "Full HD 1080p 60fps webcam with built-in ring light and tripod mount for conference calls and streaming.",
    category: "webcams",
    price: 3499,
    currency: "INR",
    attributes: {
      brand: "FocusHD",
      resolution: "1080p @ 60fps",
      fov_degrees: 78,
      ring_light: "3-level adjustable",
      microphone: "Omnidirectional"
    },
    rating: 4.3,
    imageUrl: "https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-3 days",
    status: "ACTIVE",
    stock: 22
  },

  // 8. Speakers
  {
    sku: "SP-360-001",
    name: "BassBoom 360 Spatial Speaker",
    description: "360-degree omnidirectional wireless speaker with punchy dual passive radiators and IPX7 waterproofing.",
    category: "speakers",
    price: 4799,
    currency: "INR",
    attributes: {
      brand: "BassBoom",
      power_output_w: 30,
      wireless: true,
      battery_hours: 18,
      ip_rating: "IPX7",
      party_pair: true
    },
    rating: 4.5,
    imageUrl: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 17
  },
  {
    sku: "SP-STU-002",
    name: "StudioSound Hi-Fi Desktop Monitors",
    description: "Pair of active powered desktop reference speakers with Bluetooth 5.0 and optical/RCA audio inputs.",
    category: "speakers",
    price: 11999,
    currency: "INR",
    attributes: {
      brand: "StudioSound",
      configuration: "2.0 Bookshelf Pair",
      power_output_w: 60,
      inputs: ["Bluetooth 5.0", "RCA", "Optical", "AUX"],
      wood_enclosure: true
    },
    rating: 4.8,
    imageUrl: "https://images.unsplash.com/photo-1543512214-318c7553f230?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "2-4 days",
    status: "ACTIVE",
    stock: 6
  },
  {
    sku: "SP-MIN-003",
    name: "SoundPocket Mini Clip",
    description: "Ultra-compact travel Bluetooth speaker with integrated carabiner clip and rugged shockproof chassis.",
    category: "speakers",
    price: 1299,
    currency: "INR",
    attributes: {
      brand: "SoundPocket",
      power_output_w: 5,
      wireless: true,
      battery_hours: 10,
      ip_rating: "IP67 Dust & Water Proof",
      weight_grams: 190
    },
    rating: 4.2,
    imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "1-2 days",
    status: "ACTIVE",
    stock: 30
  },
  {
    sku: "HP-OOS-005",
    name: "EchoZero Wireless ANC Headphones (Limited Edition)",
    description: "Limited collector edition noise cancelling headphones currently awaiting restock.",
    category: "headphones",
    price: 8999,
    currency: "INR",
    attributes: {
      brand: "EchoZero",
      wireless: true,
      anc: true,
      limited_edition: true
    },
    rating: 4.9,
    imageUrl: "https://images.unsplash.com/photo-1577174881658-0f30ed549adc?w=800&auto=format&fit=crop&q=80",
    deliveryEstimate: "5-7 days",
    status: "ACTIVE",
    stock: 0 // Out of stock to test inventory constraints
  }
];

export async function seed() {
  console.log("🌱 Starting TechKart Merchant seed...");

  // 1. Create or get TechKart Merchant
  const merchant = await prisma.merchant.upsert({
    where: {
      id: "00000000-0000-0000-0000-000000000001"
    },
    update: {
      name: "TechKart Electronics",
      description: "Premier AI-Ready Consumer Electronics & Computing Store",
      currency: "INR",
      status: "ACTIVE"
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "TechKart Electronics",
      description: "Premier AI-Ready Consumer Electronics & Computing Store",
      currency: "INR",
      status: "ACTIVE"
    }
  });

  console.log(`✅ Merchant initialized: ${merchant.name} (${merchant.id})`);

  // 2. Upsert Products & Inventory
  let createdCount = 0;
  let updatedCount = 0;

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { sku: p.sku },
      include: { inventory: true }
    });

    if (existing) {
      await prisma.product.update({
        where: { sku: p.sku },
        data: {
          name: p.name,
          description: p.description,
          category: p.category.toLowerCase(),
          price: p.price,
          currency: p.currency,
          attributes: p.attributes,
          rating: p.rating,
          imageUrl: p.imageUrl,
          deliveryEstimate: p.deliveryEstimate,
          status: p.status,
          inventory: {
            upsert: {
              create: {
                availableQuantity: p.stock,
                reservedQuantity: 0
              },
              update: {
                availableQuantity: p.stock
              }
            }
          }
        }
      });
      updatedCount++;
    } else {
      await prisma.product.create({
        data: {
          merchantId: merchant.id,
          sku: p.sku,
          name: p.name,
          description: p.description,
          category: p.category.toLowerCase(),
          price: p.price,
          currency: p.currency,
          attributes: p.attributes,
          rating: p.rating,
          imageUrl: p.imageUrl,
          deliveryEstimate: p.deliveryEstimate,
          status: p.status,
          inventory: {
            create: {
              availableQuantity: p.stock,
              reservedQuantity: 0
            }
          }
        }
      });
      createdCount++;
    }
  }

  console.log(`✅ Products seeded: ${createdCount} created, ${updatedCount} updated across ${PRODUCTS.length} total catalog items.`);
}

if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  seed()
    .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
