export interface CampaignInput {
  productDescription: string;
  finalUrl: string;
  targetCountry: string;
  campaignLanguage: string;
  brandName?: string;
  uniqueSellingPoints: string[];
  price?: number;
  currency?: string;
  matchTypeStrategy: MatchTypeStrategy;
  keywordDensity: KeywordDensity;
  // AI Settings
  apiKey: string;
  aiModel?: string;
  maxTokens?: number;
  customPrompt?: string;
}

export interface Country {
  code: string;
  name: string;
  languages: Language[];
  currency: string;
}

export interface Language {
  code: string;
  name: string;
}

export type MatchTypeStrategy = 'conservative' | 'balanced' | 'aggressive';
export type KeywordDensity = 'low' | 'medium' | 'high';

export interface KeywordVariant {
  keyword: string;
  matchType: 'exact' | 'phrase' | 'broad';
}

export interface ResponsiveSearchAd {
  headlines: string[];
  descriptions: string[];
}

export interface AdGroup {
  name: string;
  matchType: 'exact' | 'phrase' | 'broad';
  keywords: KeywordVariant[];
  ads: ResponsiveSearchAd[];
}

export interface KeywordTheme {
  theme: string;
  adGroups: AdGroup[];
}

export interface GeneratedCampaign {
  campaignName: string;
  finalUrl?: string;
  themes: KeywordTheme[];
  negativeKeywords: string[];
  bidStrategy?: string;
  adExtensions?: {
    sitelinks?: string[];
    callouts?: string[];
  };
}

export interface CampaignGenerationRequest {
  input: CampaignInput;
}

export interface CampaignGenerationResponse {
  success: boolean;
  campaign?: GeneratedCampaign;
  error?: string;
}

// Country and language data
export const COUNTRIES: Country[] = [
  {
    code: 'US',
    name: 'United States',
    languages: [{ code: 'en', name: 'English' }],
    currency: 'USD'
  },
  {
    code: 'UK',
    name: 'United Kingdom',
    languages: [{ code: 'en', name: 'English' }],
    currency: 'GBP'
  },
  {
    code: 'CA',
    name: 'Canada',
    languages: [
      { code: 'en', name: 'English' },
      { code: 'fr', name: 'French' }
    ],
    currency: 'CAD'
  },
  {
    code: 'AU',
    name: 'Australia',
    languages: [{ code: 'en', name: 'English' }],
    currency: 'AUD'
  },
  {
    code: 'DE',
    name: 'Germany',
    languages: [{ code: 'de', name: 'German' }],
    currency: 'EUR'
  },
  {
    code: 'FR',
    name: 'France',
    languages: [{ code: 'fr', name: 'French' }],
    currency: 'EUR'
  },
  {
    code: 'ES',
    name: 'Spain',
    languages: [{ code: 'es', name: 'Spanish' }],
    currency: 'EUR'
  },
  {
    code: 'IT',
    name: 'Italy',
    languages: [{ code: 'it', name: 'Italian' }],
    currency: 'EUR'
  },
  {
    code: 'NL',
    name: 'Netherlands',
    languages: [{ code: 'nl', name: 'Dutch' }],
    currency: 'EUR'
  },
  {
    code: 'BR',
    name: 'Brazil',
    languages: [{ code: 'pt', name: 'Portuguese' }],
    currency: 'BRL'
  },
  {
    code: 'MX',
    name: 'Mexico',
    languages: [{ code: 'es', name: 'Spanish' }],
    currency: 'MXN'
  },
  {
    code: 'PL',
    name: 'Poland',
    languages: [{ code: 'pl', name: 'Polish' }],
    currency: 'PLN'
  }
];

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(country => country.code === code);
};

export const getLanguagesByCountry = (countryCode: string): Language[] => {
  const country = getCountryByCode(countryCode);
  return country?.languages || [];
}; 