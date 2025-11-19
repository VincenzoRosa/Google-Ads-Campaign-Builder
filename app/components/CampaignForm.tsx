'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { COUNTRIES, getLanguagesByCountry, CampaignInput, MatchTypeStrategy, KeywordDensity } from '../types/campaign';
import { Loader2, Globe, Target, Zap } from 'lucide-react';
import AISettings from './AISettings';

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
  maxTokens: z.number().min(1000).max(128000).optional(),
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
      aiModel: 'gpt-5',
      maxTokens: 64000,
      apiKey: '',
    },
  });



  const watchedCountry = watch('targetCountry');

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

  const onFormSubmit = (data: CampaignFormData) => {
    const selectedCountryData = COUNTRIES.find(c => c.code === data.targetCountry);
    
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-baseline">
          Google Ads Campaign Generator
          <span className="ml-3 text-sm font-normal text-gray-400">v1.2</span>
        </h1>
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
        <AISettings
          register={register}
          setValue={setValue}
          watch={watch}
          errors={errors}
          showAdvancedSettings={showAdvancedSettings}
          onShowAdvancedSettingsChange={setShowAdvancedSettings}
        />

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