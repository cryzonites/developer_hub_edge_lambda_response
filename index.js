const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;

    // Get the cookie from the request
    const cookies = headers['cookie'] || headers['Cookie'];
    if (cookies) {
        const token = getCookieValue(cookies[0].value, 'cognito'); // Replace with the actual cookie name set by Cognito
        if (token) {
            try {
                // Verify the token with Cognito
                const params = { AccessToken: token };
                await cognito.getUser(params).promise();

                // Rewrite the cookie with the correct domain
                return rewriteCookie(request, token);
            } catch (error) {
                console.error('Token verification failed:', error);
            }
        }
    }

    // If no valid token, redirect to Cognito login
    return redirectToCognitoLogin();
};

function getCookieValue(cookieHeader, cookieName) {
    const cookies = cookieHeader.split(';').map(cookie => cookie.trim());
    for (const cookie of cookies) {
        const [name, value] = cookie.split('=');
        if (name === cookieName) {
            return value;
        }
    }
    return null;
}

function rewriteCookie(request, token) {
    return {
        ...request,
        headers: {
            ...request.headers,
            'set-cookie': [{
                key: 'Set-Cookie',
                value: `CognitoAuthToken=${token}; Path=/; Domain=developer-hub.cryzon.com; HttpOnly; Secure`
            }]
        }
    };
}

function redirectToCognitoLogin() {
    const cognitoLoginUrl = 'https://auth.developer-hub.cryzon.com/login?client_id=ier4f9o180rrcujdu110ui9k3&response_type=token&redirect_uri=https://developer-hub.cryzon.com';
    return {
        status: '302',
        statusDescription: 'Found',
        headers: {
            'location': [{
                key: 'Location',
                value: cognitoLoginUrl
            }]
        }
    };
}