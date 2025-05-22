const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();

exports.handler = async (event) => {
    const request = event.Records[0].cf.request;
    const headers = request.headers;
    
    // Check if the request is for the login page or static assets
    if (request.uri === '/login' || request.uri.startsWith('/static/') || request.uri.startsWith('/assets/')) {
        return request;
    }
    
    // Get the authorization token from the request
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader) {
        return generateAuthResponse(request);
    }
    
    try {
        // Verify the token with Cognito
        const token = authHeader[0].value.replace('Bearer ', '');
        const params = {
            AccessToken: token
        };
        
        await cognito.getUser(params).promise();
        return request;
    } catch (error) {
        console.error('Authentication error:', error);
        return generateAuthResponse(request);
    }
};

function generateAuthResponse(request) {
    return {
        status: '302',
        statusDescription: 'Found',
        headers: {
            'location': [{
                key: 'Location',
                value: '/login'
            }]
        }
    };
} 