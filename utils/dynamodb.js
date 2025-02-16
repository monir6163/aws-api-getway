require("dotenv").config();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const dynamoDb = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.COGNITO_REGION,
    // credentials: {
    //   accessKeyId: process.env.COGNITO_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.COGNITO_SECRET_ACCESS_KEY,
    // },
  })
);

module.exports = dynamoDb;
