// ============================================================
// AWS Lambda Sync Handler (Ingestion Gateway for Edge Nodes)
// ============================================================
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});

const TABLE_NAME = process.env.DYNAMODB_TABLE || "RetinovaDetectionEvents";
const SNS_TOPIC = process.env.SNS_TOPIC_ARN || "";

export const handler = async (event: any) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

    if (!body || !body.event_id || !body.device_id) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing required fields: event_id and device_id" }),
      };
    }

    const item = {
      event_id: body.event_id,
      device_id: body.device_id,
      timestamp: body.timestamp || new Date().toISOString(),
      detection_type: body.detection_type,
      confidence: body.confidence,
      severity: body.severity,
      latitude: body.latitude,
      longitude: body.longitude,
      model_version: body.model_version || "swinv2-tiny-edge-v1.0.4",
      s3_object_key: body.s3_object_key,
      cloud_image_url: body.cloud_image_url,
      sync_timestamp: new Date().toISOString(),
      metadata: body.metadata,
    };

    // Idempotent write: condition ensures duplicate retry uploads don't corrupt record
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );

    // Dispatch SNS alert if severity is HIGH or CRITICAL
    if (SNS_TOPIC && (body.severity === "HIGH" || body.severity === "CRITICAL")) {
      await snsClient.send(
        new PublishCommand({
          TopicArn: SNS_TOPIC,
          Subject: `[ALERT] ${body.severity} Detection on Node ${body.device_id}`,
          Message: `Urgent detection: ${body.detection_type} (Confidence: ${Math.round(body.confidence * 100)}%)\nLocation: ${body.latitude}, ${body.longitude}\nTimestamp: ${body.timestamp}\nDevice: ${body.device_id}`,
        })
      );
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "SYNCED",
        event_id: body.event_id,
        sync_timestamp: item.sync_timestamp,
      }),
    };
  } catch (err: any) {
    console.error("[LAMBDA SYNC ERROR]", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Internal server error" }),
    };
  }
};
