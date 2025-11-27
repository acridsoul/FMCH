/**
 * Comprehensive list of film production equipment
 * Organized by category for easy selection
 */

export interface EquipmentCategory {
  category: string;
  items: string[];
}

export const FILM_EQUIPMENT: EquipmentCategory[] = [
  {
    category: 'Cameras',
    items: [
      'Cinema Camera',
      'DSLR Camera',
      'Mirrorless Camera',
      'Film Camera (35mm)',
      'Film Camera (16mm)',
      'Action Camera',
      'Drone Camera',
      'High-Speed Camera',
      'Underwater Camera Housing',
      'Camera Body',
      'Camera Cage',
      'Follow Focus',
      'Matte Box',
      'Camera Monitor',
      'Video Transmitter',
    ],
  },
  {
    category: 'Lenses',
    items: [
      'Prime Lens (Wide)',
      'Prime Lens (Standard)',
      'Prime Lens (Telephoto)',
      'Zoom Lens',
      'Anamorphic Lens',
      'Macro Lens',
      'Fisheye Lens',
      'Tilt-Shift Lens',
      'Lens Adapter',
      'Lens Filter (ND)',
      'Lens Filter (Polarizer)',
      'Lens Filter (UV)',
    ],
  },
  {
    category: 'Lighting',
    items: [
      'LED Panel',
      'Fresnel Light',
      'Tungsten Light',
      'HMI Light',
      'Softbox',
      'Ring Light',
      'Practical Lights',
      'Kino Flo',
      'China Ball',
      'Light Stand',
      'C-Stand',
      'Sandbag',
      'Diffusion Frame',
      'Reflector (Silver)',
      'Reflector (Gold)',
      'Reflector (White)',
      'Flag (4x4)',
      'Flag (2x3)',
      'Scrim',
      'Bounce Board',
      'Gel Sheets (CTB)',
      'Gel Sheets (CTO)',
      'Dimmer',
      'Light Meter',
    ],
  },
  {
    category: 'Grip Equipment',
    items: [
      'Tripod',
      'Fluid Head',
      'Dolly',
      'Slider',
      'Jib Arm',
      'Crane',
      'Steadicam',
      'Gimbal Stabilizer',
      'Shoulder Rig',
      'Monopod',
      'Tripod Spreader',
      'Apple Box (Full)',
      'Apple Box (Half)',
      'Apple Box (Quarter)',
      'Apple Box (Pancake)',
      'Ladder',
      'Scaffold',
      'Rigging Hardware',
      'Rope',
      'Bungee Cords',
      'Gaffer Tape',
      'Clamps',
      'Speed Rail',
    ],
  },
  {
    category: 'Audio Equipment',
    items: [
      'Boom Microphone',
      'Shotgun Microphone',
      'Lavalier Microphone',
      'Wireless Microphone System',
      'Boom Pole',
      'Audio Recorder',
      'Audio Mixer',
      'Headphones (Monitoring)',
      'XLR Cables',
      'Audio Interface',
      'Windscreen',
      'Dead Cat (Wind Protection)',
      'Shock Mount',
      'Microphone Stand',
    ],
  },
  {
    category: 'Power & Cables',
    items: [
      'Generator',
      'Power Distribution Box',
      'Extension Cables',
      'Power Strip',
      'Battery (V-Mount)',
      'Battery (Gold Mount)',
      'Battery Charger',
      'AC Adapter',
      'Cable Ties',
      'SDI Cable',
      'HDMI Cable',
      'BNC Cable',
      'Ethernet Cable',
    ],
  },
  {
    category: 'Production Design',
    items: [
      'Green Screen',
      'Blue Screen',
      'Backdrop Stand',
      'Backdrop (White)',
      'Backdrop (Black)',
      'Backdrop (Colored)',
      'Props',
      'Set Dressing',
      'Furniture',
      'Curtains/Drapes',
      'Fake Plants',
      'Picture Frames',
    ],
  },
  {
    category: 'Data Management',
    items: [
      'Memory Card (SD)',
      'Memory Card (CF)',
      'Memory Card (CFexpress)',
      'SSD Drive',
      'Hard Drive',
      'Card Reader',
      'DIT Cart',
      'Laptop',
      'Monitor (Computer)',
    ],
  },
  {
    category: 'Wardrobe & Makeup',
    items: [
      'Wardrobe Rack',
      'Steamer',
      'Iron',
      'Makeup Kit',
      'Makeup Mirror',
      'Hair Dryer',
      'Curling Iron',
      'Brushes & Combs',
    ],
  },
  {
    category: 'Transportation',
    items: [
      'Production Van',
      'Truck',
      'Trailer',
      'Equipment Cart',
      'Road Cases',
      'Pelican Cases',
    ],
  },
  {
    category: 'Safety Equipment',
    items: [
      'First Aid Kit',
      'Fire Extinguisher',
      'Safety Vest',
      'Hard Hat',
      'Safety Goggles',
      'Gloves',
      'Earplugs',
    ],
  },
  {
    category: 'Communication',
    items: [
      'Walkie-Talkie',
      'Two-Way Radio',
      'Bullhorn/Megaphone',
      'Slate/Clapperboard',
      'Digital Slate',
    ],
  },
  {
    category: 'Weather Protection',
    items: [
      'Rain Cover (Camera)',
      'Tent/Canopy',
      'Umbrella',
      'Tarp',
      'Blankets',
    ],
  },
  {
    category: 'Special Equipment',
    items: [
      'Smoke Machine',
      'Fog Machine',
      'Wind Machine',
      'Rain Machine',
      'Bubble Machine',
      'Confetti Cannon',
      'Helicopter/Aerial Equipment',
      'Vehicle Rig',
      'Car Mount',
      'Suction Cup Mount',
      'Crash Cam',
    ],
  },
  {
    category: 'Post-Production',
    items: [
      'Color Calibration Monitor',
      'Reference Monitor',
      'Editing Workstation',
      'Graphics Tablet',
      'Control Surface',
      'Speakers (Monitoring)',
    ],
  },
];

/**
 * Get all equipment items as a flat array
 */
export function getAllEquipment(): string[] {
  return FILM_EQUIPMENT.flatMap((category) => category.items).sort();
}

/**
 * Get equipment items grouped by category
 */
export function getEquipmentByCategory(): EquipmentCategory[] {
  return FILM_EQUIPMENT;
}

/**
 * Search equipment by query
 */
export function searchEquipment(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  return getAllEquipment().filter((item) =>
    item.toLowerCase().includes(lowerQuery)
  );
}
