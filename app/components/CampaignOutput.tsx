'use client';

import { useState, useEffect } from 'react';
import { GeneratedCampaign, KeywordTheme, AdGroup, ResponsiveSearchAd, KeywordVariant } from '../types/campaign';
import { Copy, Download, ChevronDown, ChevronRight, Eye, CheckCircle, X, Plus, Edit2, Save, RefreshCw } from 'lucide-react';
import RegenerationPanel from './RegenerationPanel';

interface CampaignOutputProps {
  campaign: GeneratedCampaign;
  onCampaignUpdate?: (updatedCampaign: GeneratedCampaign) => void;
}

export default function CampaignOutput({ campaign, onCampaignUpdate }: CampaignOutputProps) {
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set([0]));
  const [expandedAdGroups, setExpandedAdGroups] = useState<Set<string>>(new Set());
  const [copiedSections, setCopiedSections] = useState<Set<string>>(new Set());
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set());
  const [editableCampaign, setEditableCampaign] = useState<GeneratedCampaign>(campaign);
  const [editValues, setEditValues] = useState<{ [key: string]: string }>({});
  const [showRegenerationPanel, setShowRegenerationPanel] = useState(false);

  // Comprehensive cleaning function
  const cleanKeywordText = (text: string): string => {
    let cleaned = text.trim();
    
    // Remove quotes from start and end (including all Unicode variants)
    cleaned = cleaned.replace(/^[\s\u0022\u0027\u0060\u00B4\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u0301\u2032\u2033\u2034\u2035\u2036\u2037\u2039\u203A\u203C\u203D'"'"`´«»‹›【】〈〉《》「」『』\[\]]+|[\s\u0022\u0027\u0060\u00B4\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u0301\u2032\u2033\u2034\u2035\u2036\u2037\u2039\u203A\u203C\u203D'"'"`´«»‹›【】〈〉《》「」『』\[\]]+$/g, '');
    
    // Remove ALL quote characters anywhere in the string
    // This includes every possible quote variant
    cleaned = cleaned
      .replace(/[\u0022]/g, '') // Quotation mark
      .replace(/[\u0027]/g, '') // Apostrophe
      .replace(/[\u0060]/g, '') // Grave accent
      .replace(/[\u00B4]/g, '') // Acute accent
      .replace(/[\u2018]/g, '') // Left single quotation mark
      .replace(/[\u2019]/g, '') // Right single quotation mark
      .replace(/[\u201A]/g, '') // Single low-9 quotation mark
      .replace(/[\u201B]/g, '') // Single high-reversed-9 quotation mark
      .replace(/[\u201C]/g, '') // Left double quotation mark
      .replace(/[\u201D]/g, '') // Right double quotation mark
      .replace(/[\u201E]/g, '') // Double low-9 quotation mark
      .replace(/[\u201F]/g, '') // Double high-reversed-9 quotation mark
      .replace(/[\u2032]/g, '') // Prime
      .replace(/[\u2033]/g, '') // Double prime
      .replace(/['']/g, '') // Curly single quotes
      .replace(/[""]/g, '') // Curly double quotes
      .replace(/[`´]/g, '') // Backtick and acute
      .replace(/['"]/g, '') // Standard quotes
      .replace(/[\[\]]/g, '') // Brackets
      .replace(/\\/g, '') // Backslashes
      .trim();
    
    return cleaned;
  };

  // Clean keywords when campaign is loaded
  useEffect(() => {
    const cleanedCampaign = { ...campaign };
    
    // Clean all keywords to ensure they don't have match type formatting
    cleanedCampaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        adGroup.keywords.forEach(keyword => {
          keyword.keyword = cleanKeywordText(keyword.keyword);
        });
      });
    });
    
    // Also clean negative keywords
    if (cleanedCampaign.negativeKeywords) {
      cleanedCampaign.negativeKeywords = cleanedCampaign.negativeKeywords.map(negKeyword => {
        return cleanKeywordText(negKeyword.replace(/^-/, '')); // Also remove leading minus
      });
    }
    
    setEditableCampaign(cleanedCampaign);
  }, [campaign]);

  // Handle campaign regeneration
  const handleRegenerationComplete = (updatedCampaign: GeneratedCampaign) => {
    setEditableCampaign(updatedCampaign);
    if (onCampaignUpdate) {
      onCampaignUpdate(updatedCampaign);
    }
  };

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
    if (keyword.startsWith('[') && keyword.endsWith(']')) {
      return keyword;
    }
    if (keyword.startsWith('"') && keyword.endsWith('"')) {
      return keyword;
    }
    
    switch (matchType) {
      case 'exact': return `[${keyword}]`;
      case 'phrase': return `"${keyword}"`;
      case 'broad': return keyword;
      default: return keyword;
    }
  };

  const startEditing = (id: string, value: string) => {
    setEditingItems(new Set([...editingItems, id]));
    setEditValues({ ...editValues, [id]: value });
  };

  const saveEdit = (id: string, path: string[]) => {
    let newValue = editValues[id];
    
    // Clean keywords to remove any match type formatting
    if (id.startsWith('keyword-') || id.startsWith('neg-keyword-')) {
      newValue = cleanKeywordText(newValue);
    }
    
    const newCampaign = { ...editableCampaign };
    
    // Navigate to the correct location in the campaign object
    let current: any = newCampaign;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = newValue;
    
    setEditableCampaign(newCampaign);
    setEditingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const deleteItem = (path: string[]) => {
    const newCampaign = { ...editableCampaign };
    let current: any = newCampaign;
    
    for (let i = 0; i < path.length - 2; i++) {
      current = current[path[i]];
    }
    
    const parent = current[path[path.length - 2]];
    const index = parseInt(path[path.length - 1]);
    
    if (Array.isArray(parent)) {
      parent.splice(index, 1);
    }
    
    setEditableCampaign(newCampaign);
  };

  const addKeyword = (themeIndex: number, adGroupIndex: number) => {
    const newCampaign = { ...editableCampaign };
    const newKeyword = {
      keyword: 'new keyword',
      matchType: newCampaign.themes[themeIndex].adGroups[adGroupIndex].matchType
    };
    newCampaign.themes[themeIndex].adGroups[adGroupIndex].keywords.push(newKeyword);
    setEditableCampaign(newCampaign);
  };

  const addNegativeKeyword = () => {
    const newCampaign = { ...editableCampaign };
    if (!newCampaign.negativeKeywords) {
      newCampaign.negativeKeywords = [];
    }
    newCampaign.negativeKeywords.push('new negative keyword');
    setEditableCampaign(newCampaign);
  };

  const addHeadline = (themeIndex: number, adGroupIndex: number, adIndex: number) => {
    const newCampaign = { ...editableCampaign };
    const ad = newCampaign.themes[themeIndex].adGroups[adGroupIndex].ads[adIndex];
    if (ad.headlines.length < 15) {
      ad.headlines.push('New headline');
      setEditableCampaign(newCampaign);
    }
  };

  const addDescription = (themeIndex: number, adGroupIndex: number, adIndex: number) => {
    const newCampaign = { ...editableCampaign };
    const ad = newCampaign.themes[themeIndex].adGroups[adGroupIndex].ads[adIndex];
    if (ad.descriptions.length < 4) {
      ad.descriptions.push('New description');
      setEditableCampaign(newCampaign);
    }
  };

  const addSitelink = () => {
    const newCampaign = { ...editableCampaign };
    if (!newCampaign.adExtensions) {
      newCampaign.adExtensions = {};
    }
    if (!newCampaign.adExtensions.sitelinks) {
      newCampaign.adExtensions.sitelinks = [];
    }
    newCampaign.adExtensions.sitelinks.push('New sitelink');
    setEditableCampaign(newCampaign);
  };

  const addCallout = () => {
    const newCampaign = { ...editableCampaign };
    if (!newCampaign.adExtensions) {
      newCampaign.adExtensions = {};
    }
    if (!newCampaign.adExtensions.callouts) {
      newCampaign.adExtensions.callouts = [];
    }
    newCampaign.adExtensions.callouts.push('New callout');
    setEditableCampaign(newCampaign);
  };

  const generateFullCampaignText = () => {
    let output = `Campaign Name: ${editableCampaign.campaignName}\n\n`;
    
    if (editableCampaign.bidStrategy) {
      output += `Bid Strategy: ${editableCampaign.bidStrategy}\n\n`;
    }

    editableCampaign.themes.forEach((theme, themeIndex) => {
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

      if (themeIndex < editableCampaign.themes.length - 1) {
        output += `\n`;
      }
    });

    if (editableCampaign.negativeKeywords && editableCampaign.negativeKeywords.length > 0) {
      output += `${'='.repeat(40)}\n`;
      output += `NEGATIVE KEYWORDS (Campaign Level):\n`;
      output += `${'='.repeat(40)}\n`;
      editableCampaign.negativeKeywords.forEach(keyword => {
        output += `- ${keyword}\n`;
      });
      output += `\n`;
    }

    if (editableCampaign.adExtensions) {
      if (editableCampaign.adExtensions.sitelinks && editableCampaign.adExtensions.sitelinks.length > 0) {
        output += `SITELINKS:\n`;
        editableCampaign.adExtensions.sitelinks.forEach(sitelink => {
          output += `- ${sitelink}\n`;
        });
        output += `\n`;
      }

      if (editableCampaign.adExtensions.callouts && editableCampaign.adExtensions.callouts.length > 0) {
        output += `CALLOUTS:\n`;
        editableCampaign.adExtensions.callouts.forEach(callout => {
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
    // Simple CSV format WITHOUT quotes around values
    let csvContent = "Campaign,Ad Group,Keyword,Type\n";
    
    // First add ALL regular keywords with match type
    editableCampaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        adGroup.keywords.forEach(keyword => {
          // Use the comprehensive cleaning function
          const cleanKeyword = cleanKeywordText(keyword.keyword);
          const matchType = keyword.matchType.toLowerCase();
          
          // NO QUOTES around values - just comma-separated
          csvContent += `${editableCampaign.campaignName},${adGroup.name},${cleanKeyword},${matchType}\n`;
        });
      });
    });
    
    // Then add negative keywords
    if (editableCampaign.negativeKeywords && editableCampaign.negativeKeywords.length > 0) {
      editableCampaign.negativeKeywords.forEach(negKeyword => {
        // Use the comprehensive cleaning function
        const cleanNegKeyword = cleanKeywordText(negKeyword);
        
        // Campaign-level negative keywords - NO QUOTES
        csvContent += `${editableCampaign.campaignName},,${cleanNegKeyword},Campaign negative exact\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${editableCampaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_AllKeywords.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportGoogleAdsEditorCSV = () => {
    // Export only regular keywords - NO QUOTES
    let csvContent = "Campaign,Ad Group,Keyword,Match Type\n";
    
    // Add keywords for each ad group
    editableCampaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        adGroup.keywords.forEach(keyword => {
          const matchType = keyword.matchType.toLowerCase(); // ensure lowercase
          
          // Use the comprehensive cleaning function
          const cleanKeyword = cleanKeywordText(keyword.keyword);
          
          // NO QUOTES around values
          csvContent += `${editableCampaign.campaignName},${adGroup.name},${cleanKeyword},${matchType}\n`;
        });
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${editableCampaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_Keywords.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportNegativeKeywordsCSV = () => {
    // Use 4-column format - NO QUOTES
    let csvContent = "Campaign,Ad Group,Keyword,Type\n";
    
    if (editableCampaign.negativeKeywords && editableCampaign.negativeKeywords.length > 0) {
      editableCampaign.negativeKeywords.forEach(negKeyword => {
        // Use the comprehensive cleaning function
        const cleanNegKeyword = cleanKeywordText(negKeyword);
        
        // Campaign-level negative keywords - NO QUOTES
        csvContent += `${editableCampaign.campaignName},,${cleanNegKeyword},Campaign negative exact\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${editableCampaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_NegativeKeywords.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportAdsCSV = () => {
    let csvContent = "Action,Campaign,Ad Group,Ad Type,Headline 1,Headline 2,Headline 3,Headline 4,Headline 5,Headline 6,Headline 7,Headline 8,Headline 9,Headline 10,Headline 11,Headline 12,Headline 13,Headline 14,Headline 15,Description 1,Description 2,Description 3,Description 4,Final URL,Path 1,Path 2\n";
    
    editableCampaign.themes.forEach(theme => {
      theme.adGroups.forEach(adGroup => {
        adGroup.ads.forEach((ad, adIndex) => {
          const headlines = [...ad.headlines];
          const descriptions = [...ad.descriptions];
          
          while (headlines.length < 15) headlines.push('');
          while (descriptions.length < 4) descriptions.push('');
          
          csvContent += `"Add","${editableCampaign.campaignName}","${adGroup.name}","Responsive search ad",`;
          csvContent += headlines.map(h => `"${h}"`).join(',') + ',';
          csvContent += descriptions.map(d => `"${d}"`).join(',') + ',';
          csvContent += `"${editableCampaign.finalUrl || ''}","",""\n`;
        });
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `${editableCampaign.campaignName.replace(/[^a-zA-Z0-9]/g, '_')}_RSAs.csv`);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{editableCampaign.campaignName}</h2>
            {editableCampaign.bidStrategy && (
              <p className="text-gray-600">Recommended Bid Strategy: {editableCampaign.bidStrategy}</p>
            )}
          </div>
          <div className="flex flex-col space-y-2">
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
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export All Keywords</span>
              </button>
              <button
                onClick={() => setShowRegenerationPanel(true)}
                className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Regenerate with AI</span>
              </button>
            </div>
            <div className="flex space-x-2">
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
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          <p><strong>Export All Keywords:</strong> Combined file with regular and negative keywords</p>
          <p><strong>Export Keywords Only:</strong> Only regular keywords (no negatives)</p>
          <p><strong>Export Ads:</strong> Responsive Search Ads with Final URL included</p>
        </div>
      </div>

      {/* Themes */}
      <div className="space-y-4">
        {editableCampaign.themes.map((theme, themeIndex) => (
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
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">Keywords:</h5>
                              <button
                                onClick={() => addKeyword(themeIndex, adGroupIndex)}
                                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="text-sm">Add Keyword</span>
                              </button>
                            </div>
                            <div className="space-y-1">
                              {adGroup.keywords.map((keyword, keywordIndex) => {
                                const keywordId = `keyword-${themeIndex}-${adGroupIndex}-${keywordIndex}`;
                                const isEditing = editingItems.has(keywordId);
                                
                                return (
                                  <div key={keywordIndex} className="flex items-center space-x-2 group relative">
                                    {isEditing ? (
                                      <>
                                        <input
                                          type="text"
                                          value={editValues[keywordId]}
                                          onChange={(e) => setEditValues({ ...editValues, [keywordId]: e.target.value })}
                                          className="text-sm font-mono bg-gray-100 px-2 py-1 rounded border"
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              saveEdit(keywordId, ['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'keywords', String(keywordIndex), 'keyword']);
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => saveEdit(keywordId, ['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'keywords', String(keywordIndex), 'keyword'])}
                                          className="text-green-600 hover:text-green-800"
                                        >
                                          <Save className="w-4 h-4" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span
                                          className="text-sm font-mono bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                                          onClick={() => startEditing(keywordId, keyword.keyword)}
                                        >
                                          {keyword.keyword}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          {keyword.matchType.charAt(0).toUpperCase() + keyword.matchType.slice(1)} Match
                                        </span>
                                        <button
                                          onClick={() => deleteItem(['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'keywords', String(keywordIndex)])}
                                          className="absolute right-0 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Ads */}
                          <div className="space-y-4">
                            {adGroup.ads.map((ad, adIndex) => (
                              <div key={adIndex} className="border rounded-lg p-4 bg-gray-50">
                                <h6 className="font-medium text-gray-900 mb-3">RSA {adIndex + 1}:</h6>
                                
                                {/* Headlines */}
                                <div className="mb-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <h6 className="text-sm font-medium text-gray-900">Headlines ({ad.headlines.length}/15):</h6>
                                    <button
                                      onClick={() => addHeadline(themeIndex, adGroupIndex, adIndex)}
                                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                                      disabled={ad.headlines.length >= 15}
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span className="text-sm">Add Headline</span>
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {ad.headlines.map((headline, headlineIndex) => {
                                      const headlineId = `headline-${themeIndex}-${adGroupIndex}-${adIndex}-${headlineIndex}`;
                                      const isEditing = editingItems.has(headlineId);
                                      
                                      return (
                                        <div key={headlineIndex} className="bg-white p-2 rounded border relative group">
                                          {isEditing ? (
                                            <div className="flex items-center space-x-1">
                                              <input
                                                type="text"
                                                value={editValues[headlineId]}
                                                onChange={(e) => setEditValues({ ...editValues, [headlineId]: e.target.value })}
                                                className="text-sm w-full border rounded px-1"
                                                maxLength={30}
                                                onKeyPress={(e) => {
                                                  if (e.key === 'Enter') {
                                                    saveEdit(headlineId, ['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'ads', String(adIndex), 'headlines', String(headlineIndex)]);
                                                  }
                                                }}
                                              />
                                              <button
                                                onClick={() => saveEdit(headlineId, ['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'ads', String(adIndex), 'headlines', String(headlineIndex)])}
                                                className="text-green-600 hover:text-green-800"
                                              >
                                                <Save className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <div
                                                className="text-sm cursor-pointer hover:bg-gray-50"
                                                onClick={() => startEditing(headlineId, headline)}
                                              >
                                                {headlineIndex + 1}. {headline}
                                              </div>
                                              <div className={`text-xs mt-1 ${headline.length > 30 ? 'text-red-600' : 'text-green-600'}`}>
                                                {headline.length}/30 chars
                                              </div>
                                              <button
                                                onClick={() => deleteItem(['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'ads', String(adIndex), 'headlines', String(headlineIndex)])}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Descriptions */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h6 className="text-sm font-medium text-gray-900">Descriptions ({ad.descriptions.length}/4):</h6>
                                    <button
                                      onClick={() => addDescription(themeIndex, adGroupIndex, adIndex)}
                                      className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                                      disabled={ad.descriptions.length >= 4}
                                    >
                                      <Plus className="w-4 h-4" />
                                      <span className="text-sm">Add Description</span>
                                    </button>
                                  </div>
                                  <div className="space-y-2">
                                    {ad.descriptions.map((description, descIndex) => {
                                      const descId = `desc-${themeIndex}-${adGroupIndex}-${adIndex}-${descIndex}`;
                                      const isEditing = editingItems.has(descId);
                                      
                                      return (
                                        <div key={descIndex} className="bg-white p-2 rounded border relative group">
                                          {isEditing ? (
                                            <div className="flex items-center space-x-1">
                                              <textarea
                                                value={editValues[descId]}
                                                onChange={(e) => setEditValues({ ...editValues, [descId]: e.target.value })}
                                                className="text-sm w-full border rounded px-1"
                                                maxLength={90}
                                                rows={2}
                                                onKeyPress={(e) => {
                                                  if (e.key === 'Enter' && e.ctrlKey) {
                                                    saveEdit(descId, ['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'ads', String(adIndex), 'descriptions', String(descIndex)]);
                                                  }
                                                }}
                                              />
                                              <button
                                                onClick={() => saveEdit(descId, ['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'ads', String(adIndex), 'descriptions', String(descIndex)])}
                                                className="text-green-600 hover:text-green-800"
                                              >
                                                <Save className="w-3 h-3" />
                                              </button>
                                            </div>
                                          ) : (
                                            <>
                                              <div
                                                className="text-sm cursor-pointer hover:bg-gray-50"
                                                onClick={() => startEditing(descId, description)}
                                              >
                                                {descIndex + 1}. {description}
                                              </div>
                                              <div className={`text-xs mt-1 ${description.length > 90 ? 'text-red-600' : 'text-green-600'}`}>
                                                {description.length}/90 chars
                                              </div>
                                              <button
                                                onClick={() => deleteItem(['themes', String(themeIndex), 'adGroups', String(adGroupIndex), 'ads', String(adIndex), 'descriptions', String(descIndex)])}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
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
      {editableCampaign.negativeKeywords && editableCampaign.negativeKeywords.length > 0 && (
        <div className="mt-6 border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Negative Keywords (Campaign Level)</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={addNegativeKeyword}
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add</span>
              </button>
              <button
                onClick={() => copyToClipboard(editableCampaign.negativeKeywords.join('\n'), 'negative-keywords')}
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
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {editableCampaign.negativeKeywords.map((keyword, index) => {
              const negKeywordId = `neg-keyword-${index}`;
              const isEditing = editingItems.has(negKeywordId);
              
              return (
                <div key={index} className="relative group">
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={editValues[negKeywordId]}
                        onChange={(e) => setEditValues({ ...editValues, [negKeywordId]: e.target.value })}
                        className="text-sm bg-red-50 text-red-800 px-2 py-1 rounded w-full"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveEdit(negKeywordId, ['negativeKeywords', String(index)]);
                          }
                        }}
                      />
                      <button
                        onClick={() => saveEdit(negKeywordId, ['negativeKeywords', String(index)])}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        className="bg-red-50 text-red-800 px-2 py-1 rounded text-sm cursor-pointer hover:bg-red-100"
                        onClick={() => startEditing(negKeywordId, keyword)}
                      >
                        {keyword}
                      </div>
                      <button
                        onClick={() => deleteItem(['negativeKeywords', String(index)])}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white rounded-full p-1 shadow text-red-600 hover:text-red-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ad Extensions */}
      {editableCampaign.adExtensions && (
        <div className="mt-6 space-y-4">
          {editableCampaign.adExtensions.sitelinks && editableCampaign.adExtensions.sitelinks.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Sitelinks</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addSitelink}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(editableCampaign.adExtensions!.sitelinks!.join('\n'), 'sitelinks')}
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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {editableCampaign.adExtensions.sitelinks.map((sitelink, index) => {
                  const sitelinkId = `sitelink-${index}`;
                  const isEditing = editingItems.has(sitelinkId);
                  
                  return (
                    <div key={index} className="relative group">
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={editValues[sitelinkId]}
                            onChange={(e) => setEditValues({ ...editValues, [sitelinkId]: e.target.value })}
                            className="text-sm bg-blue-50 text-blue-800 px-3 py-2 rounded w-full"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveEdit(sitelinkId, ['adExtensions', 'sitelinks', String(index)]);
                              }
                            }}
                          />
                          <button
                            onClick={() => saveEdit(sitelinkId, ['adExtensions', 'sitelinks', String(index)])}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="bg-blue-50 text-blue-800 px-3 py-2 rounded cursor-pointer hover:bg-blue-100"
                            onClick={() => startEditing(sitelinkId, sitelink)}
                          >
                            {sitelink}
                          </div>
                          <button
                            onClick={() => deleteItem(['adExtensions', 'sitelinks', String(index)])}
                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white rounded-full p-1 shadow text-red-600 hover:text-red-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {editableCampaign.adExtensions.callouts && editableCampaign.adExtensions.callouts.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Callouts</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={addCallout}
                    className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard(editableCampaign.adExtensions!.callouts!.join('\n'), 'callouts')}
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
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {editableCampaign.adExtensions.callouts.map((callout, index) => {
                  const calloutId = `callout-${index}`;
                  const isEditing = editingItems.has(calloutId);
                  
                  return (
                    <div key={index} className="relative group">
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="text"
                            value={editValues[calloutId]}
                            onChange={(e) => setEditValues({ ...editValues, [calloutId]: e.target.value })}
                            className="text-sm bg-green-50 text-green-800 px-2 py-1 rounded w-full"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                saveEdit(calloutId, ['adExtensions', 'callouts', String(index)]);
                              }
                            }}
                          />
                          <button
                            onClick={() => saveEdit(calloutId, ['adExtensions', 'callouts', String(index)])}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div
                            className="bg-green-50 text-green-800 px-2 py-1 rounded text-sm cursor-pointer hover:bg-green-100"
                            onClick={() => startEditing(calloutId, callout)}
                          >
                            {callout}
                          </div>
                          <button
                            onClick={() => deleteItem(['adExtensions', 'callouts', String(index)])}
                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-white rounded-full p-1 shadow text-red-600 hover:text-red-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Regeneration Panel */}
      {showRegenerationPanel && (
        <RegenerationPanel
          campaign={editableCampaign}
          onRegenerationComplete={handleRegenerationComplete}
          onClose={() => setShowRegenerationPanel(false)}
        />
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