'use client';

import React, { useState, useEffect } from 'react';
import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Settings, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

interface AISettingsProps {
  register: UseFormRegister<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors<any>;
  showAdvancedSettings?: boolean;
  onShowAdvancedSettingsChange?: (show: boolean) => void;
  isCompact?: boolean;
}

export default function AISettings({ 
  register,
  setValue,
  watch,
  errors,
  showAdvancedSettings = false, 
  onShowAdvancedSettingsChange,
  isCompact = false 
}: AISettingsProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    if (storedApiKey) {
      setValue('apiKey', storedApiKey);
    }
  }, [setValue]);

  const watchedAiModel = watch('aiModel');

  // Update max tokens when model changes
  useEffect(() => {
    if (watchedAiModel && watchedAiModel.startsWith('gpt-5')) {
      setValue('maxTokens', 64000); // GPT-5 models support up to 128K tokens
    } else if (watchedAiModel && (watchedAiModel.startsWith('o1') || watchedAiModel.startsWith('o3') || watchedAiModel.startsWith('o4'))) {
      setValue('maxTokens', 16000);
    } else if (watchedAiModel) {
      setValue('maxTokens', 8000);
    }
  }, [watchedAiModel, setValue]);

  const toggleAdvancedSettings = () => {
    if (onShowAdvancedSettingsChange) {
      onShowAdvancedSettingsChange(!showAdvancedSettings);
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${isCompact ? 'bg-gray-50' : 'bg-white'}`}>
      <button
        type="button"
        onClick={toggleAdvancedSettings}
        className="w-full flex items-center justify-between text-xl font-semibold mb-4 hover:text-blue-600 transition-colors"
      >
        <div className="flex items-center">
          <Settings className="w-5 h-5 mr-2 text-gray-600" />
          AI Settings {isCompact && '(Advanced)'}
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
              <p className="text-xs text-orange-600 mt-1">GPT-5 max: 128K tokens, O-series models can handle very large outputs</p>
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
  );
} 