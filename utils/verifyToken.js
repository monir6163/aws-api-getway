require("dotenv").config();
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const axios = require("axios");

const { COGNITO_REGION, COGNITO_USERPOOL_ID } = process.env;
const COGNITO_ISSUER = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USERPOOL_ID}`;

let pems = {};

async function getCognitoKeys() {
  if (Object.keys(pems).length === 0) {
    const url = `${COGNITO_ISSUER}/.well-known/jwks.json`;

    const { data } = await axios.get(url);
    data.keys.forEach((key) => {
      pems[key.kid] = jwkToPem(key);
    });
  }
}

const verifyToken = async (token) => {
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  try {
    await getCognitoKeys();
    const decodedHeader = jwt.decode(token, { complete: true });

    if (!decodedHeader || !pems[decodedHeader.header.kid]) {
      throw new Error("Invalid Token");
    }
    const decoded = jwt.verify(token, pems[decodedHeader.header.kid], {
      issuer: COGNITO_ISSUER,
    });
    return decoded.sub; // Correctly returning the user ID
  } catch (error) {
    throw new Error("Unauthorized: Invalid Token");
  }
};

module.exports = verifyToken;
