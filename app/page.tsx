'use client';

import { useState } from 'react';
import CampaignForm from './components/CampaignForm';
import CampaignOutput from './components/CampaignOutput';
import { CampaignInput, GeneratedCampaign, CampaignGenerationResponse } from './types/campaign';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCampaignGeneration = async (campaignInput: CampaignInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setGeneratedCampaign(null);

    try {
      const response = await fetch('/api/generate-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: campaignInput }),
      });

      const data: CampaignGenerationResponse = await response.json();

      if (data.success && data.campaign) {
        setGeneratedCampaign(data.campaign);
        setSuccess('Campaign generated successfully!');
        
        // Scroll to results
        setTimeout(() => {
          const outputElement = document.getElementById('campaign-output');
          if (outputElement) {
            outputElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        setError(data.error || 'Failed to generate campaign');
      }
    } catch (err) {
      console.error('Campaign generation error:', err);
      setError('Network error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAnother = () => {
    setGeneratedCampaign(null);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Error Message */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="max-w-4xl mx-auto mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <h3 className="text-green-800 font-medium">Success</h3>
              <p className="text-green-700 text-sm mt-1">{success}</p>
            </div>
          </div>
        )}

        {/* Main Form */}
        {!generatedCampaign && (
          <CampaignForm onSubmit={handleCampaignGeneration} isLoading={isLoading} />
        )}

        {/* Campaign Output */}
        {generatedCampaign && (
          <div id="campaign-output" className="space-y-6">
            <CampaignOutput campaign={generatedCampaign} />
            
            {/* Generate Another Button */}
            <div className="flex justify-center">
              <button
                onClick={handleGenerateAnother}
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
              >
                Generate Another Campaign
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="max-w-4xl mx-auto mt-8 bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-blue-800 font-medium text-lg mb-2">Generating Your Campaign</h3>
            <p className="text-blue-700 text-sm">
              Our AI is analyzing your product and creating a comprehensive Google Ads campaign with keywords, ad groups, and compelling ad copy. This typically takes 30-60 seconds.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-200 text-center text-gray-600">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>Important:</strong> Please review all generated content before implementing. 
              Ensure compliance with Google Ads policies and local regulations.
            </p>
            <p className="text-xs">
              This tool uses AI to generate suggestions. Always validate keywords, ad copy, and targeting settings 
              for your specific business needs and market conditions.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              💻 Developed with ❤️ by <span className="font-semibold text-gray-700">Vincenzo Rosa</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
