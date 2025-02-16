const { verifyToken } = require("../../utils/verifyToken");

module.exports.handler = async (event) => {
  try {
    const token = event.authorizationToken?.replace("Bearer ", "");
    console.log("authorizationToken", token);
    if (!token) {
      throw new Error("Authorization token is missing");
    }

    const userId = await verifyToken(token);
    return {
      principalId: userId,
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Allow",
            Resource: event.methodArn,
          },
        ],
      },
    };
  } catch (error) {
    return {
      principalId: "user",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Action: "execute-api:Invoke",
            Effect: "Deny",
            Resource: event.methodArn,
          },
        ],
      },
    };
  }
};
