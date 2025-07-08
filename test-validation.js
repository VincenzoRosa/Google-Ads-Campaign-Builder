// Simple test for content validation logic
const originalCampaign = {
  themes: [
    {
      theme: "Quality",
      adGroups: [
        {
          name: "Premium Products",
          keywords: [
            { keyword: "best quality", matchType: "phrase" },
            { keyword: "premium", matchType: "broad" },
            { keyword: "high quality", matchType: "exact" }
          ],
          ads: [
            {
              headlines: ["Best Quality Products", "Premium Selection", "High Standards"],
              descriptions: ["Get the best quality products", "Premium selection available"]
            }
          ]
        }
      ]
    }
  ]
};

const similarContent = {
  themes: [
    {
      theme: "Quality",
      adGroups: [
        {
          name: "Premium Products",
          keywords: [
            { keyword: "best quality", matchType: "phrase" }, // Duplicate
            { keyword: "top quality", matchType: "broad" },
            { keyword: "excellent quality", matchType: "exact" }
          ],
          ads: [
            {
              headlines: ["Best Quality Products", "Top Selection", "Excellent Standards"], // First headline is duplicate
              descriptions: ["Get the best quality products", "Top selection available"] // First description is duplicate
            }
          ]
        }
      ]
    }
  ]
};

const differentContent = {
  themes: [
    {
      theme: "Quality",
      adGroups: [
        {
          name: "Premium Products",
          keywords: [
            { keyword: "affordable prices", matchType: "phrase" },
            { keyword: "budget friendly", matchType: "broad" },
            { keyword: "cost effective", matchType: "exact" }
          ],
          ads: [
            {
              headlines: ["Affordable Prices", "Budget Friendly", "Cost Effective"],
              descriptions: ["Get affordable prices", "Budget friendly options"]
            }
          ]
        }
      ]
    }
  ]
};

// Mock validation function (simplified version)
function validateRegeneratedContent(originalCampaign, regeneratedContent, regenerationType, targetTheme, targetAdGroup) {
  if (!regeneratedContent.themes || !Array.isArray(regeneratedContent.themes)) {
    return { isValid: false, message: 'No themes found in regenerated content' };
  }

  let totalKeywords = 0;
  let totalAds = 0;
  let duplicateKeywords = 0;
  let duplicateHeadlines = 0;
  let duplicateDescriptions = 0;

  // Collect all existing content for comparison
  const existingKeywords = new Set();
  const existingHeadlines = new Set();
  const existingDescriptions = new Set();

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
  regeneratedContent.themes.forEach((regeneratedTheme) => {
    const existingTheme = originalCampaign.themes.find(theme => theme.theme === regeneratedTheme.theme);
    if (!existingTheme || (targetTheme && regeneratedTheme.theme !== targetTheme)) return;

    regeneratedTheme.adGroups.forEach((regeneratedAdGroup) => {
      const existingAdGroup = existingTheme.adGroups.find(adGroup => adGroup.name === regeneratedAdGroup.name);
      if (!existingAdGroup || (targetAdGroup && regeneratedAdGroup.name !== targetAdGroup)) return;

      if (regenerationType === 'keywords' || regenerationType === 'both') {
        if (regeneratedAdGroup.keywords) {
          totalKeywords += regeneratedAdGroup.keywords.length;
          regeneratedAdGroup.keywords.forEach((keyword) => {
            if (existingKeywords.has(keyword.keyword.toLowerCase().trim())) {
              duplicateKeywords++;
            }
          });
        }
      }

      if (regenerationType === 'rsa' || regenerationType === 'both') {
        if (regeneratedAdGroup.ads) {
          totalAds += regeneratedAdGroup.ads.length;
          regeneratedAdGroup.ads.forEach((ad) => {
            if (ad.headlines) {
              ad.headlines.forEach((headline) => {
                if (existingHeadlines.has(headline.toLowerCase().trim())) {
                  duplicateHeadlines++;
                }
              });
            }
            if (ad.descriptions) {
              ad.descriptions.forEach((description) => {
                if (existingDescriptions.has(description.toLowerCase().trim())) {
                  duplicateDescriptions++;
                }
              });
            }
          });
        }
      }
    });
  });

  // Calculate similarity percentages
  const keywordSimilarity = totalKeywords > 0 ? (duplicateKeywords / totalKeywords) * 100 : 0;
  const headlineSimilarity = totalAds > 0 ? (duplicateHeadlines / (totalAds * 15)) * 100 : 0;
  const descriptionSimilarity = totalAds > 0 ? (duplicateDescriptions / (totalAds * 4)) * 100 : 0;

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

// Test the validation
console.log("Testing content validation...\n");

console.log("1. Testing similar content (should fail):");
const similarResult = validateRegeneratedContent(originalCampaign, similarContent, 'both');
console.log(`Result: ${similarResult.isValid ? 'PASS' : 'FAIL'}`);
console.log(`Message: ${similarResult.message}\n`);

console.log("2. Testing different content (should pass):");
const differentResult = validateRegeneratedContent(originalCampaign, differentContent, 'both');
console.log(`Result: ${differentResult.isValid ? 'PASS' : 'FAIL'}`);
console.log(`Message: ${differentResult.message}\n`);

console.log("3. Testing keywords only with similar content:");
const keywordsResult = validateRegeneratedContent(originalCampaign, similarContent, 'keywords');
console.log(`Result: ${keywordsResult.isValid ? 'PASS' : 'FAIL'}`);
console.log(`Message: ${keywordsResult.message}\n`);

console.log("4. Testing RSA only with similar content:");
const rsaResult = validateRegeneratedContent(originalCampaign, similarContent, 'rsa');
console.log(`Result: ${rsaResult.isValid ? 'PASS' : 'FAIL'}`);
console.log(`Message: ${rsaResult.message}`); 