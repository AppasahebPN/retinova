// ============================================================
// AWS Lambda Events Handler (Query Detections for Dashboard)
// ============================================================
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE || "RetinovaDetectionEvents";

export const handler = async (event: any) => {
  try {
    const params = event.queryStringParameters || {};
    const limit = params.limit ? parseInt(params.limit, 10) : 50;

    let items: any[] = [];

    if (params.deviceId) {
      const res = await docClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: "device_id = :did",
          ExpressionAttributeValues: { ":did": params.deviceId },
          Limit: limit,
          ScanIndexForward: false, // Descending order by timestamp
        })
      );
      items = res.Items || [];
    } else {
      const res = await docClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          Limit: limit,
        })
      );
      items = res.Items || [];
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        total: items.length,
        detections: items,
      }),
    };
  } catch (err: any) {
    console.error("[LAMBDA EVENTS ERROR]", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err.message || "Failed to retrieve events" }),
    };
  }
};
