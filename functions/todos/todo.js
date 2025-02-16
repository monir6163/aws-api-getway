require("dotenv").config();
const {
  PutCommand,
  ScanCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../../utils/dynamodb");
const { createResponse } = require("../../utils/responseHelper");
const verifyToken = require("../../utils/verifyToken");
const { TODOS_TABLE } = process.env;

// create a todo item in the database with individual user id
module.exports.createTodo = async (event) => {
  try {
    const token = event.headers.Authorization?.split(" ")[1];
    await verifyToken(token);
    if (
      !event.requestContext.authorizer ||
      !event.requestContext.authorizer.claims
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    const userId = event.requestContext.authorizer.claims.sub;

    const bodyData = JSON.parse(event.body);
    const timeStamp = new Date().toISOString();

    const payload = {
      id: uuidv4(),
      userId: userId,
      name: bodyData.name,
      description: bodyData.description,
      createdAt: timeStamp,
      updatedAt: timeStamp,
    };

    await dynamoDb.send(
      new PutCommand({ TableName: TODOS_TABLE, Item: payload })
    );

    return createResponse(200, "Todo created successfully", payload);
  } catch (error) {
    return createResponse(500, "Failed to create todo", {
      error: error.message,
    });
  }
};

// get all todo items from the database
module.exports.getTodos = async (event) => {
  try {
    const token = event.headers.Authorization?.split(" ")[1];
    await verifyToken(token);
    if (
      !event.requestContext.authorizer ||
      !event.requestContext.authorizer.claims
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    const params = {
      TableName: TODOS_TABLE,
    };
    const { Items } = await dynamoDb.send(new ScanCommand(params));
    return createResponse(200, "Todos retrieved successfully", Items);
  } catch (error) {
    return createResponse(500, "Failed to get todos", {
      error: error.message,
    });
  }
};

// get a todo item from the database by id
module.exports.getTodo = async (event) => {
  try {
    const token = event.headers.Authorization?.split(" ")[1];
    await verifyToken(token);
    if (
      !event.requestContext.authorizer ||
      !event.requestContext.authorizer.claims
    ) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }
    const userId = event.requestContext.authorizer.claims.sub;
    const { id } = event.pathParameters;

    const params = {
      TableName: TODOS_TABLE,
      Key: {
        id,
        userId,
      },
    };

    const { Item } = await dynamoDb.send(new GetCommand(params));
    if (!Item) {
      return createResponse(404, "Todo not found", {});
    }

    return createResponse(200, "Todo retrieved successfully", Item);
  } catch (error) {
    return createResponse(500, "Failed to get todo", {
      error: error.message,
    });
  }
};
