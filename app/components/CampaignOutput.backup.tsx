'use client';

import { useState } from 'react';
import { GeneratedCampaign, KeywordTheme, AdGroup, ResponsiveSearchAd } from '../types/campaign';
import { Copy, Download, ChevronDown, ChevronRight, Eye, CheckCircle } from 'lucide-react';

interface CampaignOutputProps {
  campaign: GeneratedCampaign;
}

export default function CampaignOutput({ campaign }: CampaignOutputProps) {
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set([0]));
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());
  const [copiedSections, setCopiedSections] = useState<Set<string>>(new Set());

  const toggleTheme = (index: number) => {
    const newExpanded = new Set(expandedThemes);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedThemes(newExpanded);
  };

  const toggleAdGroup = (key: string) => {
    const newExpanded = new Set(expandedAdGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedAdGroups(newExpanded);
  };

  const copyToClipboard = async (text: string, sectionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSections(new Set([...copiedSections, sectionId]));
      setTimeout(() => {
        setCopiedSections(prev => {
          const newSet = new Set(prev);
          newSet.delete(sectionId);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getMatchTypeColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'bg-green-100 text-green-800 border-green-200';
      case 'phrase': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'broad': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatKeyword = (keyword: string, matchType: string) => {
    // Check if keyword already has match type formatting
    if (keyword.startsWith('[') && keyword.endsWith(']')) {
      return keyword; // Already has exact match brackets
    }
    if (keyword.startsWith('"') && keyword.endsWith('"')) {
      return keyword; // Already has phrase match quotes
    }
    
    // Add formatting based on match type
    switch (matchType) {
      case 'exact': return `[${keyword}]`;
      case 'phrase': return `"${keyword}"`;
      case 'broad': return keyword;
      default: return keyword;
    }
  };

  const generateFullCampaignText = () => {
    let output = `Campaign Name: ${campaign.campaignName}\n\n`;
    
    if (campaign.bidStrategy) {
      output += `Bid Strategy: ${campaign.bidStrategy}\n\n`;
    }

    campaign.themes.forEach((theme, themeIndex) => {
      output += `${'='.repeat(40)}\n`;
      output += `THEME: ${theme.theme}\n`;
      output += `${'='.repeat(40)}\n\n`;

      theme.adGroups.forEach((adGroup, adGroupIndex) => {
        output += `Ad Group: ${adGroup.name}\n`;
        output += `Keywords:\n`;
        adGroup.keywords.forEach(keyword => {
          output += `- ${formatKeyword(keyword.keyword, keyword.matchType)} - ${keyword.matchType.charAt(0).toUpperCase() + keyword.matchType.slice(1)} Match\n`;
        });
        output += `\n`;

        adGroup.ads.forEach((ad, adIndex) => {
          output += `RSA ${adIndex + 1}:\n`;
          output += `Headlines:\n`;
          ad.headlines.forEach((headline, i) => {
            output += `${i + 1}. ${headline} (${headline.length} chars)\n`;
          });
          output += `\nDescriptions:\n`;
          ad.descriptions.forEach((description, i) => {
            output += `${i + 1}. ${description} (${description.length} chars)\n`;
          });
          output += `\n`;
        });

        if (adGroupIndex < theme.adGroups.length - 1) {
          output += `${'-'.repeat(40)}\n\n`;
        }
      });

      if (themeIndex < campaign.themes.length - 1) {
        output += `\n`;
      }
    });

    if (campaign.negativeKeywords && campaign.negativeKeywords.length > 0) {
      output += `${'='.repeat(40)}\n`;
      output += `NEGATIVE KEYWORDS (Campaign Level):\n`;
      output += `${'='.repeat(40)}\n`;
      campaign.negativeKeywords.forEach(keyword => {
        output += `- ${keyword}\n`;
      });
      output += `\n`;
    }

    if (campaign.adExtensions) {
      if (campaign.adExtensions.sitelinks && campaign.adExtensions.sitelinks.length > 0) {
        output += `SITELINKS:\n`;
        campaign.adExtensions.sitelinks.forEach(sitelink => {
          output += `- ${sitelink}\n`;
        });
        output += `\n`;
      }

      if (campaign.adExtensions.callouts && campaign.adExtensions.callouts.length > 0) {
        output += `CALLOUTS:\n`;
        campaign.adExtensions.callouts.forEach(callout => {
          output += `- ${callout}\n`;
        });
        output += `\n`;
      }
    }

    return output;
  };

  const exportToCSV = () => {
    exportCombinedKeywordsCSV();
  };

  const exportCombinedKeywordsCSV = () => {
    // Google Ads Editor CSV format with Type column to distinguish negative keywords
    let csvContent = "Campaign,Ad Group,Keyword,Type\n";
    
    // Add regular keywords for each ad group
    campaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        adGroup.keywords.forEach(keyword => {
          // For regular keywords, leave Type empty
          csvContent += `"${campaign.campaignName}","${adGroup.name}","${keyword.keyword}",""\n`;
        });
      });
    });
    
    // Add negative keywords at campaign level with "Campaign negative exact" in Type column
    if (campaign.negativeKeywords && campaign.negativeKeywords.length > 0) {
      campaign.negativeKeywords.forEach(negKeyword => {
        // Use "Campaign negative exact" for exact match campaign-level negative keywords
        csvContent += `"${campaign.campaignName}","","${negKeyword}","Campaign negative exact"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_AllKeywords.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportGoogleAdsEditorCSV = () => {
    // Export only regular keywords
    let csvContent = "Campaign,Ad Group,Keyword,Match Type\n";
    
    // Add keywords for each ad group
    campaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        // Add keywords without any formatting
        adGroup.keywords.forEach(keyword => {
          const matchType = keyword.matchType.toLowerCase(); // ensure lowercase
          // Use plain keyword text without brackets or quotes
          csvContent += `"${campaign.campaignName}","${adGroup.name}","${keyword.keyword}","${matchType}"\n`;
        });
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_Keywords.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportNegativeKeywordsCSV = () => {
    // Remove the alert since we're providing a better solution
    
    // Google Ads Editor CSV format for negative keywords - plain text
    let csvContent = "Campaign,Keyword\n";
    
    // Add negative keywords at campaign level
    if (campaign.negativeKeywords && campaign.negativeKeywords.length > 0) {
      campaign.negativeKeywords.forEach(negKeyword => {
        // Use plain keyword text without brackets or minus sign
        csvContent += `"${campaign.campaignName}","${negKeyword}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_NegativeKeywords.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportAdsCSV = () => {
    // Separate CSV for Responsive Search Ads (Google Ads Editor format)
    let csvContent = "Action,Campaign,Ad Group,Ad Type,Headline 1,Headline 2,Headline 3,Headline 4,Headline 5,Headline 6,Headline 7,Headline 8,Headline 9,Headline 10,Headline 11,Headline 12,Headline 13,Headline 14,Headline 15,Description 1,Description 2,Description 3,Description 4,Final URL,Path 1,Path 2\n";
    
    campaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        adGroup.ads.forEach((ad, adIndex) => {
          const headlines = [...ad.headlines];
          const descriptions = [...ad.descriptions];
          
          // Pad arrays to ensure we have exactly 15 headlines and 4 descriptions
          while (headlines.length < 15) headlines.push('');
          while (descriptions.length < 4) descriptions.push('');
          
          csvContent += `"Add","${campaign.campaignName}","${adGroup.name}","Responsive search ad",`;
          csvContent += headlines.map(h => `"${h}"`).join(',') + ',';
          csvContent += descriptions.map(d => `"${d}"`).join(',') + ',';
          csvContent += `"${campaign.finalUrl || ''}","",""\n`; // Final URL from campaign, Path 1, Path 2 (empty for user to fill)
        });
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${campaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_RSAs.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{campaign.campaignName}</h2>
            {campaign.bidStrategy && (
              <p className="text-gray-600">Recommended Bid Strategy: {campaign.bidStrategy}</p>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => copyToClipboard(generateFullCampaignText(), 'full-campaign')}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copiedSections.has('full-campaign') ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copiedSections.has('full-campaign') ? 'Copied!' : 'Copy All'}</span>
            </button>
            <div className="relative">
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export All Keywords</span>
              </button>
            </div>
            <button
              onClick={exportGoogleAdsEditorCSV}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Keywords Only</span>
            </button>
            <button
              onClick={exportAdsCSV}
              className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Ads</span>
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <p><strong>Export All Keywords:</strong> Combined file with regular and negative keywords - plain format for easy import</p>
            <p><strong>Export Keywords Only:</strong> Only regular keywords (no negatives)</p>
            <p><strong>Export Ads:</strong> Responsive Search Ads with Final URL included</p>
          </div>
        </div>
      </div>

      {/* Themes */}
      <div className="space-y-4">
        {campaign.themes.map((theme, themeIndex) => (
          <div key={themeIndex} className="border rounded-lg overflow-hidden">
            <div
              className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleTheme(themeIndex)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {expandedThemes.has(themeIndex) ? (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    THEME: {theme.theme}
                  </h3>
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">
                    {theme.adGroups.length} Ad Groups
                  </span>
                </div>
              </div>
            </div>

            {expandedThemes.has(themeIndex) && (
              <div className="p-4 space-y-4">
                {theme.adGroups.map((adGroup, adGroupIndex) => {
                  const adGroupKey = `${themeIndex}-${adGroupIndex}`;
                  return (
                    <div key={adGroupIndex} className="border rounded-lg">
                      <div
                        className="bg-white p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b"
                        onClick={() => toggleAdGroup(adGroupKey)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {expandedAdGroups.has(adGroupKey) ? (
                              <ChevronDown className="w-4 h-4 text-gray-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-gray-600" />
                            )}
                            <h4 className="font-medium text-gray-900">{adGroup.name}</h4>
                            <span className={`px-2 py-1 rounded text-xs border ${getMatchTypeColor(adGroup.matchType)}`}>
                              {adGroup.matchType.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-600">
                              {adGroup.keywords.length} keywords, {adGroup.ads.length} ads
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const adGroupText = generateAdGroupText(theme.theme, adGroup);
                              copyToClipboard(adGroupText, adGroupKey);
                            }}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                          >
                            {copiedSections.has(adGroupKey) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {expandedAdGroups.has(adGroupKey) && (
                        <div className="p-4">
                          {/* Keywords */}
                          <div className="mb-4">
                            <h5 className="font-medium text-gray-900 mb-2">Keywords:</h5>
                            <div className="space-y-1">
                              {adGroup.keywords.map((keyword, keywordIndex) => (
                                <div key={keywordIndex} className="flex items-center space-x-2">
                                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                                    {formatKeyword(keyword.keyword, keyword.matchType)}
                                  </span>
                                  <span className="text-sm text-gray-600">
                                    {keyword.matchType.charAt(0).toUpperCase() + keyword.matchType.slice(1)} Match
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Ads */}
                          <div className="space-y-4">
                            {adGroup.ads.map((ad, adIndex) => (
                              <div key={adIndex} className="border rounded-lg p-4 bg-gray-50">
                                <h6 className="font-medium text-gray-900 mb-3">RSA {adIndex + 1}:</h6>
                                
                                {/* Headlines */}
                                <div className="mb-4">
                                  <h6 className="text-sm font-medium text-gray-900 mb-2">Headlines:</h6>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {ad.headlines.map((headline, headlineIndex) => (
                                      <div key={headlineIndex} className="bg-white p-2 rounded border">
                                        <div className="text-sm">{headlineIndex + 1}. {headline}</div>
                                        <div className={`text-xs mt-1 ${headline.length > 30 ? 'text-red-600' : 'text-green-600'}`}>
                                          {headline.length}/30 chars
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Descriptions */}
                                <div>
                                  <h6 className="text-sm font-medium text-gray-900 mb-2">Descriptions:</h6>
                                  <div className="space-y-2">
                                    {ad.descriptions.map((description, descIndex) => (
                                      <div key={descIndex} className="bg-white p-2 rounded border">
                                        <div className="text-sm">{descIndex + 1}. {description}</div>
                                        <div className={`text-xs mt-1 ${description.length > 90 ? 'text-red-600' : 'text-green-600'}`}>
                                          {description.length}/90 chars
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Negative Keywords */}
      {campaign.negativeKeywords && campaign.negativeKeywords.length > 0 && (
        <div className="mt-6 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Negative Keywords (Campaign Level)</h3>
            <button
              onClick={() => copyToClipboard(campaign.negativeKeywords.join('\n'), 'negative-keywords')}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              {copiedSections.has('negative-keywords') ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="text-sm">{copiedSections.has('negative-keywords') ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {campaign.negativeKeywords.map((keyword, index) => (
              <div key={index} className="bg-red-50 text-red-800 px-2 py-1 rounded text-sm">
                {keyword}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ad Extensions */}
      {campaign.adExtensions && (
        <div className="mt-6 space-y-4">
          {campaign.adExtensions.sitelinks && campaign.adExtensions.sitelinks.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Sitelinks</h3>
                <button
                  onClick={() => copyToClipboard(campaign.adExtensions!.sitelinks!.join('\n'), 'sitelinks')}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  {copiedSections.has('sitelinks') ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="text-sm">{copiedSections.has('sitelinks') ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {campaign.adExtensions.sitelinks.map((sitelink, index) => (
                  <div key={index} className="bg-blue-50 text-blue-800 px-3 py-2 rounded">
                    {sitelink}
                  </div>
                ))}
              </div>
            </div>
          )}

          {campaign.adExtensions.callouts && campaign.adExtensions.callouts.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Callouts</h3>
                <button
                  onClick={() => copyToClipboard(campaign.adExtensions!.callouts!.join('\n'), 'callouts')}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                >
                  {copiedSections.has('callouts') ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="text-sm">{copiedSections.has('callouts') ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {campaign.adExtensions.callouts.map((callout, index) => (
                  <div key={index} className="bg-green-50 text-green-800 px-2 py-1 rounded text-sm">
                    {callout}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to generate ad group text for copying
function generateAdGroupText(theme: string, adGroup: AdGroup): string {
  let output = `Ad Group: ${adGroup.name}\n`;
  output += `Keywords:\n`;
  adGroup.keywords.forEach(keyword => {
    const formattedKeyword = keyword.matchType === 'exact' ? `[${keyword.keyword}]` :
                            keyword.matchType === 'phrase' ? `"${keyword.keyword}"` :
                            keyword.keyword;
    output += `- ${formattedKeyword} - ${keyword.matchType.charAt(0).toUpperCase() + keyword.matchType.slice(1)} Match\n`;
  });
  output += `\n`;

  adGroup.ads.forEach((ad, adIndex) => {
    output += `RSA ${adIndex + 1}:\n`;
    output += `Headlines:\n`;
    ad.headlines.forEach((headline, i) => {
      output += `${i + 1}. ${headline} (${headline.length} chars)\n`;
    });
    output += `\nDescriptions:\n`;
    ad.descriptions.forEach((description, i) => {
      output += `${i + 1}. ${description} (${description.length} chars)\n`;
    });
    output += `\n`;
  });

  return output;
} 