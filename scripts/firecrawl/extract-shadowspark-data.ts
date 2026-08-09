import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Define the Zod schema for the extracted data
const shadowsparkTechSchema = z.object({
  shadowspark_tech_team: z.array(z.object({
    full_name: z.string().describe("The full name of the team member"),
    full_name_citation: z.string().describe("Source URL for full_name").optional(),
    job_title: z.string().describe("The professional title or role of the team member"),
    job_title_citation: z.string().describe("Source URL for job_title").optional(),
    contact_info: z.object({
      email: z.string().optional(),
      email_citation: z.string().describe("Source URL for email").optional(),
      phone: z.string().optional(),
      phone_citation: z.string().describe("Source URL for phone").optional(),
      social_links: z.array(z.object({
        value: z.string(),
        value_citation: z.string().describe("Source URL for this value").optional()
      })).optional()
    }).optional()
  })).describe("List of team members found on shadowspark-tech.org"),
  shadowspark_tech_pricing: z.array(z.object({
    tier_name: z.string().describe("Name of the pricing plan (e.g., Basic, Pro, Enterprise)"),
    tier_name_citation: z.string().describe("Source URL for tier_name").optional(),
    price: z.string().describe("The cost associated with the tier"),
    price_citation: z.string().describe("Source URL for price").optional(),
    features: z.array(z.object({
      value: z.string(),
      value_citation: z.string().describe("Source URL for this value").optional()
    })).describe("List of features included in this specific tier").optional()
  })).describe("Pricing tiers and associated features for Shadowspark Technologies")
});

async function extractShadowsparkData() {
  console.log('⚡ Starting Shadowspark Data Extraction via Firecrawl Agent...');

  const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY environment variable is not set.");
  }

  const firecrawl = new (FirecrawlApp as any)({ apiKey: FIRECRAWL_API_KEY });

  const targetUrl = "https://shadpwspark-tech.org"; // Using the URL from the original prompt

  const extractionPrompt = `You are an elite data extraction engine. Analyze this page and extract the core business intelligence. Ignore all navigation headers, footers, cookie banners, and marketing fluff. Focus exclusively on extracting high-value targets: 1. Full names and job titles of team members. 2. Direct contact information (emails, phone numbers, social links). 3. The exact pricing tiers and features listed. Return this strictly adhering to the provided JSON schema. Ensure all missing values are returned as 'null' rather than omitting the key. Clean and trim all whitespace from the text.`;

  try {
    console.log(`📡 Extracting data from: ${targetUrl}`);
    const result = await firecrawl.v1.extract({
      url: targetUrl,
      schema: shadowsparkTechSchema.parse({}) as any, // Pass an empty object to satisfy the type, schema is handled by the prompt option
      extractorOptions: {
        mode: "llm_extraction",
        llmOptions: {
          prompt: extractionPrompt,
          model: "spark-1-mini", // Model from the original prompt
        }
      }
    });

    const outputPath = path.join(process.cwd(), 'data', 'extracted-shadowspark-data.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(result.data, null, 2));

    console.log(`✅ Data Extraction Complete. Saved to ${outputPath}`);
    console.log('Extracted Data:', JSON.stringify(result.data, null, 2));

  } catch (error) {
    console.error('❌ Error during Firecrawl data extraction:', error);
  }
}

extractShadowsparkData();
