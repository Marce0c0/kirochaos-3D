/**
 * ==============================================================================
 * LAMBDA_CHAOS_LOGGER.MJS
 * AWS Lambda handler: DynamoDB event persistence + Amazon Bedrock (Nova Micro)
 * Real-time NOC Post-Mortem Incident Synthesis
 * ==============================================================================
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const region = process.env.AWS_REGION || "us-east-2";
const ddbClient = new DynamoDBClient({ region });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({ region });

const TABLE_NAME = process.env.CHAOS_TABLE_NAME || "KiroChaosIncidents";
const BEDROCK_MODEL_ID = "amazon.nova-micro-v1:0";

export const handler = async (event) => {
  console.log("Received Kiro Chaos Event:", JSON.stringify(event, null, 2));

  // Handle CORS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      },
      body: "",
    };
  }

  // GET: Return recent chaos feed
  if (event.requestContext?.http?.method === "GET") {
    try {
      const scanResult = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          Limit: 10,
        })
      );
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(scanResult.Items || []),
      };
    } catch (err) {
      console.warn("DynamoDB scan error (using fallback):", err.message);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify([]),
      };
    }
  }

  // POST: Record incident + invoke Bedrock Nova Micro
  try {
    const payload = typeof event.body === "string" ? JSON.parse(event.body) : event.body || {};
    const incidentId = payload.incidentId || `KIRO-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // 1. Generate 3-line NOC Post-Mortem using Amazon Bedrock Nova Micro
    let aiPostMortem = "";
    try {
      const prompt = `You are the Lead AWS NOC Disaster Engineer. A 3D Giant Kiro event struck the internet fiber grid:
Location: ${payload.placeName || "Pacific-Andean Junction"} (${payload.latitude}, ${payload.longitude})
Severed Cables: ${(payload.severedCables || []).join(", ")}
BGP Latency Spike: ${payload.latencyBefore}ms -> ${payload.latencyAfter}ms
Emergency Routing: Repair truck dispatched from ${payload.depotName || "Tacna Depot"} with ETA of ${payload.etaMinutes || 24} min.
Write a crisp, authoritative 3-line incident summary report for the AWS Status Dashboard.`;

      const bedrockPayload = {
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { max_new_tokens: 200, temperature: 0.2 },
      };

      const bedrockResponse = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(bedrockPayload),
        })
      );

      const parsedResponse = JSON.parse(new TextDecoder().decode(bedrockResponse.body));
      aiPostMortem = parsedResponse.output?.message?.content?.[0]?.text?.trim() || "";
    } catch (bedrockErr) {
      console.warn("Bedrock call fallback:", bedrockErr.message);
      aiPostMortem = `[CRITICAL NOC ALERT] Seismic event severed primary Andean optical junction. Traffic auto-rerouted via trans-continental Atlantic backup path (latency +${(payload.latencyAfter || 194) - (payload.latencyBefore || 68)}ms). Amazon Location Service dispatched emergency repair truck with ETA of ${payload.etaMinutes || 28} mins.`;
    }

    const itemToSave = {
      incidentId,
      timestamp,
      attackType: payload.attackType || "EARTHSHAKER",
      epicenter: { lat: payload.latitude, lon: payload.longitude },
      placeName: payload.placeName || "Arica-Tacna Border Junction, Chile/Peru",
      severedCables: payload.severedCables || [],
      latencyBefore: payload.latencyBefore || 68,
      latencyAfter: payload.latencyAfter || 194,
      repairTruck: {
        depot: payload.depotName || "Tacna Maintenance Depot",
        etaMinutes: payload.etaMinutes || 26,
        distanceKm: payload.distanceKm || 34.2,
      },
      aiPostMortem,
    };

    // Save to DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: itemToSave,
      })
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ success: true, item: itemToSave }),
    };
  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

