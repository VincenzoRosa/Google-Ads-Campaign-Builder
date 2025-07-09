import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GeneratedCampaign } from '../../types/campaign';

interface RegenerationRequest {
  campaign: GeneratedCampaign;
  regenerationType: 'keywords' | 'rsa' | 'both';
  apiKey: string;
  aiModel?: string;
  maxTokens?: number;
  customPrompt?: string;
  targetTheme?: string; // Optional: regenerate only for specific theme (deprecated - use targetThemeIndex)
  targetAdGroup?: string; // Optional: regenerate only for specific ad group (deprecated - use targetAdGroupIndex)
  targetThemeIndex?: number; // Optional: regenerate only for specific theme by index
  targetAdGroupIndex?: string; // Optional: regenerate only for specific ad group by index (format: "themeIndex-adGroupIndex")
}

interface RegenerationResponse {
  success: boolean;
  campaign?: GeneratedCampaign;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<RegenerationResponse>> {
  try {
    const { campaign, regenerationType, apiKey, aiModel, maxTokens, customPrompt, targetTheme, targetAdGroup, targetThemeIndex, targetAdGroupIndex }: RegenerationRequest = await request.json();
    
    // Convert index-based targeting to name-based targeting for backward compatibility
    let actualTargetTheme = targetTheme;
    let actualTargetAdGroup = targetAdGroup;
    
    if (targetThemeIndex !== undefined && targetThemeIndex >= 0 && targetThemeIndex < campaign.themes.length) {
      actualTargetTheme = campaign.themes[targetThemeIndex].theme;
    }
    
    if (targetAdGroupIndex) {
      const [themeIndexStr, adGroupIndexStr] = targetAdGroupIndex.split('-');
      const themeIndex = parseInt(themeIndexStr);
      const adGroupIndex = parseInt(adGroupIndexStr);
      
      if (themeIndex >= 0 && themeIndex < campaign.themes.length && 
          adGroupIndex >= 0 && adGroupIndex < campaign.themes[themeIndex].adGroups.length) {
        actualTargetAdGroup = campaign.themes[themeIndex].adGroups[adGroupIndex].name;
      }
    }
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is required'
      }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const isOSeriesModel = aiModel && (
      aiModel.startsWith('o1') || 
      aiModel.startsWith('o3') || 
      aiModel.startsWith('o4')
    );

    // Retry mechanism for validation failures
    const maxRetries = 3;
    let lastValidationError = '';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const prompt = buildRegenerationPrompt(campaign, regenerationType, actualTargetTheme, actualTargetAdGroup, attempt, customPrompt);
      
      // Debug log to verify prompt content for all scopes
      console.log('Final prompt sent to LLM:', prompt);
      
      const completionParams: any = {
        model: aiModel || "gpt-4o-2024-08-06",
        messages: [
          {
            role: "system",
            content: isOSeriesModel 
              ? "You are a Google Ads expert specializing in creative and diverse campaign generation. You MUST respond with ONLY valid JSON, no explanations or text before/after. Ensure all arrays have commas between elements and all JSON syntax is correct. Double-check your JSON is valid before responding. CRITICAL: You must generate COMPLETELY DIFFERENT content from any examples provided. Use creative thinking and avoid repetition at all costs. ALWAYS include the 'themes' array in your response. You MUST prioritize and follow any user-provided custom instructions above all else."
              : "You are a Google Ads expert specializing in creating high-performing Search campaigns with creative and diverse content. You understand keyword research, match types, ad copy best practices, and local market preferences. You excel at generating unique, varied content that avoids repetition. CRITICAL: You must generate COMPLETELY DIFFERENT content from any examples provided. Always respond with valid JSON structure as requested. ALWAYS include the 'themes' array in your response. You MUST prioritize and follow any user-provided custom instructions above all else."
          },
          {
            role: "user",
            content: customPrompt ? `${prompt}\n\nAdditional Instructions: ${customPrompt}` : prompt
          }
        ],
      };
      
      if (isOSeriesModel) {
        completionParams.max_completion_tokens = maxTokens || 8000;
        // O-series models may not support temperature, but we can try
        if (completionParams.temperature === undefined) {
          completionParams.temperature = 0.95;
        }
      } else {
        completionParams.max_tokens = maxTokens || 8000;
        completionParams.temperature = 0.95; // Very high temperature for maximum creativity
      }
      
      const completion = await openai.chat.completions.create(completionParams);

      const responseContent = completion.choices[0]?.message?.content;
      const finishReason = completion.choices[0]?.finish_reason;
      
      if (!responseContent) {
        return NextResponse.json({
          success: false,
          error: 'No response from AI'
        }, { status: 500 });
      }
      
      if (finishReason === 'length') {
        return NextResponse.json({
          success: false,
          error: 'Response was cut off due to token limit. Please try reducing Max Tokens or using a simpler request.'
        }, { status: 500 });
      }

      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(responseContent);
      } catch (parseError) {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let jsonString = jsonMatch[0];
          jsonString = jsonString.replace(/"\s*\n\s*"/g, '",\n"');
          jsonString = jsonString.replace(/\]\s*\n\s*"/g, '],\n"');
          jsonString = jsonString.replace(/\}\s*\n\s*\{/g, '},\n{');
          jsonString = jsonString.replace(/\]\s*\n\s*\{/g, '],\n{');
          jsonString = jsonString.replace(/,\s*\]/g, ']');
          jsonString = jsonString.replace(/,\s*\}/g, '}');
          
          try {
            parsedResponse = JSON.parse(jsonString);
          } catch (fixError) {
            return NextResponse.json({
              success: false,
              error: `Invalid JSON response from AI. Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
            }, { status: 500 });
          }
        } else {
          return NextResponse.json({
            success: false,
            error: 'No JSON structure found in AI response'
          }, { status: 500 });
        }
      }

      // Validate that the regenerated content is actually different
      const validationResult = validateRegeneratedContent(campaign, parsedResponse, regenerationType, actualTargetTheme, actualTargetAdGroup);
      if (validationResult.isValid) {
        // Merge the regenerated content with the existing campaign
        const updatedCampaign = mergeRegeneratedContent(campaign, parsedResponse, regenerationType, actualTargetTheme, actualTargetAdGroup);

        return NextResponse.json({
          success: true,
          campaign: updatedCampaign
        });
      } else {
        lastValidationError = validationResult.message;
        
        // If this is the last attempt, return the error
        if (attempt === maxRetries) {
          return NextResponse.json({
            success: false,
            error: `Generated content is too similar to existing content. ${lastValidationError}`
          }, { status: 400 });
        }
        
        // Otherwise, continue to next attempt
        console.log(`Regeneration attempt ${attempt} failed validation: ${lastValidationError}. Retrying...`);
      }
    }

    // This should never be reached, but TypeScript requires it
    return NextResponse.json({
      success: false,
      error: 'Unexpected error in regeneration process'
    }, { status: 500 });

  } catch (error) {
    console.error('Campaign regeneration error:', error);
    
    let errorMessage = 'Internal server error';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

function buildRegenerationPrompt(campaign: GeneratedCampaign, regenerationType: string, targetTheme?: string, targetAdGroup?: string, attempt?: number, customPrompt?: string): string {
  let prompt = '';
  if (customPrompt) {
    prompt += `USER CUSTOM INSTRUCTIONS: ${customPrompt}\n\n`;
  }
  if (attempt && attempt > 1) {
    prompt += `⚠️ ATTEMPT ${attempt}: Your previous response was rejected because it did not match the required structure. You MUST create EXACTLY ${campaign.themes.length} themes and EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} ad groups. This is your ${attempt}${attempt === 2 ? 'nd' : attempt === 3 ? 'rd' : 'th'} attempt - please be extremely careful with the structure.\n\n`;
  }
  
  prompt += `Campaign Name: ${campaign.campaignName}\n`;
  prompt += `Final URL: ${campaign.finalUrl}\n\n`;
  
  // Add current themes and ad groups
  campaign.themes.forEach((theme, themeIndex) => {
    // For Keywords Only regeneration, show ALL themes so LLM can preserve non-target ones
    if (regenerationType === 'keywords') {
      // Show all themes, but mark which ones to regenerate
      let isTargetTheme = false;
      
      if (targetTheme) {
        // Theme-specific regeneration
        isTargetTheme = theme.theme === targetTheme;
      } else if (targetAdGroup) {
        // Ad group-specific regeneration - only mark theme that contains the target ad group
        isTargetTheme = theme.adGroups.some(adGroup => adGroup.name === targetAdGroup);
      } else {
        // Entire campaign regeneration
        isTargetTheme = true;
      }
      
      prompt += `Theme ${themeIndex + 1}: ${theme.theme}${isTargetTheme ? ' (REGENERATE THIS THEME)' : ' (KEEP EXISTING)'}\n`;
      
      theme.adGroups.forEach((adGroup, adGroupIndex) => {
        const isTargetAdGroup = targetAdGroup ? adGroup.name === targetAdGroup : true;
        const shouldShowKeywords = isTargetTheme && isTargetAdGroup;
        
        prompt += `  Ad Group: ${adGroup.name} (${adGroup.matchType} match)${shouldShowKeywords ? ' (REGENERATE THIS AD GROUP)' : ' (KEEP EXISTING)'}\n`;
        
        if (shouldShowKeywords) {
          prompt += `  CURRENT KEYWORDS (DO NOT REPEAT THESE - USE COMPLETELY DIFFERENT TERMS):\n`;
          adGroup.keywords.forEach(keyword => {
            prompt += `    - ${keyword.keyword} (${keyword.matchType})\n`;
          });
        }
        prompt += `\n`;
      });
    } else if (regenerationType === 'rsa') {
      // For RSA regeneration, show ALL themes and ad groups with clear marking
      let isTargetTheme = false;
      
      if (targetTheme) {
        // Theme-specific regeneration
        isTargetTheme = theme.theme === targetTheme;
      } else if (targetAdGroup) {
        // Ad group-specific regeneration - check if this theme contains the target ad group
        isTargetTheme = theme.adGroups.some(adGroup => adGroup.name === targetAdGroup);
      } else {
        // Entire campaign regeneration
        isTargetTheme = true;
      }
      
      prompt += `Theme ${themeIndex + 1}: ${theme.theme}${isTargetTheme ? ' (REGENERATE ADS IN THIS THEME)' : ' (KEEP EXISTING ADS)'}\n`;
      
      theme.adGroups.forEach((adGroup, adGroupIndex) => {
        const isTargetAdGroup = targetAdGroup ? adGroup.name === targetAdGroup : true;
        const shouldShowAds = isTargetTheme && isTargetAdGroup;
        
        prompt += `  Ad Group: ${adGroup.name} (${adGroup.matchType} match)${shouldShowAds ? ' (REGENERATE ADS IN THIS AD GROUP)' : ' (KEEP EXISTING ADS)'}\n`;
        
        if (shouldShowAds) {
          prompt += `  CURRENT RSA ADS (DO NOT REPEAT THESE - USE COMPLETELY DIFFERENT MESSAGING):\n`;
          adGroup.ads.forEach((ad, adIndex) => {
            prompt += `    RSA ${adIndex + 1}:\n`;
            prompt += `      Headlines: ${ad.headlines.join(', ')}\n`;
            prompt += `      Descriptions: ${ad.descriptions.join(', ')}\n`;
          });
        }
        prompt += `\n`;
      });
    } else {
      // For Both regeneration, use the existing filtering logic
      if (targetTheme && theme.theme !== targetTheme) return;
      
      prompt += `Theme ${themeIndex + 1}: ${theme.theme}\n`;
      theme.adGroups.forEach((adGroup, adGroupIndex) => {
        if (targetAdGroup && adGroup.name !== targetAdGroup) return;
        
        prompt += `  Ad Group: ${adGroup.name} (${adGroup.matchType} match)\n`;
        
        if (regenerationType === 'keywords' || regenerationType === 'both') {
          prompt += `  CURRENT KEYWORDS (DO NOT REPEAT THESE - USE COMPLETELY DIFFERENT TERMS):\n`;
          adGroup.keywords.forEach(keyword => {
            prompt += `    - ${keyword.keyword} (${keyword.matchType})\n`;
          });
        }
        
        if (regenerationType === 'rsa' || regenerationType === 'both') {
          prompt += `  CURRENT RSA ADS (DO NOT REPEAT THESE - USE COMPLETELY DIFFERENT MESSAGING):\n`;
          adGroup.ads.forEach((ad, adIndex) => {
            prompt += `    RSA ${adIndex + 1}:\n`;
            prompt += `      Headlines: ${ad.headlines.join(', ')}\n`;
            prompt += `      Descriptions: ${ad.descriptions.join(', ')}\n`;
          });
        }
        prompt += `\n`;
      });
    }
  });

  prompt += `\nCRITICAL INSTRUCTIONS FOR DIFFERENT CONTENT:\n`;
  prompt += `- You MUST generate COMPLETELY NEW and DIFFERENT content\n`;
  prompt += `- DO NOT reuse any existing keywords or ad copy\n`;
  prompt += `- Use different synonyms, variations, and approaches\n`;
  prompt += `- Think creatively and generate fresh alternatives\n`;
  prompt += `- If current keywords are about "quality", focus on "price" or "features"\n`;
  prompt += `- If current ads mention "best", try "affordable" or "premium"\n`;
  prompt += `- Use different emotional triggers and value propositions\n`;
  prompt += `- MANDATORY: You MUST create EXACTLY ${campaign.themes.length} themes - NO MORE, NO LESS\n`;
  prompt += `- MANDATORY: You MUST create EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} total ad groups - NO MORE, NO LESS\n`;
  prompt += `- FAILURE TO MATCH THESE COUNTS WILL RESULT IN REJECTION\n\n`;
  
  if (regenerationType === 'keywords') {
    prompt += `REGENERATE KEYWORDS AND NAMES:\n`;
    prompt += `- Generate 5-15 NEW keywords per ad group\n`;
    prompt += `- Use DIFFERENT synonyms, variations, and search terms\n`;
    prompt += `- Include a mix of exact, phrase, and broad match keywords\n`;
    prompt += `- Focus on relevant, high-intent keywords\n`;
    prompt += `- AVOID any keywords that already exist in the current list\n`;
    prompt += `- Try different search intents (buying vs researching, specific vs general)\n`;
    prompt += `- IMPORTANT: Also generate NEW theme names and ad group names that best reflect the new keyword focus. Do NOT reuse the old names.\n`;
    
    if (targetAdGroup) {
      prompt += `- CRITICAL: You are regenerating keywords for ONE specific ad group only: "${targetAdGroup}"\n`;
      prompt += `- You MUST create EXACTLY ${campaign.themes.length} themes and EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} total ad groups.\n`;
      prompt += `- For the "${targetAdGroup}" ad group, generate completely new keywords and a new ad group name\n`;
      prompt += `- For ALL OTHER ad groups, keep the existing keywords and names exactly as they are\n`;
      prompt += `- MANDATORY: Only regenerate content for the "${targetAdGroup}" ad group shown above\n`;
    } else if (targetTheme) {
      prompt += `- CRITICAL: You are regenerating keywords for ONE specific theme only: "${targetTheme}"\n`;
      prompt += `- You MUST create EXACTLY ${campaign.themes.length} themes and EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} total ad groups.\n`;
      prompt += `- For the "${targetTheme}" theme, generate completely new keywords, theme name, and ad group names\n`;
      prompt += `- For ALL OTHER themes, keep the existing keywords and names exactly as they are\n`;
      prompt += `- MANDATORY: Only regenerate content for the "${targetTheme}" theme shown above\n`;
    } else {
      prompt += `- CRITICAL: You MUST create EXACTLY ${campaign.themes.length} themes and EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} total ad groups.\n`;
    }
    
    prompt += `- MANDATORY: Count your themes and ad groups before responding. If you don't have exactly ${campaign.themes.length} themes and ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} ad groups, regenerate until you do.\n`;
    prompt += `- IMPORTANT: Pay close attention to any additional instructions provided in the custom prompt field\n`;
    prompt += `- MANDATORY: Follow ALL custom instructions provided in the additional prompt field\n`;
  } else if (regenerationType === 'rsa') {
    prompt += `REGENERATE RESPONSIVE SEARCH ADS:\n`;
    if (targetAdGroup) {
      prompt += `- Generate 2 NEW RSAs ONLY for the "${targetAdGroup}" ad group marked with "(REGENERATE ADS IN THIS AD GROUP)"\n`;
      prompt += `- For all OTHER ad groups marked with "(KEEP EXISTING ADS)", keep the existing ads exactly as they are\n`;
    } else if (targetTheme) {
      prompt += `- Generate 2 NEW RSAs for all ad groups in the "${targetTheme}" theme marked with "(REGENERATE ADS IN THIS THEME)"\n`;
      prompt += `- For all OTHER themes marked with "(KEEP EXISTING ADS)", keep the existing ads exactly as they are\n`;
    } else {
      prompt += `- Generate 2 NEW RSAs per ad group for ALL themes and ad groups\n`;
    }
    prompt += `- Each RSA should have 15 NEW headlines (max 30 characters each)\n`;
    prompt += `- Each RSA should have 4 NEW descriptions (max 90 characters each)\n`;
    prompt += `- Use DIFFERENT messaging, benefits, and calls-to-action\n`;
    prompt += `- AVOID any headlines or descriptions that already exist\n`;
    prompt += `- Try different value propositions (quality, price, convenience, etc.)\n`;
    prompt += `- CRITICAL: Keep the EXACT SAME theme names, ad group names, and keywords as shown above - DO NOT change them\n`;
    prompt += `- CRITICAL: Only regenerate the ads content (headlines and descriptions), preserve all other structure\n`;
    prompt += `- IMPORTANT: Pay close attention to any additional instructions provided in the custom prompt field\n`;
    prompt += `- MANDATORY: Follow ALL custom instructions provided in the additional prompt field\n`;
    prompt += `- CRITICAL: You MUST create EXACTLY ${campaign.themes.length} themes and EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} total ad groups.\n`;
    prompt += `- MANDATORY: Count your themes and ad groups before responding. If you don't have exactly ${campaign.themes.length} themes and ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} ad groups, regenerate until you do.\n`;
  } else if (regenerationType === 'both') {
    prompt += `REGENERATE BOTH KEYWORDS, ADS, AND NAMES:\n`;
    prompt += `- Generate 5-15 NEW keywords per ad group\n`;
    prompt += `- Generate 2 NEW RSAs per ad group with 15 headlines and 4 descriptions each\n`;
    prompt += `- Use COMPLETELY DIFFERENT keywords and messaging\n`;
    prompt += `- Ensure keywords and ad copy work well together\n`;
    prompt += `- AVOID any existing keywords, headlines, or descriptions\n`;
    prompt += `- Try different approaches and search intents\n`;
    prompt += `- IMPORTANT: Also generate NEW theme names and ad group names that best reflect the new keyword focus. Do NOT reuse the old names.\n`;
    prompt += `- CRITICAL: You MUST create EXACTLY ${campaign.themes.length} themes and EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} ad groups total.\n`;
    prompt += `- MANDATORY: Aim for 100+ total keywords across all ad groups\n`;
    prompt += `- MANDATORY: Count your themes and ad groups before responding. If you don't have exactly ${campaign.themes.length} themes and ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} ad groups, regenerate until you do.\n`;
    prompt += `- MANDATORY: Do NOT create fewer themes or ad groups than the original campaign.\n`;
    prompt += `- IMPORTANT: Pay close attention to any additional instructions provided in the custom prompt field\n`;
    prompt += `- MANDATORY: Follow ALL custom instructions provided in the additional prompt field\n`;
  }

  // Add JSON structure instructions based on regeneration type
  if (regenerationType === 'rsa') {
    prompt += `\nIMPORTANT: You MUST respond with a valid JSON object that includes the \"themes\" array with the same structure as the original campaign. For RSA regeneration, keep the EXACT SAME theme names, ad group names, and keywords as shown above - ONLY change the ads (headlines and descriptions) for ad groups marked with "(REGENERATE ADS".\n`;
  } else {
    prompt += `\nIMPORTANT: You MUST respond with a valid JSON object that includes the \"themes\" array with the same structure as the original campaign. For keywords, theme, and ad group regeneration, the \"theme\" and \"adGroups.name\" fields should be NEW and relevant to the new keywords. Do NOT reuse the old names.\n`;
  }
  
  prompt += `\nJSON STRUCTURE REQUIRED:\n`;
  prompt += `{\n`;
  prompt += `  "themes": [\n`;
  prompt += `    {\n`;
  prompt += `      "theme": "Theme Name",\n`;
  prompt += `      "adGroups": [\n`;
  prompt += `        {\n`;
  prompt += `          "name": "Ad Group Name",\n`;
  prompt += `          "matchType": "broad",\n`;
  prompt += `          "keywords": [\n`;
  prompt += `            {"keyword": "keyword text", "matchType": "exact"}\n`;
  prompt += `          ],\n`;
  prompt += `          "ads": [\n`;
  prompt += `            {\n`;
  prompt += `              "headlines": ["headline 1", "headline 2", ...],\n`;
  prompt += `              "descriptions": ["description 1", "description 2", ...]\n`;
  prompt += `            }\n`;
  prompt += `          ]\n`;
  prompt += `        }\n`;
  prompt += `      ]\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n\n`;
  
  prompt += `\nFINAL VERIFICATION:\n`;
  prompt += `Before responding, count your themes and ad groups:\n`;
  prompt += `- You must have EXACTLY ${campaign.themes.length} themes\n`;
  prompt += `- You must have EXACTLY ${campaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0)} total ad groups\n`;
  prompt += `- If these counts don't match, regenerate your response\n\n`;
  prompt += `Respond with ONLY the JSON object containing the regenerated content. For keywords, include the keyword text and match type. For RSA ads, include headlines and descriptions arrays.`;
  
  return prompt;
}

function validateRegeneratedContent(originalCampaign: GeneratedCampaign, regeneratedContent: any, regenerationType: string, targetTheme?: string, targetAdGroup?: string): { isValid: boolean; message: string } {
  if (!regeneratedContent.themes || !Array.isArray(regeneratedContent.themes)) {
    return { isValid: false, message: 'No themes found in regenerated content' };
  }

  // For RSA-only regeneration, we use position-based matching and don't need strict count validation
  if (regenerationType === 'rsa') {
    // For RSA-only, we just need to ensure the structure is reasonable
    // The LLM should return the same structure as the original, but we'll be flexible
    if (regeneratedContent.themes.length === 0) {
      return { isValid: false, message: 'No themes found in regenerated content' };
    }
  } else {
    // For keywords and both regeneration, we need exact count matching
    const originalThemeCount = originalCampaign.themes.length;
    const originalAdGroupCount = originalCampaign.themes.reduce((total, theme) => total + theme.adGroups.length, 0);
    const regeneratedThemeCount = regeneratedContent.themes.length;
    const regeneratedAdGroupCount = regeneratedContent.themes.reduce((total: number, theme: any) => total + (theme.adGroups ? theme.adGroups.length : 0), 0);

    if (regeneratedThemeCount !== originalThemeCount) {
      return { 
        isValid: false, 
        message: `Theme count mismatch. Original: ${originalThemeCount}, Regenerated: ${regeneratedThemeCount}. Please ensure you create exactly ${originalThemeCount} themes.` 
      };
    }

    if (regeneratedAdGroupCount !== originalAdGroupCount) {
      return { 
        isValid: false, 
        message: `Ad group count mismatch. Original: ${originalAdGroupCount}, Regenerated: ${regeneratedAdGroupCount}. Please ensure you create exactly ${originalAdGroupCount} ad groups.` 
      };
    }
  }

  let totalKeywords = 0;
  let totalAds = 0;
  let duplicateKeywords = 0;
  let duplicateHeadlines = 0;
  let duplicateDescriptions = 0;
  let invalidHeadlines: string[] = [];
  let invalidDescriptions: string[] = [];

  // Collect all existing content for comparison
  const existingKeywords = new Set<string>();
  const existingHeadlines = new Set<string>();
  const existingDescriptions = new Set<string>();

  originalCampaign.themes.forEach(theme => {
    if (targetTheme && theme.theme !== targetTheme) return;
    theme.adGroups.forEach(adGroup => {
      if (targetAdGroup && adGroup.name !== targetAdGroup) return;
      
      if (regenerationType === 'keywords' || regenerationType === 'both') {
        adGroup.keywords.forEach(keyword => {
          existingKeywords.add(keyword.keyword.toLowerCase().trim());
        });
      }
      
      if (regenerationType === 'rsa' || regenerationType === 'both') {
        adGroup.ads.forEach(ad => {
          ad.headlines.forEach(headline => {
            existingHeadlines.add(headline.toLowerCase().trim());
          });
          ad.descriptions.forEach(description => {
            existingDescriptions.add(description.toLowerCase().trim());
          });
        });
      }
    });
  });

  // Check regenerated content
  if (regenerationType === 'rsa') {
    // For RSA-only, use position-based matching like the merge logic
    regeneratedContent.themes.forEach((regeneratedTheme: any, themeIndex: number) => {
      if (themeIndex < originalCampaign.themes.length) {
        const originalTheme = originalCampaign.themes[themeIndex];
        
        // Skip if we're targeting a specific theme and this isn't it
        if (targetTheme && originalTheme.theme !== targetTheme) return;
        
        if (regeneratedTheme.adGroups && Array.isArray(regeneratedTheme.adGroups)) {
          regeneratedTheme.adGroups.forEach((regeneratedAdGroup: any, adGroupIndex: number) => {
            if (adGroupIndex < originalTheme.adGroups.length) {
              const originalAdGroup = originalTheme.adGroups[adGroupIndex];
              
              // Skip if we're targeting a specific ad group and this isn't it
              if (targetAdGroup && originalAdGroup.name !== targetAdGroup) return;

              // Always check character limits for RSA ads
              if (regeneratedAdGroup.ads) {
                totalAds += regeneratedAdGroup.ads.length;
                regeneratedAdGroup.ads.forEach((ad: any) => {
                  if (ad.headlines) {
                    ad.headlines.forEach((headline: string) => {
                      // Check headline character limit (30 characters)
                      if (headline.length > 30) {
                        invalidHeadlines.push(`"${headline}" (${headline.length} characters)`);
                      }
                      // Check for duplicates
                      if (existingHeadlines.has(headline.toLowerCase().trim())) {
                        duplicateHeadlines++;
                      }
                    });
                  }
                  if (ad.descriptions) {
                    ad.descriptions.forEach((description: string) => {
                      // Check description character limit (90 characters)
                      if (description.length > 90) {
                        invalidDescriptions.push(`"${description}" (${description.length} characters)`);
                      }
                      // Check for duplicates
                      if (existingDescriptions.has(description.toLowerCase().trim())) {
                        duplicateDescriptions++;
                      }
                    });
                  }
                });
              }
            }
          });
        }
      }
    });
  } else {
    // For keywords and both regeneration, use name-based matching
    regeneratedContent.themes.forEach((regeneratedTheme: any) => {
      const existingTheme = originalCampaign.themes.find(theme => theme.theme === regeneratedTheme.theme);
      if (!existingTheme || (targetTheme && regeneratedTheme.theme !== targetTheme)) return;

      regeneratedTheme.adGroups.forEach((regeneratedAdGroup: any) => {
        const existingAdGroup = existingTheme.adGroups.find(adGroup => adGroup.name === regeneratedAdGroup.name);
        if (!existingAdGroup || (targetAdGroup && regeneratedAdGroup.name !== targetAdGroup)) return;

        if (regenerationType === 'keywords' || regenerationType === 'both') {
          if (regeneratedAdGroup.keywords) {
            totalKeywords += regeneratedAdGroup.keywords.length;
            regeneratedAdGroup.keywords.forEach((keyword: any) => {
              if (existingKeywords.has(keyword.keyword.toLowerCase().trim())) {
                duplicateKeywords++;
              }
            });
          }
        }

        // Always check character limits for RSA ads, regardless of regeneration type
        if (regeneratedAdGroup.ads) {
          totalAds += regeneratedAdGroup.ads.length;
          regeneratedAdGroup.ads.forEach((ad: any) => {
            if (ad.headlines) {
              ad.headlines.forEach((headline: string) => {
                // Check headline character limit (30 characters)
                if (headline.length > 30) {
                  invalidHeadlines.push(`"${headline}" (${headline.length} characters)`);
                }
                // Only check for duplicates if we're regenerating RSA content
                if ((regenerationType === 'rsa' || regenerationType === 'both') && existingHeadlines.has(headline.toLowerCase().trim())) {
                  duplicateHeadlines++;
                }
              });
            }
            if (ad.descriptions) {
              ad.descriptions.forEach((description: string) => {
                // Check description character limit (90 characters)
                if (description.length > 90) {
                  invalidDescriptions.push(`"${description}" (${description.length} characters)`);
                }
                // Only check for duplicates if we're regenerating RSA content
                if ((regenerationType === 'rsa' || regenerationType === 'both') && existingDescriptions.has(description.toLowerCase().trim())) {
                  duplicateDescriptions++;
                }
              });
            }
          });
        }
      });
    });
  }

  // Check for character limit violations
  if (invalidHeadlines.length > 0) {
    console.log(`Character limit validation failed - Invalid headlines: ${invalidHeadlines.join(', ')}`);
    return { 
      isValid: false, 
      message: `Headlines exceed 30 character limit: ${invalidHeadlines.join(', ')}. Please regenerate with shorter headlines.` 
    };
  }

  if (invalidDescriptions.length > 0) {
    console.log(`Character limit validation failed - Invalid descriptions: ${invalidDescriptions.join(', ')}`);
    return { 
      isValid: false, 
      message: `Descriptions exceed 90 character limit: ${invalidDescriptions.join(', ')}. Please regenerate with shorter descriptions.` 
    };
  }

  // Calculate similarity percentages
  const keywordSimilarity = totalKeywords > 0 ? (duplicateKeywords / totalKeywords) * 100 : 0;
  const headlineSimilarity = totalAds > 0 ? (duplicateHeadlines / (totalAds * 15)) * 100 : 0; // Assuming 15 headlines per ad
  const descriptionSimilarity = totalAds > 0 ? (duplicateDescriptions / (totalAds * 4)) * 100 : 0; // Assuming 4 descriptions per ad

  const maxAllowedSimilarity = 20; // Allow up to 20% similarity

  if (keywordSimilarity > maxAllowedSimilarity) {
    return { 
      isValid: false, 
      message: `Too many duplicate keywords (${keywordSimilarity.toFixed(1)}% similar). Please try again with different instructions.` 
    };
  }

  if (headlineSimilarity > maxAllowedSimilarity) {
    return { 
      isValid: false, 
      message: `Too many duplicate headlines (${headlineSimilarity.toFixed(1)}% similar). Please try again with different instructions.` 
    };
  }

  if (descriptionSimilarity > maxAllowedSimilarity) {
    return { 
      isValid: false, 
      message: `Too many duplicate descriptions (${descriptionSimilarity.toFixed(1)}% similar). Please try again with different instructions.` 
    };
  }

  return { isValid: true, message: 'Content validation passed' };
}

function mergeRegeneratedContent(originalCampaign: GeneratedCampaign, regeneratedContent: any, regenerationType: string, targetTheme?: string, targetAdGroup?: string): GeneratedCampaign {
  const updatedCampaign = { ...originalCampaign };
  
  // If regeneratedContent has themes, merge them
  if (regeneratedContent.themes && Array.isArray(regeneratedContent.themes)) {
    // For keywords regeneration with specific targeting, we need selective updates
    if (regenerationType === 'keywords' && (targetTheme || targetAdGroup)) {
      // Use position-based matching to handle theme/ad group name changes
      regeneratedContent.themes.forEach((regeneratedTheme: any, themeIndex: number) => {
        if (themeIndex < updatedCampaign.themes.length) {
          const originalTheme = updatedCampaign.themes[themeIndex];
          
          // Determine if this theme should be updated based on targeting
          let shouldUpdateTheme = false;
          
          if (targetTheme) {
            // Theme-specific targeting - check if original theme matches target
            shouldUpdateTheme = originalTheme.theme === targetTheme;
          } else if (targetAdGroup) {
            // Ad group-specific targeting - check if this theme contains the target ad group
            shouldUpdateTheme = originalTheme.adGroups.some(adGroup => adGroup.name === targetAdGroup);
          }
          
          if (shouldUpdateTheme) {
            // Update theme name if regenerating this theme
            updatedCampaign.themes[themeIndex].theme = regeneratedTheme.theme;
            
            // Process ad groups by position
            if (regeneratedTheme.adGroups && Array.isArray(regeneratedTheme.adGroups)) {
              regeneratedTheme.adGroups.forEach((regeneratedAdGroup: any, adGroupIndex: number) => {
                if (adGroupIndex < originalTheme.adGroups.length) {
                  const originalAdGroup = originalTheme.adGroups[adGroupIndex];
                  
                  // Determine if this ad group should be updated
                  let shouldUpdateAdGroup = false;
                  
                  if (targetAdGroup) {
                    // Ad group-specific targeting - only update the target ad group
                    shouldUpdateAdGroup = originalAdGroup.name === targetAdGroup;
                  } else {
                    // Theme-specific targeting - update all ad groups in the theme
                    shouldUpdateAdGroup = true;
                  }
                  
                  if (shouldUpdateAdGroup) {
                    updatedCampaign.themes[themeIndex].adGroups[adGroupIndex].name = regeneratedAdGroup.name;
                    updatedCampaign.themes[themeIndex].adGroups[adGroupIndex].keywords = regeneratedAdGroup.keywords;
                    // For keywords-only regeneration, DO NOT update ads - keep existing ads
                    // (ads should only be updated for 'rsa' or 'both' regeneration types)
                  }
                }
              });
            }
          }
        }
      });
    } else if (regenerationType === 'keywords' || regenerationType === 'both') {
      // Replace the entire campaign content with regenerated content (for full campaign regeneration)
      updatedCampaign.themes = regeneratedContent.themes;
    } else if (regenerationType === 'rsa') {
      // For RSA only, we need to merge while keeping existing structure
      // Match by position/index instead of by name to avoid merge failures
      regeneratedContent.themes.forEach((regeneratedTheme: any, themeIndex: number) => {
        // Check if this theme index exists in the original campaign
        if (themeIndex < updatedCampaign.themes.length) {
          const originalTheme = updatedCampaign.themes[themeIndex];
          
          // Skip if we're targeting a specific theme and this isn't it
          if (targetTheme && originalTheme.theme !== targetTheme) return;
          
          // Process ad groups by position/index
          if (regeneratedTheme.adGroups && Array.isArray(regeneratedTheme.adGroups)) {
            regeneratedTheme.adGroups.forEach((regeneratedAdGroup: any, adGroupIndex: number) => {
              // Check if this ad group index exists in the original theme
              if (adGroupIndex < originalTheme.adGroups.length) {
                const originalAdGroup = originalTheme.adGroups[adGroupIndex];
                
                // Skip if we're targeting a specific ad group and this isn't it
                if (targetAdGroup && originalAdGroup.name !== targetAdGroup) return;
                
                // Only update ads for RSA regeneration, preserve everything else
                if (regeneratedAdGroup.ads && Array.isArray(regeneratedAdGroup.ads)) {
                  updatedCampaign.themes[themeIndex].adGroups[adGroupIndex].ads = regeneratedAdGroup.ads;
                }
              }
            });
          }
        }
      });
    }
  }
  
  return updatedCampaign;
} 