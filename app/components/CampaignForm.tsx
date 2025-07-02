'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COUNTRIES, getLanguagesByCountry, CampaignInput, MatchTypeStrategy, KeywordDensity } from '../types/campaign';
import { Loader2, Globe, Target, Zap, Settings, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

const campaignSchema = z.object({
  productDescription: z.string().min(10, 'Product description must be at least 10 characters').max(500, 'Product description must be less than 500 characters'),
  finalUrl: z.string().url('Please enter a valid URL'),
  targetCountry: z.string().min(1, 'Please select a target country'),
  campaignLanguage: z.string().min(1, 'Please select a campaign language'),
  brandName: z.string().optional(),
  uniqueSellingPoint1: z.string().optional(),
  uniqueSellingPoint2: z.string().optional(),
  uniqueSellingPoint3: z.string().optional(),
  price: z.number().optional(),
  matchTypeStrategy: z.enum(['conservative', 'balanced', 'aggressive']),
  keywordDensity: z.enum(['low', 'medium', 'high']),
  // AI Settings
  apiKey: z.string().min(1, 'OpenAI API key is required'),
  aiModel: z.string().optional(),
  maxTokens: z.number().min(1000).max(32000).optional(),
  customPrompt: z.string().optional(),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  onSubmit: (data: CampaignInput) => void;
  isLoading: boolean;
}

export default function CampaignForm({ onSubmit, isLoading }: CampaignFormProps) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<any[]>([]);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [savedApiKey, setSavedApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      matchTypeStrategy: 'balanced',
      keywordDensity: 'medium',
      aiModel: 'gpt-4o-2024-08-06',
      maxTokens: 16000,
      apiKey: '',
    },
  });

  // Load API key from localStorage on mount
  React.useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setSavedApiKey(storedApiKey);
      setValue('apiKey', storedApiKey);
    }
  }, [setValue]);

  const watchedCountry = watch('targetCountry');
  const watchedAiModel = watch('aiModel');

  // Update available languages when country changes
  React.useEffect(() => {
    if (watchedCountry) {
      const languages = getLanguagesByCountry(watchedCountry);
      setAvailableLanguages(languages);
      if (languages.length === 1) {
        setValue('campaignLanguage', languages[0].code);
      } else {
        setValue('campaignLanguage', '');
      }
    }
  }, [watchedCountry, setValue]);

  // Update max tokens when model changes
  React.useEffect(() => {
    if (watchedAiModel && (watchedAiModel.startsWith('o1') || watchedAiModel.startsWith('o3') || watchedAiModel.startsWith('o4'))) {
      setValue('maxTokens', 16000); // Higher default for O-series to prevent truncation
    } else if (watchedAiModel) {
      setValue('maxTokens', 8000); // Standard default for GPT models
    }
  }, [watchedAiModel, setValue]);

  const onFormSubmit = (data: CampaignFormData) => {
    const selectedCountryData = COUNTRIES.find(c => c.code === data.targetCountry);
    
    // Save API key to localStorage for future use
    if (data.apiKey) {
      localStorage.setItem('openai_api_key', data.apiKey);
    }
    
    const campaignInput: CampaignInput = {
      productDescription: data.productDescription,
      finalUrl: data.finalUrl,
      targetCountry: data.targetCountry,
      campaignLanguage: data.campaignLanguage,
      brandName: data.brandName || undefined,
      uniqueSellingPoints: [
        data.uniqueSellingPoint1,
        data.uniqueSellingPoint2,
        data.uniqueSellingPoint3,
      ].filter(Boolean) as string[],
      price: data.price,
      currency: selectedCountryData?.currency,
      matchTypeStrategy: data.matchTypeStrategy,
      keywordDensity: data.keywordDensity,
      apiKey: data.apiKey,
      aiModel: data.aiModel || undefined,
      maxTokens: data.maxTokens || undefined,
      customPrompt: data.customPrompt,
    };

    onSubmit(campaignInput);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Google Ads Campaign Generator</h1>
        <p className="text-gray-600">AI-powered tool to generate complete Google Ads Search campaigns with keyword research and ad copy creation</p>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Product Information */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-600" />
            Product Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="productDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Product Description*
              </label>
              <textarea
                {...register('productDescription')}
                id="productDescription"
                rows={4}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your product or service in detail..."
              />
              <div className="flex justify-between mt-1">
                <p className="text-sm text-red-600">{errors.productDescription?.message}</p>
                <p className="text-sm text-gray-500">{watch('productDescription')?.length || 0}/500</p>
              </div>
            </div>

            <div>
              <label htmlFor="finalUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Final URL*
              </label>
              <input
                {...register('finalUrl')}
                type="url"
                id="finalUrl"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com/product"
              />
              <p className="text-sm text-red-600 mt-1">{errors.finalUrl?.message}</p>
            </div>

            <div>
              <label htmlFor="brandName" className="block text-sm font-medium text-gray-700 mb-1">
                Brand Name (Optional)
              </label>
              <input
                {...register('brandName')}
                type="text"
                id="brandName"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your brand name"
              />
            </div>
          </div>
        </div>

        {/* Unique Selling Points */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-green-600" />
            Unique Selling Points (Optional)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <input
                {...register('uniqueSellingPoint1')}
                type="text"
                placeholder="USP 1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                {...register('uniqueSellingPoint2')}
                type="text"
                placeholder="USP 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <input
                {...register('uniqueSellingPoint3')}
                type="text"
                placeholder="USP 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Geographic Targeting */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-purple-600" />
            Geographic & Language Targeting
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="targetCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Target Country*
              </label>
              <select
                {...register('targetCountry')}
                id="targetCountry"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-red-600 mt-1">{errors.targetCountry?.message}</p>
            </div>

            <div>
              <label htmlFor="campaignLanguage" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Language*
              </label>
              <select
                {...register('campaignLanguage')}
                id="campaignLanguage"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!watchedCountry}
              >
                <option value="">Select a language</option>
                {availableLanguages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-red-600 mt-1">{errors.campaignLanguage?.message}</p>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Price (Optional)
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                {COUNTRIES.find(c => c.code === watchedCountry)?.currency || 'USD'}
              </span>
              <input
                {...register('price', { 
                  setValueAs: (value) => {
                    if (!value || value.trim() === '') {
                      return undefined;
                    }
                    const num = parseFloat(value);
                    return isNaN(num) ? undefined : num;
                  }
                })}
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                id="price"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter price (optional)"
              />
            </div>
          </div>
        </div>

        {/* Campaign Strategy */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Campaign Strategy</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Match Type Strategy*
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    {...register('matchTypeStrategy')}
                    type="radio"
                    value="conservative"
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Conservative</strong> - Exact match only
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('matchTypeStrategy')}
                    type="radio"
                    value="balanced"
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Balanced</strong> - Exact + Phrase match
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('matchTypeStrategy')}
                    type="radio"
                    value="aggressive"
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Aggressive</strong> - All match types
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Keyword Density*
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    {...register('keywordDensity')}
                    type="radio"
                    value="low"
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Low</strong> - 5-7 keywords per ad group
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('keywordDensity')}
                    type="radio"
                    value="medium"
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>Medium</strong> - 8-10 keywords per ad group
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    {...register('keywordDensity')}
                    type="radio"
                    value="high"
                    className="mr-2"
                  />
                  <span className="text-sm">
                    <strong>High</strong> - 10-15 keywords per ad group
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* AI Settings */}
        <div className="border rounded-lg p-6">
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="w-full flex items-center justify-between text-xl font-semibold mb-4 hover:text-blue-600 transition-colors"
          >
            <div className="flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-600" />
              AI Settings (Advanced)
            </div>
            {showAdvancedSettings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showAdvancedSettings && (
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                  OpenAI API Key*
                </label>
                <div className="relative">
                  <input
                    {...register('apiKey')}
                    type={showApiKey ? "text" : "password"}
                    id="apiKey"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and never sent to our servers</p>
                <p className="text-sm text-red-600">{errors.apiKey?.message}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="aiModel" className="block text-sm font-medium text-gray-700 mb-1">
                    AI Model
                  </label>
                  <select
                    {...register('aiModel')}
                    id="aiModel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <optgroup label="Latest GPT-4 Models">
                      <option value="gpt-4.5-preview-2025-02-27">GPT-4.5 Preview (Most Advanced - $37.50/1M)</option>
                      <option value="gpt-4.1-2025-04-14">GPT-4.1 (Efficient - $1.00/1M)</option>
                      <option value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini (Fast - $0.20/1M)</option>
                      <option value="gpt-4.1-nano-2025-04-14">GPT-4.1 Nano (Fastest - $0.05/1M)</option>
                      <option value="gpt-4o-2024-08-06">GPT-4o (Recommended - $1.25/1M)</option>
                      <option value="gpt-4o-mini-2024-07-18">GPT-4o Mini ($0.075/1M)</option>
                    </optgroup>
                    <optgroup label="O-Series Models (Reasoning)">
                      <option value="o1-pro-2025-03-19">O1 Pro (Best Reasoning - $75/1M)</option>
                      <option value="o1-2024-12-17">O1 (Advanced - $7.50/1M)</option>
                      <option value="o1-mini-2024-09-12">O1 Mini ($0.55/1M)</option>
                      <option value="o3-pro-2025-06-10">O3 Pro ($10/1M)</option>
                      <option value="o3-2025-04-16">O3 (Good Balance - $1.00/1M)</option>
                      <option value="o3-mini-2025-01-31">O3 Mini ($0.55/1M)</option>
                      <option value="o4-mini-2025-04-16">O4 Mini (Cost Effective - $0.55/1M)</option>
                    </optgroup>
                    <optgroup label="GPT-4 Legacy">
                      <option value="gpt-4-turbo-2024-04-09">GPT-4 Turbo ($10/1M)</option>
                      <option value="gpt-4">GPT-4 ($30/1M)</option>
                    </optgroup>
                    <optgroup label="GPT-3.5">
                      <option value="gpt-3.5-turbo-0125">GPT-3.5 Turbo (Budget - $0.50/1M)</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Prices shown are for input tokens. O-series models offer advanced reasoning capabilities.</p>
                  <div className={`text-xs mt-2 p-2 rounded ${watch('aiModel')?.startsWith('o') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'hidden'}`}>
                    <strong>Tip:</strong> O-series models excel at reasoning but may need more tokens for large campaigns:
                    <ul className="list-disc list-inside mt-1">
                      <li>Consider increasing max tokens to 20000-32000 for comprehensive campaigns</li>
                      <li>These models provide excellent keyword research and ad copy quality</li>
                      <li>Allow extra time as O-series models process more thoroughly</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Tokens
                  </label>
                  <input
                    {...register('maxTokens', { 
                      setValueAs: (value) => {
                        if (value === '' || value === null || value === undefined) {
                          return undefined;
                        }
                        const num = parseInt(value);
                        return isNaN(num) ? undefined : num;
                      }
                    })}
                    type="number"
                    min="1000"
                    max="32000"
                    step="1000"
                    id="maxTokens"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Default: 16000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Higher values allow for larger campaigns (up to 32000)</p>
                  <p className="text-xs text-orange-600 mt-1">Note: O-series models (O1, O3, O4) use max_completion_tokens and can handle very large outputs</p>
                  <p className="text-sm text-red-600">{errors.maxTokens?.message}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Prompt Template
                </label>
                <div className="bg-gray-50 p-3 rounded-md border border-gray-200 text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                  <p className="whitespace-pre-wrap">
{`Generate a COMPREHENSIVE Search campaign with:
• AT LEAST 12 ad groups total (more is better!)
• 100+ total keywords across all ad groups
• Multiple ad groups per theme based on match type strategy
• 5-15 keywords per ad group (based on density setting)
• 2 RSAs per ad group (15 headlines, 4 descriptions each)
• 15-20 negative keywords

The AI will think exhaustively about ALL search intents:
- Generic product terms (multiple variations)
- Brand + product combinations
- Problem/solution keywords
- Feature-specific searches
- Comparison searches
- Location-based searches
- Intent-based searches (buy, purchase, order, shop, etc.)
- Quality modifiers (best, top, premium, cheap, affordable, etc.)
- Use case specific searches
- Seasonal or occasion-based searches

DO NOT STOP until AT LEAST 12 ad groups and 100+ keywords total!`}
                  </p>
                </div>
              </div>

              <div>
                <label htmlFor="customPrompt" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Instructions (Optional)
                </label>
                <textarea
                  {...register('customPrompt')}
                  id="customPrompt"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any specific instructions or requirements for the AI..."
                />
                <p className="text-xs text-gray-500 mt-1">These instructions will be appended to the default prompt</p>
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-8 rounded-lg flex items-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Campaign...</span>
              </>
            ) : (
              <span>Generate Campaign</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 