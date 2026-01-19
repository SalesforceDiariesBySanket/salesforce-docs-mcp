/**
 * LLM-as-Judge Test Suite (Phase 3.4)
 * 
 * Weekly semantic evaluation using LLM to assess search result quality.
 * This catches semantic drift that keyword matching cannot detect.
 * 
 * Run: npm run test-llm-judge
 * 
 * Requirements:
 * - OPENAI_API_KEY or AZURE_OPENAI_API_KEY environment variable
 * - Or configure a local LLM endpoint
 * 
 * How it works:
 * 1. Runs a subset of critical queries
 * 2. Sends query + top result to LLM
 * 3. LLM scores relevance on 1-5 scale with reasoning
 * 4. Aggregates scores and flags queries below threshold
 */

import { searchDocuments } from "../src/db/queries.js";
import { initializeDatabase, isDatabaseIndexed } from "../src/db/database.js";
import * as fs from "fs";
import * as path from "path";

// Configuration
const LLM_JUDGE_CONFIG = {
    // Minimum acceptable relevance score from LLM (1-5 scale)
    minRelevanceScore: 3.5,
    
    // Model configuration (update based on your setup)
    model: process.env.LLM_JUDGE_MODEL || "gpt-4o-mini",
    apiEndpoint: process.env.LLM_JUDGE_ENDPOINT || "https://api.openai.com/v1/chat/completions",
    
    // Results file
    resultsFile: path.join(process.cwd(), 'data', 'llm-judge-results.json'),
    
    // Rate limiting
    delayBetweenCalls: 1000, // ms
};

// Critical test cases for LLM evaluation
// These are queries where semantic understanding matters most
const LLM_JUDGE_CASES = [
    {
        query: "How do I prevent my trigger from running multiple times?",
        context: "Developer asking about trigger recursion prevention",
        expectedTopics: ["static variable", "recursion", "trigger handler pattern"]
    },
    {
        query: "What's the difference between before and after triggers?",
        context: "Developer learning Apex triggers",
        expectedTopics: ["before trigger", "after trigger", "DML operations", "timing"]
    },
    {
        query: "System.LimitException: Too many SOQL queries: 101",
        context: "Developer debugging a governor limit error",
        expectedTopics: ["governor limits", "SOQL", "bulkification", "query optimization"]
    },
    {
        query: "how do I make an API call from Apex",
        context: "Developer needs to call external service",
        expectedTopics: ["HTTP", "callout", "HttpRequest", "named credential"]
    },
    {
        query: "LWC component not showing on record page",
        context: "Developer troubleshooting component visibility",
        expectedTopics: ["target config", "meta xml", "record page", "component visibility"]
    },
    {
        query: "best way to handle errors in Lightning Web Components",
        context: "Developer implementing error handling",
        expectedTopics: ["try-catch", "error handling", "toast", "UI feedback"]
    },
    {
        query: "what's the heap size limit in Apex",
        context: "Developer optimizing memory usage",
        expectedTopics: ["heap", "6MB", "12MB", "async", "governor limits"]
    },
    {
        query: "how to deploy metadata to production",
        context: "Developer/Admin deploying changes",
        expectedTopics: ["deploy", "change set", "SFDX", "metadata API", "package"]
    },
    {
        query: "OAuth 2.0 JWT bearer flow for Salesforce",
        context: "Developer implementing server-to-server auth",
        expectedTopics: ["JWT", "connected app", "certificate", "OAuth"]
    },
    {
        query: "platform events vs change data capture",
        context: "Architect choosing event architecture",
        expectedTopics: ["platform events", "CDC", "streaming", "event-driven"]
    }
];

interface LLMJudgeResult {
    query: string;
    topResultTitle: string;
    topResultSnippet: string;
    llmScore: number;
    llmReasoning: string;
    passed: boolean;
    timestamp: string;
}

interface LLMResponse {
    score: number;
    reasoning: string;
}

// Prompt template for LLM evaluation
function buildJudgePrompt(query: string, context: string, resultTitle: string, resultSnippet: string, expectedTopics: string[]): string {
    return `You are evaluating a search engine for Salesforce documentation. 
Your task is to score how relevant the search result is to the user's query.

USER QUERY: "${query}"
CONTEXT: ${context}

SEARCH RESULT:
Title: ${resultTitle}
Content: ${resultSnippet.substring(0, 1000)}...

EXPECTED TOPICS (for reference): ${expectedTopics.join(", ")}

SCORING CRITERIA:
5 - Perfect: Directly answers the query with authoritative, comprehensive information
4 - Good: Relevant information that helps answer the query
3 - Acceptable: Somewhat relevant but missing key information or not the best match
2 - Poor: Tangentially related but doesn't really help
1 - Irrelevant: Completely unrelated to the query

Please respond in JSON format:
{
  "score": <number 1-5>,
  "reasoning": "<brief explanation of your score>"
}`;
}

// Call LLM API (placeholder - implement based on your LLM provider)
async function callLLMJudge(prompt: string): Promise<LLMResponse | null> {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    
    if (!apiKey) {
        console.warn("⚠️ No LLM API key found. Set OPENAI_API_KEY or AZURE_OPENAI_API_KEY");
        return null;
    }

    try {
        const response = await fetch(LLM_JUDGE_CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: LLM_JUDGE_CONFIG.model,
                messages: [
                    { role: "system", content: "You are a search quality evaluator. Always respond with valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            console.error(`LLM API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        const content = data.choices?.[0]?.message?.content;
        
        if (!content) {
            console.error("No content in LLM response");
            return null;
        }

        // Parse JSON from response (handle markdown code blocks)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Could not parse JSON from LLM response:", content);
            return null;
        }

        return JSON.parse(jsonMatch[0]) as LLMResponse;
    } catch (error) {
        console.error("Error calling LLM:", error);
        return null;
    }
}

// Simulated LLM judge for testing without API key
function simulateLLMJudge(query: string, resultTitle: string, resultSnippet: string, expectedTopics: string[]): LLMResponse {
    // Simple heuristic: check how many expected topics appear in the result
    const content = (resultTitle + " " + resultSnippet).toLowerCase();
    let topicMatches = 0;
    
    for (const topic of expectedTopics) {
        if (content.includes(topic.toLowerCase())) {
            topicMatches++;
        }
    }
    
    const matchRatio = topicMatches / expectedTopics.length;
    let score: number;
    let reasoning: string;
    
    if (matchRatio >= 0.6) {
        score = 4 + Math.random() * 0.5;
        reasoning = `Good match: ${topicMatches}/${expectedTopics.length} expected topics found in result`;
    } else if (matchRatio >= 0.3) {
        score = 3 + Math.random() * 0.5;
        reasoning = `Partial match: ${topicMatches}/${expectedTopics.length} expected topics found`;
    } else if (matchRatio > 0) {
        score = 2 + Math.random() * 0.5;
        reasoning = `Weak match: Only ${topicMatches}/${expectedTopics.length} expected topics found`;
    } else {
        score = 1 + Math.random() * 0.5;
        reasoning = `Poor match: No expected topics found in result`;
    }
    
    return {
        score: Math.min(5, Math.round(score * 10) / 10),
        reasoning
    };
}

async function runLLMJudge(): Promise<void> {
    console.log("=".repeat(80));
    console.log("🧠 LLM-as-Judge Search Quality Evaluation (Phase 3.4)");
    console.log("=".repeat(80));

    // Initialize database
    await initializeDatabase();

    if (!isDatabaseIndexed()) {
        console.error("\nError: Database is not indexed!");
        process.exit(1);
    }

    const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
    const useSimulation = !apiKey;
    
    if (useSimulation) {
        console.log("\n⚠️ No API key found. Using simulated LLM judge (heuristic-based).");
        console.log("   Set OPENAI_API_KEY or AZURE_OPENAI_API_KEY for real LLM evaluation.\n");
    } else {
        console.log(`\n🤖 Using model: ${LLM_JUDGE_CONFIG.model}`);
        console.log(`   Endpoint: ${LLM_JUDGE_CONFIG.apiEndpoint}\n`);
    }

    const results: LLMJudgeResult[] = [];
    let totalScore = 0;
    let passedCount = 0;

    for (const testCase of LLM_JUDGE_CASES) {
        console.log(`\n📋 Query: "${testCase.query}"`);
        console.log(`   Context: ${testCase.context}`);
        console.log("-".repeat(60));

        try {
            // Search for results
            const searchResults = await searchDocuments(testCase.query, { maxResults: 1 });
            
            if (searchResults.length === 0) {
                console.log("   ❌ No search results returned");
                results.push({
                    query: testCase.query,
                    topResultTitle: "NO RESULTS",
                    topResultSnippet: "",
                    llmScore: 0,
                    llmReasoning: "No search results returned",
                    passed: false,
                    timestamp: new Date().toISOString()
                });
                continue;
            }

            const topResult = searchResults[0];
            const resultTitle = topResult.document.title;
            const resultSnippet = topResult.chunk;

            console.log(`   Top result: ${resultTitle}`);
            console.log(`   Score: ${topResult.score.toFixed(2)}`);

            // Get LLM judgment
            let llmResponse: LLMResponse | null;
            
            if (useSimulation) {
                llmResponse = simulateLLMJudge(
                    testCase.query,
                    resultTitle,
                    resultSnippet,
                    testCase.expectedTopics
                );
            } else {
                const prompt = buildJudgePrompt(
                    testCase.query,
                    testCase.context,
                    resultTitle,
                    resultSnippet,
                    testCase.expectedTopics
                );
                llmResponse = await callLLMJudge(prompt);
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, LLM_JUDGE_CONFIG.delayBetweenCalls));
            }

            if (llmResponse) {
                const passed = llmResponse.score >= LLM_JUDGE_CONFIG.minRelevanceScore;
                totalScore += llmResponse.score;
                if (passed) passedCount++;

                const statusIcon = passed ? '✅' : '❌';
                console.log(`   ${statusIcon} LLM Score: ${llmResponse.score}/5`);
                console.log(`   Reasoning: ${llmResponse.reasoning}`);

                results.push({
                    query: testCase.query,
                    topResultTitle: resultTitle,
                    topResultSnippet: resultSnippet.substring(0, 500),
                    llmScore: llmResponse.score,
                    llmReasoning: llmResponse.reasoning,
                    passed,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.log("   ⚠️ Could not get LLM judgment");
                results.push({
                    query: testCase.query,
                    topResultTitle: resultTitle,
                    topResultSnippet: resultSnippet.substring(0, 500),
                    llmScore: 0,
                    llmReasoning: "LLM evaluation failed",
                    passed: false,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error}`);
            results.push({
                query: testCase.query,
                topResultTitle: "ERROR",
                topResultSnippet: "",
                llmScore: 0,
                llmReasoning: String(error),
                passed: false,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Summary
    console.log("\n\n" + "=".repeat(80));
    console.log("📊 LLM JUDGE SUMMARY");
    console.log("=".repeat(80));

    const avgScore = results.length > 0 ? totalScore / results.filter(r => r.llmScore > 0).length : 0;
    const passRate = results.length > 0 ? passedCount / results.length : 0;

    console.log(`\nTotal Queries Evaluated: ${results.length}`);
    console.log(`Average LLM Score: ${avgScore.toFixed(2)}/5`);
    console.log(`Pass Rate (≥${LLM_JUDGE_CONFIG.minRelevanceScore}): ${passedCount}/${results.length} (${(passRate * 100).toFixed(1)}%)`);

    // Failed queries
    const failedResults = results.filter(r => !r.passed);
    if (failedResults.length > 0) {
        console.log("\n❌ Queries needing attention:");
        for (const result of failedResults) {
            console.log(`  - "${result.query}"`);
            console.log(`    Score: ${result.llmScore}/5 - ${result.llmReasoning}`);
        }
    }

    // Save results
    try {
        const dir = path.dirname(LLM_JUDGE_CONFIG.resultsFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const historicalResults = {
            runTimestamp: new Date().toISOString(),
            mode: useSimulation ? 'simulated' : 'live',
            model: useSimulation ? 'heuristic' : LLM_JUDGE_CONFIG.model,
            summary: {
                totalQueries: results.length,
                avgScore,
                passRate,
                passedCount,
                failedCount: failedResults.length
            },
            results
        };
        
        fs.writeFileSync(LLM_JUDGE_CONFIG.resultsFile, JSON.stringify(historicalResults, null, 2));
        console.log(`\n💾 Results saved to ${LLM_JUDGE_CONFIG.resultsFile}`);
    } catch (error) {
        console.error(`\n❌ Could not save results: ${error}`);
    }

    console.log("\n" + "=".repeat(80));
    if (passRate >= 0.8) {
        console.log("✅ Search quality meets LLM judge standards!");
    } else {
        console.log("⚠️ Search quality needs improvement based on LLM evaluation");
        process.exit(1);
    }
    console.log("=".repeat(80));
}

runLLMJudge().catch(console.error);
