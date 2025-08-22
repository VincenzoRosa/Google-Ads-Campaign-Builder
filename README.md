# Google Ads Campaign Generator

An AI-powered web tool that uses ChatGPT API to automatically generate complete Google Ads Search campaigns for e-commerce products in multiple languages and countries. The tool handles keyword research, semantic keyword grouping by theme and match type, and ad copy creation.

## Features

### Core Functionality
- **Multi-language Support**: Generate campaigns in 12+ languages across major markets
- **SKAG-Inspired Structure**: Single Keyword Ad Group approach with match type separation
- **AI-Powered Content**: Leverages ChatGPT-4 for intelligent keyword research and ad copy creation
- **Character Limit Validation**: Real-time validation ensuring all content meets Google Ads requirements
- **Export Options**: Copy to clipboard and CSV export functionality

### Campaign Structure
- **Keyword Themes**: 5-8 main themes identified per product
- **Match Type Strategy**: Conservative (Exact), Balanced (Exact + Phrase), or Aggressive (All types)
- **Responsive Search Ads**: 2 RSAs per ad group with 15 headlines and 4 descriptions each
- **Negative Keywords**: Campaign-level negative keyword suggestions
- **Ad Extensions**: Sitelinks and callouts recommendations

### Supported Markets
- United States (English)
- United Kingdom (English)
- Canada (English, French)
- Australia (English)
- Germany (German)
- France (French)
- Spain (Spanish)
- Italy (Italian)
- Netherlands (Dutch)
- Brazil (Portuguese)
- Mexico (Spanish)
- Poland (Polish)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your OpenAI API key (choose one method):
   
   **Option 1: Through the UI (Recommended)**
   - Click on "AI Settings (Advanced)" in the form
   - Enter your OpenAI API key in the provided field
   - The key will be saved locally in your browser for future use
   
   **Option 2: Environment Variable**
   - Create a `.env.local` file in the root directory
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_actual_api_key_here
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage Guide

### Basic Workflow

1. **Fill in Product Information:**
   - Product description (max 500 characters)
   - Final URL (landing page)
   - Brand name (optional)

2. **Add Unique Selling Points:**
   - Up to 3 USPs to enhance ad copy

3. **Select Geographic Targeting:**
   - Choose target country
   - Select campaign language (auto-populated based on country)
   - Add price with local currency (optional)

4. **Configure Campaign Strategy:**
   - **Match Type Strategy:**
     - Conservative: Exact match only
     - Balanced: Exact + Phrase match
     - Aggressive: All match types
   - **Keyword Density:**
     - Low: 2-3 keywords per ad group
     - Medium: 4-5 keywords per ad group
     - High: 6-8 keywords per ad group

5. **Generate and Review:**
   - Click "Generate Campaign"
   - Review generated content
   - Use copy buttons for individual sections
   - Export to CSV for bulk upload

### Campaign Output Format

```
Campaign Name: [Product] - [Country] - Search - [Date]

========================================
THEME: [Keyword Theme 1]
========================================

Ad Group: [Theme] - Exact
Keywords:
- [keyword] - Exact Match
- [keyword variant] - Exact Match

RSA 1:
Headlines:
1. [Headline 1 - max 30 chars]
2. [Headline 2 - max 30 chars]
...

Descriptions:
1. [Description 1 - max 90 chars]
...

[Additional ad groups for Phrase and Broad match]
========================================

Negative Keywords (Campaign Level):
- [negative keyword 1]
- [negative keyword 2]
...
```

## Technical Architecture

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **React Hook Form** with Zod validation
- **Lucide React** for icons

### Backend
- **Next.js API Routes** for server-side logic
- **OpenAI SDK** for ChatGPT integration
- **Structured JSON prompts** for consistent AI responses

### Key Components
- `CampaignForm`: Main input form with validation
- `CampaignOutput`: Displays generated campaigns with copy functionality
- `campaign.ts`: Type definitions and country/language data
- `generate-campaign/route.ts`: API endpoint for AI integration

## AI Prompt Engineering

The tool uses carefully crafted prompts to ensure:
- **Consistent JSON Structure**: Reliable parsing of AI responses
- **Character Limit Compliance**: All content fits Google Ads requirements
- **Local Market Adaptation**: CTAs and messaging appropriate for each market
- **Keyword Relevance**: Commercial intent and product-specific terms
- **Match Type Logic**: Proper keyword formatting for each match type

## Best Practices

### Before Implementation
1. **Review All Content**: AI-generated content should be reviewed for accuracy
2. **Verify Character Limits**: Ensure headlines ≤30 chars, descriptions ≤90 chars
3. **Check Policy Compliance**: Ensure compliance with Google Ads policies
4. **Validate Keywords**: Confirm keyword relevance and search volume
5. **Test Landing Pages**: Ensure URLs work and are mobile-friendly

### Campaign Management
1. **Start Conservative**: Begin with exact match and expand based on performance
2. **Monitor Negative Keywords**: Add negatives based on search query reports
3. **A/B Test Ad Copy**: Rotate RSAs to find top performers
4. **Adjust Bids**: Set appropriate bids based on match type and theme performance
5. **Track Conversions**: Implement proper conversion tracking

## Troubleshooting

### Common Issues

**"OpenAI API key not configured"**
- Ensure your API key is set in `.env.local`
- Restart the dev server after adding the key

**"Invalid response format from AI"**
- This occasionally happens with AI responses
- Try generating again with slightly different input

**Character limit violations**
- The tool validates limits, but double-check before uploading
- Edit content manually if needed

**Dependencies not found**
- Run `npm install` to install all required packages
- Check Node.js version (requires 18+)

### Performance Optimization
- **API Rate Limits**: The tool handles OpenAI rate limits automatically
- **Response Time**: Typical generation time is 30-60 seconds
- **Cost Management**: Each generation costs ~$0.05-0.15 in API credits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed information

## Roadmap

- [ ] Google Ads Editor CSV export format
- [ ] Bulk campaign generation for multiple products
- [ ] Performance prediction integration
- [ ] Additional match type strategies
- [ ] Campaign optimization suggestions
- [ ] Integration with Google Ads API for direct upload

---

**Disclaimer**: This tool generates AI-powered suggestions. Always review and validate all content before implementing in live campaigns. Ensure compliance with Google Ads policies and local advertising regulations.
