const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const https = require('https');
const querystring = require('querystring');

const CLIENT_ID = 'ier4f9o180rrcujdu110ui9k3';
const CLIENT_SECRET = ''; // Leave empty if your app client has no secret
const REDIRECT_URI = 'https://developer-hub.cryzon.com';
const COGNITO_DOMAIN = 'auth.developer-hub.cryzon.com';

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    const query = request.querystring;

    // 1. Handle Cognito code exchange
    if (query && query.includes('code=')) {
        const code = querystring.parse(query).code;
        try {
            const tokenResponse = await exchangeCodeForToken(code);
            if (tokenResponse.id_token) {
                // Set cookie for .cryzon.com and redirect to clean URL
                return {
                    status: '302',
                    statusDescription: 'Found',
                    headers: {
                        'set-cookie': [{
                            key: 'Set-Cookie',
                            value: `cognito=${tokenResponse.id_token}; Path=/; Domain=.cryzon.com; HttpOnly; Secure`
                        }],
                        'location': [{
                            key: 'Location',
                            value: REDIRECT_URI // Remove code from URL
                        }]
                    }
                };
            }
        } catch (err) {
            console.error('Token exchange failed:', err);
            return redirectToCognitoLogin();
        }
    }

    // 2. Check for cookie
    const cookies = headers['cookie'] || headers['Cookie'];
    if (cookies) {
        const token = getCookieValue(cookies[0].value, 'cognito');
        if (token) {
            // Optionally: verify token here (e.g., JWT signature, expiry)
            // If valid, allow request through
            return request;
        }
    }

    // 3. Redirect to Cognito login if no valid token
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

function redirectToCognitoLogin() {
    const cognitoLoginUrl = `https://${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
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

function exchangeCodeForToken(code) {
    const postData = querystring.stringify({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: REDIRECT_URI
    });

    const authHeader = CLIENT_SECRET
        ? 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')
        : null;

    const options = {
        hostname: COGNITO_DOMAIN,
        port: 443,
        path: '/oauth2/token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
        }
    };
    if (authHeader) {
        options.headers['Authorization'] = authHeader;
    }

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}