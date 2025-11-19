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
      setValue('maxTokens', 32000); // O-series models support up to 100K output tokens
    } else if (watchedAiModel && watchedAiModel.startsWith('gpt-4o')) {
      setValue('maxTokens', 16000); // GPT-4o supports up to 16K output tokens
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
                <optgroup label="GPT-5.1 Series (Newest - Nov 2025)">
                  <option value="gpt-5.1">GPT-5.1 (Latest w/ Adaptive Reasoning - $1.25/$10 per 1M)</option>
                  <option value="gpt-5.1-chat-latest">GPT-5.1 Chat (Optimized - $1.25/$10 per 1M)</option>
                </optgroup>
                <optgroup label="GPT-5 Series (Aug 2025)">
                  <option value="gpt-5">GPT-5 (Flagship - $1.25/$10 per 1M)</option>
                  <option value="gpt-5-mini">GPT-5 Mini (Balanced - $0.25/$2 per 1M)</option>
                  <option value="gpt-5-nano">GPT-5 Nano (Fast & Cheap - $0.05/$0.40 per 1M)</option>
                </optgroup>
                <optgroup label="GPT-4o Series (Multimodal)">
                  <option value="gpt-4o">GPT-4o (Latest - $2.50/$10 per 1M)</option>
                  <option value="gpt-4o-2024-11-20">GPT-4o 2024-11-20 ($2.50/$10 per 1M)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Budget - $0.15/$0.60 per 1M)</option>
                  <option value="gpt-4o-mini-2024-07-18">GPT-4o Mini 2024-07-18 ($0.15/$0.60 per 1M)</option>
                </optgroup>
                <optgroup label="O-Series Reasoning Models">
                  <option value="o1-pro">O1 Pro (Premium Reasoning - $150/$600 per 1M)</option>
                  <option value="o1-2024-12-17">O1 (Advanced Reasoning - $15/$60 per 1M)</option>
                  <option value="o1-mini-2024-09-12">O1 Mini (Budget Reasoning - $1.10/$4.40 per 1M)</option>
                  <option value="o3-mini-2025-01-31">O3 Mini (Latest Reasoning - $1.10/$4.40 per 1M)</option>
                  <option value="o4-mini-2025-04-16">O4 Mini (Newest Mini - $1.10/$4.40 per 1M)</option>
                </optgroup>
                <optgroup label="GPT-4 Legacy">
                  <option value="gpt-4-turbo-2024-04-09">GPT-4 Turbo ($10/$30 per 1M)</option>
                  <option value="gpt-4">GPT-4 ($30/$60 per 1M)</option>
                </optgroup>
                <optgroup label="GPT-3.5 Budget">
                  <option value="gpt-3.5-turbo-0125">GPT-3.5 Turbo ($0.50/$1.50 per 1M)</option>
                </optgroup>
              </select>
              <p className="text-xs text-gray-500 mt-1">Prices are input/output per million tokens. GPT-5.1 is the newest flagship (Nov 2025) with adaptive reasoning. O-series excels at reasoning tasks. GPT-4o offers multimodal capabilities.</p>
              <div className={`text-xs mt-2 p-2 rounded ${watchedAiModel?.startsWith('gpt-5') ? 'bg-blue-50 text-blue-800 border border-blue-200' : watchedAiModel?.startsWith('o') ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : 'hidden'}`}>
                {watchedAiModel?.startsWith('gpt-5') ? (
                  <>
                    <strong>GPT-5/5.1 Series:</strong> Latest flagship models with advanced capabilities
                    <ul className="list-disc list-inside mt-1">
                      <li>Context: 272K tokens, Max Output: 128K tokens</li>
                      <li>Uses max_completion_tokens parameter</li>
                      <li>GPT-5.1: Adaptive reasoning - adjusts thinking time based on task complexity</li>
                      <li>Best for comprehensive, high-quality campaigns</li>
                      <li>GPT-5 nano offers fastest/cheapest option</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <strong>O-Series Reasoning Models:</strong> Specialized for complex reasoning tasks
                    <ul className="list-disc list-inside mt-1">
                      <li>Context: 200K tokens, Max Output: 100K tokens</li>
                      <li>Uses max_completion_tokens parameter</li>
                      <li>Excellent for keyword research and strategic ad copy</li>
                      <li>O1 Pro: Premium model for most complex campaigns</li>
                      <li>O3/O4-mini: Cost-effective reasoning options</li>
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
              <p className="text-xs text-gray-500 mt-1">GPT-5: up to 128K | GPT-4o: up to 16K | O-series: up to 100K output tokens</p>
              <p className="text-xs text-orange-600 mt-1">Note: GPT-5 and O-series use max_completion_tokens (not max_tokens)</p>
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