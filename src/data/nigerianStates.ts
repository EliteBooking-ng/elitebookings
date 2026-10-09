// All 36 Nigerian states + FCT. Shared across MovingRequestModal's
// pickup/drop-off state pickers and the Hotels/Shortlets/Cars destination
// pickers — previously duplicated locally inside MovingRequestModal.tsx.
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT (Abuja)', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano',
  'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

// The 3 states/cities Elite Booking actually has live inventory in today —
// used to filter NIGERIAN_STATES down to the "we don't cover this yet" set
// for the Request a Service fallback pickers.
export const COVERED_STATES = ['Lagos', 'FCT (Abuja)', 'Rivers'];

export const UNCOVERED_STATES = NIGERIAN_STATES.filter((s) => !COVERED_STATES.includes(s));
