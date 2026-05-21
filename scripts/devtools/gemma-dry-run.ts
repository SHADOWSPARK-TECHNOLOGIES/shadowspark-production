import dotenv from "dotenv";

// Load environment variables (ensure LOCAL_LLM_KEY is loaded if testing locally)
dotenv.config({ path: ".env.local" }); 
dotenv.config();

const LOCAL_LLM_KEY = process.env.LOCAL_LLM_KEY || "test-key";
const ANYTHING_LLM_URL = process.env.ANYTHING_LLM_URL || "http://localhost:3001/api/v1/prediction"; // Adjust if AnythingLLM uses a different chat/completion endpoint

async function runGemmaDryRun() {
  console.log("🚀 Initiating Gemma PIS Dry-Run...");
  console.log(`📡 Targeting Local Endpoint: ${ANYTHING_LLM_URL}`);

  const testMessage = "We need an immediate deployment for 500 vehicles. Budget is approved. Need an integration within 48 hours.";
  
  const prompt = `Analyze this lead message: "${testMessage}". 
    Score it from 0-100 based on Revenue Potential and Urgency. 
    Return ONLY the number.`;

  console.log(`\n📝 Prompt Injection:\n${prompt}\n`);

  try {
    const startTime = Date.now();
    
    // Using the AnythingLLM prediction endpoint structure provided in the directive
    const response = await fetch(ANYTHING_LLM_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${LOCAL_LLM_KEY}` 
      },
      body: JSON.stringify({
        prompt: prompt
      })
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      console.error(`❌ HTTP Error! Status: ${response.status}`);
      const errText = await response.text();
      console.error(`Response details: ${errText}`);
      return;
    }

    const rawOutput = await response.text();
    console.log(`✅ Raw AI Response received in ${latency}ms:`);
    console.log(`[ ${rawOutput.trim()} ]\n`);

    // Validation Check
    const score = parseInt(rawOutput.trim(), 10);
    
    if (!isNaN(score) && score >= 0 && score <= 100) {
      console.log(`🟢 PASSED: PIS successfully parsed as integer: ${score}`);
      if (score > 85) {
         console.log(`⚡ WARLORD TRIGGER WOULD FIRE for this score.`);
      }
    } else {
      console.log(`🔴 FAILED: Output is not a clean integer between 0-100. Need prompt engineering adjustments.`);
    }

  } catch (error) {
    console.error("❌ Dry-Run Failed (Is the AnythingLLM server running?):", error);
  }
}

runGemmaDryRun();
