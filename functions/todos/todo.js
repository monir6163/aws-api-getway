require("dotenv").config();
const {
  PutCommand,
  ScanCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../../utils/dynamodb");
const { createResponse } = require("../../utils/responseHelper");
const verifyToken = require("../../utils/verifyToken");
const { todoSchema } = require("../../utils/zod/todoValidation");
const { ZodError } = require("zod");
const { TODOS_TABLE } = process.env;

// create a todo item in the database with individual user id
module.exports.createTodo = async (event) => {
  try {
    const bodyData = todoSchema.parse(JSON.parse(event.body));

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

    const timeStamp = new Date().toISOString();

    const payload = {
      id: uuidv4(),
      userId: userId,
      ...bodyData,
      createdAt: timeStamp,
      updatedAt: timeStamp,
    };

    await dynamoDb.send(
      new PutCommand({ TableName: TODOS_TABLE, Item: payload })
    );

    return createResponse(200, "Todo created successfully", payload);
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      return createResponse(400, firstError.message, {});
      // const errorMessages = error.errors.map((err) => ({
      //   field: err.path.join("."),
      //   message: err.message,
      // }));
      // return createResponse(400, "Validation error", { errors: errorMessages });
    } else {
      return createResponse(500, "Failed to create todo", {
        error: error.message,
      });
    }
  }
};

// get all todo items from the database user specific
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
      FilterExpression: "#userId = :userId",
      ExpressionAttributeValues: {
        ":userId": event.requestContext.authorizer.claims.sub,
      },
      ExpressionAttributeNames: {
        "#userId": "userId",
      },
      ReturnConsumedCapacity: "TOTAL",
      ConsistentRead: true,
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
        id: id,
      },
      projectionExpression: "id, title, description, status, dueDate, priority",
      FilterExpression: "#userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ReturnConsumedCapacity: "TOTAL",
      ConsistentRead: true,
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

// update a todo item in the database by id
module.exports.updateTodo = async (event) => {
  try {
    const bodyData = todoSchema.parse(JSON.parse(event.body));

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

    const timeStamp = new Date().toISOString();

    const params = {
      TableName: TODOS_TABLE,
      Key: {
        id: id,
      },
      UpdateExpression:
        "SET #title = :title, #description = :description, #status = :status, #dueDate = :dueDate, #priority = :priority, #updatedAt = :updatedAt",
      ConditionExpression: "#userId = :userId",
      ExpressionAttributeValues: {
        ":title": bodyData.title,
        ":description": bodyData.description,
        ":status": bodyData.status,
        ":dueDate": bodyData.dueDate || null,
        ":priority": bodyData.priority || null,
        ":updatedAt": timeStamp,
        ":userId": userId,
      },
      ExpressionAttributeNames: {
        "#userId": "userId",
        "#title": "title",
        "#description": "description",
        "#status": "status",
        "#dueDate": "dueDate",
        "#priority": "priority",
        "#updatedAt": "updatedAt",
      },
      ReturnValues: "ALL_NEW",
    };

    const { Attributes } = await dynamoDb.send(new UpdateCommand(params));
    return createResponse(200, "Todo updated successfully", Attributes);
  } catch (error) {
    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      return createResponse(400, firstError.message, {});
    }
    return createResponse(500, "Failed to update todo", {
      error: error.message,
    });
  }
};

// delete a todo item from the database by id
module.exports.deleteTodo = async (event) => {
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
        id: id,
      },
      ConditionExpression: "#userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
      ExpressionAttributeNames: {
        "#userId": "userId",
      },
    };

    await dynamoDb.send(new DeleteCommand(params));
    return createResponse(200, "Todo deleted successfully", {});
  } catch (error) {
    return createResponse(500, "Todo id is required or is already deleted", {
      error: error.message,
    });
  }
};
