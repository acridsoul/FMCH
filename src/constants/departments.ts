// Film Production Departments
// These departments align with the database constraint in profiles table

export const DEPARTMENTS = [
  { value: 'camera', label: 'Camera Department' },
  { value: 'sound', label: 'Sound Department' },
  { value: 'lighting', label: 'Lighting Department' },
  { value: 'art', label: 'Art Department' },
  { value: 'production', label: 'Production Department' },
  { value: 'costume', label: 'Costume Department' },
  { value: 'makeup', label: 'Makeup & Hair Department' },
  { value: 'post_production', label: 'Post Production Department' },
  { value: 'vfx', label: 'VFX Department' },
  { value: 'stunts', label: 'Stunts Department' },
  { value: 'transport', label: 'Transport Department' },
  { value: 'catering', label: 'Catering Department' },
] as const;

export type DepartmentValue = typeof DEPARTMENTS[number]['value'];

// Helper function to get department label from value
export function getDepartmentLabel(value: DepartmentValue): string {
  const department = DEPARTMENTS.find(d => d.value === value);
  return department?.label || value;
}

// Helper function to check if a value is a valid department
export function isValidDepartment(value: string): value is DepartmentValue {
  return DEPARTMENTS.some(d => d.value === value);
}
