const createResponse = (statusCode, message, data = null) => {
  return {
    statusCode,
    isBase64Encoded: false,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      message,
      ...(data && { data }),
    }),
  };
};

module.exports = { createResponse };
