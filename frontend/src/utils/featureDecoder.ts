export const FEATURE_DECODERS: Record<string, Record<number, string>> = {
  gender: { 0: 'Male', 1: 'Female' },
  sex: { 0: 'Male', 1: 'Female' },
  race_binary: { 0: 'Non-White', 1: 'White' },
  race: { 0: 'Other', 1: 'White', 2: 'Black', 3: 'Asian', 4: 'Hispanic' },
  workclass: {
    0: 'Private',
    1: 'Self-employed',
    2: 'Government',
    3: 'Without pay',
    4: 'Never worked',
    5: 'Federal Gov',
    6: 'Local Gov',
    7: 'State Gov',
  },
  marital_status: {
    0: 'Married',
    1: 'Divorced',
    2: 'Never married',
    3: 'Separated',
    4: 'Widowed',
    5: 'Married (absent)',
    6: 'Married (AF)',
  },
  occupation: {
    0: 'Admin',
    1: 'Armed Forces',
    2: 'Craft',
    3: 'Exec/Manager',
    4: 'Farming',
    5: 'Handlers',
    6: 'Machine-op',
    7: 'Other service',
    8: 'Private service',
    9: 'Prof specialty',
    10: 'Protective',
    11: 'Sales',
    12: 'Tech support',
    13: 'Transport',
  },
  relationship: {
    0: 'Husband',
    1: 'Not in family',
    2: 'Other relative',
    3: 'Own child',
    4: 'Unmarried',
    5: 'Wife',
  },
  education: {
    0: 'Preschool',
    1: '1st-4th',
    2: '5th-6th',
    3: '7th-8th',
    4: '9th',
    5: '10th',
    6: '11th',
    7: '12th',
    8: 'HS grad',
    9: 'Some college',
    10: 'Assoc-voc',
    11: 'Assoc-acdm',
    12: 'Bachelors',
    13: 'Some college',
    14: 'Masters',
    15: 'Prof school',
    16: 'Doctorate',
  },
};

export function normalizeFeatureName(featureName: string): string {
  return featureName.toLowerCase().replace(/[.\s]/g, '_');
}

export function decodeFeature(featureName: string, value: unknown): string {
  if (typeof value !== 'number') {
    return String(value);
  }

  const key = normalizeFeatureName(featureName);
  return FEATURE_DECODERS[key]?.[value] ?? String(value);
}
