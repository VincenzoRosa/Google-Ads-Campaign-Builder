import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { CampaignGenerationRequest, CampaignGenerationResponse, GeneratedCampaign } from '../../types/campaign';

export async function POST(request: NextRequest): Promise<NextResponse<CampaignGenerationResponse>> {
  try {
    const { input }: CampaignGenerationRequest = await request.json();
    
    // Validate required fields
    if (!input.productDescription || !input.finalUrl || !input.targetCountry || !input.campaignLanguage) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // Check for API key - first from request, then from environment
    const apiKey = input.apiKey || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is required. Please enter your API key in the AI Settings.'
      }, { status: 400 });
    }

    // Initialize OpenAI with the provided API key
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const prompt = buildCampaignPrompt(input);
    
    // Check if it's an O-series model that requires max_completion_tokens
    const isOSeriesModel = input.aiModel && (
      input.aiModel.startsWith('o1') || 
      input.aiModel.startsWith('o3') || 
      input.aiModel.startsWith('o4')
    );
    
    // Build the completion parameters based on model type
    const completionParams: any = {
      model: input.aiModel || "gpt-4",
      messages: [
        {
          role: "system",
          content: isOSeriesModel 
            ? "You are a Google Ads expert. You MUST respond with ONLY valid JSON, no explanations or text before/after. Ensure all arrays have commas between elements and all JSON syntax is correct. Double-check your JSON is valid before responding."
            : "You are a Google Ads expert specializing in creating high-performing Search campaigns. You understand keyword research, match types, ad copy best practices, and local market preferences. Always respond with valid JSON structure as requested."
        },
        {
          role: "user",
          content: input.customPrompt ? `${prompt}\n\nAdditional Instructions: ${input.customPrompt}` : prompt
        }
      ],
    };
    
    // Use the correct parameter name based on model type
    if (isOSeriesModel) {
      completionParams.max_completion_tokens = input.maxTokens || 8000;
      // O-series models may not support temperature
    } else {
      completionParams.max_tokens = input.maxTokens || 8000;
      completionParams.temperature = 0.7;
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
    
    // Check if the response was truncated
    if (finishReason === 'length') {
      console.error('Response was truncated due to token limit');
      return NextResponse.json({
        success: false,
        error: 'Response was cut off due to token limit. Please try: 1) Reducing Max Tokens to 2000-4000, 2) Using "low" keyword density, 3) Using "conservative" match type strategy, or 4) Using a simpler product description.'
      }, { status: 500 });
    }

    // Parse the JSON response
    let parsedCampaign: GeneratedCampaign;
    try {
      parsedCampaign = JSON.parse(responseContent);
    } catch (parseError) {
      console.log('Initial JSON parse failed, attempting to fix...');
      
      // Try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Common JSON fixes
        try {
          // Fix missing commas between array elements
          jsonString = jsonString.replace(/"\s*\n\s*"/g, '",\n"');
          jsonString = jsonString.replace(/\]\s*\n\s*"/g, '],\n"');
          jsonString = jsonString.replace(/\}\s*\n\s*\{/g, '},\n{');
          jsonString = jsonString.replace(/\]\s*\n\s*\{/g, '],\n{');
          
          // Fix trailing commas
          jsonString = jsonString.replace(/,\s*\]/g, ']');
          jsonString = jsonString.replace(/,\s*\}/g, '}');
          
          // Try parsing the fixed JSON
          parsedCampaign = JSON.parse(jsonString);
          console.log('Successfully fixed and parsed JSON');
        } catch (fixError) {
          // If fixes didn't work, try more aggressive cleaning
          try {
            // Remove any text before or after the JSON
            const cleanJsonMatch = jsonString.match(/^\s*\{[\s\S]*\}\s*$/);
            if (cleanJsonMatch) {
              parsedCampaign = JSON.parse(cleanJsonMatch[0].trim());
            } else {
              throw new Error('Could not extract valid JSON structure');
            }
          } catch (finalError) {
            console.error('JSON parsing error details:', parseError);
            console.error('Response content preview:', responseContent.substring(0, 500));
            
            return NextResponse.json({
              success: false,
              error: `Invalid JSON response from AI. The model generated malformed JSON. Error: ${parseError instanceof Error ? parseError.message : 'Unknown error'}. Try using a different model or reducing the campaign size.`
            }, { status: 500 });
          }
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'No JSON structure found in AI response. The model may not have understood the request.'
        }, { status: 500 });
      }
    }

    // Validate the campaign structure
    if (!parsedCampaign.campaignName || !parsedCampaign.themes || !Array.isArray(parsedCampaign.themes)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid campaign structure received'
      }, { status: 500 });
    }

    // Add the finalUrl to the campaign
    parsedCampaign.finalUrl = input.finalUrl;

    return NextResponse.json({
      success: true,
      campaign: parsedCampaign
    });

  } catch (error) {
    console.error('Campaign generation error:', error);
    
    // Get more detailed error information
    let errorMessage = 'Internal server error';
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Check if it's an OpenAI API error
      if ('response' in error && error.response) {
        const response = error.response as any;
        if (response.data && response.data.error) {
          errorDetails = response.data.error.message || response.data.error;
        }
      }
      
      // Check for OpenAI specific error structure
      if ('error' in error && typeof error.error === 'object' && error.error !== null) {
        const openAIError = error.error as any;
        if (openAIError.message) {
          errorDetails = openAIError.message;
        }
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorDetails || errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

function buildCampaignPrompt(input: any): string {
  const keywordCount = input.keywordDensity === 'low' ? '5-7' : 
                      input.keywordDensity === 'medium' ? '8-10' : '10-15';

  const matchTypeInstructions = getMatchTypeInstructions(input.matchTypeStrategy);
  
  // Calculate minimum themes needed based on match type strategy
  const minThemes = input.matchTypeStrategy === 'conservative' ? 12 : 
                    input.matchTypeStrategy === 'balanced' ? 8 : 6;

  return `You are a Google Ads expert creating a Search campaign for:

Product: ${input.productDescription}
URL: ${input.finalUrl}
Country: ${input.targetCountry}
Language: ${input.campaignLanguage}
${input.brandName ? `Brand: ${input.brandName}` : ''}
${input.uniqueSellingPoints.length > 0 ? `USPs: ${input.uniqueSellingPoints.join(', ')}` : ''}
${input.price ? `Price: ${input.price} ${input.currency}` : ''}

Generate a COMPREHENSIVE Search campaign following these MANDATORY requirements:

1. Create AT LEAST ${minThemes} main keyword themes in ${input.campaignLanguage} for this product
2. ${matchTypeInstructions}
3. MANDATORY: Generate AT LEAST 12 ad groups in total (more is better!)
4. Include ${keywordCount} keyword variants per ad group
5. MANDATORY: Aim for 100+ total keywords across all ad groups
6. For each ad group, write 2 Responsive Search Ads in ${input.campaignLanguage}
7. Each RSA needs exactly 15 headlines (max 30 characters each) and 4 descriptions (max 90 characters each)
8. Headlines should include the keyword theme naturally
9. Include strong CTAs appropriate for ${input.targetCountry} market
10. Generate 15-20 negative keywords to exclude irrelevant traffic
11. Ensure all text fits character limits exactly
12. Include bid strategy recommendations
13. Generate campaign name in format: [Product] - ${input.targetCountry} - Search - ${new Date().toISOString().split('T')[0]}

IMPORTANT: This should be a LARGE, COMPREHENSIVE campaign. Think exhaustively about ALL the ways people might search:
- Generic product terms (multiple variations)
- Brand + product combinations
- Problem/solution keywords
- Feature-specific searches
- Comparison searches
- Location-based searches if relevant
- Intent-based searches (buy, purchase, order, shop, etc.)
- Quality modifiers (best, top, premium, cheap, affordable, etc.)
- Use case specific searches
- Seasonal or occasion-based searches if relevant

DO NOT STOP until you have AT LEAST 12 ad groups and 100+ keywords total!

CRITICAL: Respond ONLY with valid JSON in this exact structure:
{
  "campaignName": "string",
  "themes": [
    {
      "theme": "string",
      "adGroups": [
        {
          "name": "string",
          "matchType": "exact|phrase|broad",
          "keywords": [
            {
              "keyword": "string",
              "matchType": "exact|phrase|broad"
            }
          ],
          "ads": [
            {
              "headlines": ["15 headlines max 30 chars each"],
              "descriptions": ["4 descriptions max 90 chars each"]
            }
          ]
        }
      ]
    }
  ],
  "negativeKeywords": ["array of negative keywords"],
  "bidStrategy": "recommended bid strategy",
  "adExtensions": {
    "sitelinks": ["relevant sitelink texts"],
    "callouts": ["relevant callout texts"]
  }
}

Ensure all headlines are exactly 30 characters or less and all descriptions are exactly 90 characters or less.`;
}

function getMatchTypeInstructions(strategy: string): string {
  switch (strategy) {
    case 'conservative':
      return 'For EACH theme, create 1 ad group with Exact match only';
    case 'balanced':
      return 'For EACH theme, create 2 ad groups (Exact and Phrase match types)';
    case 'aggressive':
      return 'For EACH theme, create 3 ad groups (Exact, Phrase, and Broad match types)';
    default:
      return 'For EACH theme, create 2 ad groups (Exact and Phrase match types)';
  }
} 