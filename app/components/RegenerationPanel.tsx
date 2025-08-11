'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GeneratedCampaign } from '../types/campaign';
import { RefreshCw, Target, FileText, Zap, Loader2, AlertCircle, CheckCircle, Settings, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface RegenerationPanelProps {
  campaign: GeneratedCampaign;
  onRegenerationComplete: (updatedCampaign: GeneratedCampaign) => void;
  onClose: () => void;
}

const aiSettingsSchema = z.object({
  apiKey: z.string().min(1, 'OpenAI API key is required'),
  aiModel: z.string().optional(),
  maxTokens: z.number().min(1000).max(128000).optional(),
  customPrompt: z.string().optional(),
});

type AISettingsData = z.infer<typeof aiSettingsSchema>;

export default function RegenerationPanel({ campaign, onRegenerationComplete, onClose }: RegenerationPanelProps) {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [regenerationType, setRegenerationType] = useState<'keywords' | 'rsa' | 'both'>('both');
  const [targetScope, setTargetScope] = useState<'all' | 'theme' | 'adgroup'>('all');
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [selectedAdGroup, setSelectedAdGroup] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm<AISettingsData>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: {
      aiModel: 'gpt-4o-2024-08-06',
      maxTokens: 16000,
      apiKey: '',
    },
  });

  // Load API key from localStorage on mount
  React.useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setValue('apiKey', storedApiKey);
    }
  }, [setValue]);

  const watchedAiModel = watch('aiModel');

  // Update max tokens when model changes
  React.useEffect(() => {
    if (watchedAiModel && watchedAiModel.startsWith('gpt-5')) {
      setValue('maxTokens', 64000); // GPT-5 models support up to 128K tokens
    } else if (watchedAiModel && (watchedAiModel.startsWith('o1') || watchedAiModel.startsWith('o3') || watchedAiModel.startsWith('o4'))) {
      setValue('maxTokens', 16000);
    } else if (watchedAiModel) {
      setValue('maxTokens', 8000);
    }
  }, [watchedAiModel, setValue]);

  const handleRegeneration = async (aiSettings: AISettingsData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Save API key to localStorage for future use
    if (aiSettings.apiKey) {
      localStorage.setItem('openai_api_key', aiSettings.apiKey);
    }

    try {
      const response = await fetch('/api/regenerate-campaign-part', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign: campaign,
          regenerationType: regenerationType,
          apiKey: aiSettings.apiKey,
          aiModel: aiSettings.aiModel,
          maxTokens: aiSettings.maxTokens,
          customPrompt: aiSettings.customPrompt,
          targetThemeIndex: targetScope === 'theme' ? parseInt(selectedTheme) : undefined,
          targetAdGroupIndex: targetScope === 'adgroup' ? selectedAdGroup : undefined,
        }),
      });

      const data = await response.json();

      if (data.success && data.campaign) {
        onRegenerationComplete(data.campaign);
        setSuccess('Campaign parts regenerated successfully!');
        
        // Close the panel after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Failed to regenerate campaign parts');
      }
    } catch (err) {
      console.error('Regeneration error:', err);
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRegenerationDescription = () => {
    switch (regenerationType) {
      case 'keywords':
        return 'Generate new keywords for the selected ad groups';
      case 'rsa':
        return 'Generate new Responsive Search Ads for the selected ad groups';
      case 'both':
        return 'Generate both new keywords and Responsive Search Ads';
      default:
        return '';
    }
  };

  const getScopeDescription = () => {
    switch (targetScope) {
      case 'all':
        return 'Regenerate for all ad groups in the campaign';
      case 'theme':
        return `Regenerate for ad groups in the "${selectedTheme}" theme`;
      case 'adgroup':
        return `Regenerate for the "${selectedAdGroup}" ad group only`;
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <RefreshCw className="w-6 h-6 mr-2 text-blue-600" />
              Regenerate Campaign Parts
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(handleRegeneration)} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
                {error.includes('too similar') && (
                  <div className="mt-3 p-3 bg-red-100 rounded border border-red-300">
                    <p className="text-red-800 text-sm font-medium mb-2">💡 Tips for better regeneration:</p>
                    <ul className="text-red-700 text-sm space-y-1">
                      <li>• Add specific instructions in the custom prompt field</li>
                      <li>• Try different AI models (GPT-4o vs O-series)</li>
                      <li>• Increase Max Tokens for more creative output</li>
                      <li>• Be more specific about what you want to change</li>
                      <li>• Try regenerating only keywords or only ads first</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <h3 className="text-green-800 font-medium">Success</h3>
                <p className="text-green-700 text-sm mt-1">{success}</p>
              </div>
            </div>
          )}

          {/* Regeneration Type Selection */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-blue-600" />
              What to Regenerate
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="keywords"
                  checked={regenerationType === 'keywords'}
                  onChange={(e) => setRegenerationType(e.target.value as 'keywords' | 'rsa' | 'both')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Keywords Only</div>
                  <div className="text-sm text-gray-600">Generate new keywords for the selected ad groups</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="rsa"
                  checked={regenerationType === 'rsa'}
                  onChange={(e) => setRegenerationType(e.target.value as 'keywords' | 'rsa' | 'both')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Responsive Search Ads Only</div>
                  <div className="text-sm text-gray-600">Generate new ad copy for the selected ad groups</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="both"
                  checked={regenerationType === 'both'}
                  onChange={(e) => setRegenerationType(e.target.value as 'keywords' | 'rsa' | 'both')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Both Keywords and Ads</div>
                  <div className="text-sm text-gray-600">Generate both new keywords and ad copy together</div>
                </div>
              </label>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Selected:</strong> {getRegenerationDescription()}
              </p>
            </div>
          </div>

          {/* Scope Selection */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-600" />
              Regeneration Scope
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="all"
                  checked={targetScope === 'all'}
                  onChange={(e) => setTargetScope(e.target.value as 'all' | 'theme' | 'adgroup')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Entire Campaign</div>
                  <div className="text-sm text-gray-600">Regenerate for all ad groups</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="theme"
                  checked={targetScope === 'theme'}
                  onChange={(e) => setTargetScope(e.target.value as 'all' | 'theme' | 'adgroup')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Specific Theme</div>
                  <div className="text-sm text-gray-600">Regenerate for one theme only</div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  value="adgroup"
                  checked={targetScope === 'adgroup'}
                  onChange={(e) => setTargetScope(e.target.value as 'all' | 'theme' | 'adgroup')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium">Specific Ad Group</div>
                  <div className="text-sm text-gray-600">Regenerate for one ad group only</div>
                </div>
              </label>
            </div>

            {/* Theme Selection */}
            {targetScope === 'theme' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Theme
                </label>
                <select
                  value={selectedTheme}
                  onChange={(e) => setSelectedTheme(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a theme...</option>
                  {campaign.themes.map((theme, index) => (
                    <option key={index} value={index.toString()}>
                      {theme.theme}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ad Group Selection */}
            {targetScope === 'adgroup' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Ad Group
                </label>
                <select
                  value={selectedAdGroup}
                  onChange={(e) => setSelectedAdGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose an ad group...</option>
                  {campaign.themes.map((theme, themeIndex) => 
                    theme.adGroups.map((adGroup, adGroupIndex) => (
                      <option key={`${themeIndex}-${adGroupIndex}`} value={`${themeIndex}-${adGroupIndex}`}>
                        {theme.theme} - {adGroup.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Scope:</strong> {getScopeDescription()}
              </p>
            </div>
          </div>

          {/* Tips for Better Regeneration */}
          <div className="border rounded-lg p-4 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">💡 Tips for Better Results:</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Use "Additional Instructions" to specify exactly what you want to change</li>
              <li>• Try different AI models (O-series models are great for creative variations)</li>
              <li>• Increase Max Tokens for more comprehensive regeneration</li>
              <li>• Be specific about tone, style, or focus areas in your instructions</li>
            </ul>
          </div>

          {/* AI Settings */}
          <div className="border rounded-lg p-6 bg-gray-50">
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
                  <p className="text-sm text-red-600">{errors.apiKey?.message as string}</p>
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
                      <optgroup label="GPT-5 Models (Latest Generation - Released Aug 2025)">
                        <option value="gpt-5">GPT-5 (Advanced Reasoning - $1.25/$10.00 per 1M)</option>
                        <option value="gpt-5-mini">GPT-5 Mini (Cost-Effective - $0.25/$2.00 per 1M)</option>
                        <option value="gpt-5-nano">GPT-5 Nano (High-Speed - $0.05/$0.40 per 1M)</option>
                      </optgroup>
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
                    <p className="text-xs text-gray-500 mt-1">Prices shown are input/output tokens per million. GPT-5 models offer state-of-the-art performance with deep reasoning. O-series models offer advanced reasoning capabilities.</p>
                    <div className={`text-xs mt-2 p-2 rounded ${watchedAiModel?.startsWith('gpt-5') ? 'bg-blue-50 text-blue-800 border border-blue-200' : watchedAiModel?.startsWith('o') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'hidden'}`}>
                      {watchedAiModel?.startsWith('gpt-5') ? (
                        <>
                          <strong>Tip:</strong> GPT-5 models offer the most advanced capabilities:
                          <ul className="list-disc list-inside mt-1">
                            <li>Support up to 128,000 completion tokens</li>
                            <li>Advanced deep reasoning and multimodal processing</li>
                            <li>Significantly reduced hallucinations</li>
                            <li>Uses max_completion_tokens parameter (not max_tokens)</li>
                            <li>Temperature fixed at 1.0 (custom values not supported)</li>
                            <li>Excellent for creating comprehensive, high-quality campaigns</li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <strong>Tip:</strong> O-series models excel at reasoning but may need more tokens for large campaigns:
                          <ul className="list-disc list-inside mt-1">
                            <li>Consider increasing max tokens to 20000-100000 for comprehensive campaigns</li>
                            <li>These models provide excellent keyword research and ad copy quality</li>
                            <li>Allow extra time as O-series models process more thoroughly</li>
                          </ul>
                        </>
                      )}
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
                      max="128000"
                      step="1000"
                      id="maxTokens"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Default: 64000 for GPT-5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Higher values allow for larger campaigns (GPT-5 supports up to 128,000 tokens)</p>
                    <p className="text-xs text-orange-600 mt-1">Note: GPT-5 and O-series models use max_completion_tokens parameter</p>
                    <p className="text-sm text-red-600">{errors.maxTokens?.message as string}</p>
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
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold py-3 px-8 rounded-lg flex items-center space-x-2 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>Regenerate Campaign Parts</span>
                </>
              )}
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-blue-800 font-medium text-lg mb-2">Regenerating Campaign Parts</h3>
              <p className="text-blue-700 text-sm">
                Our AI is analyzing your campaign and generating new {regenerationType === 'keywords' ? 'keywords' : regenerationType === 'rsa' ? 'ad copy' : 'keywords and ad copy'} for the selected scope.
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 