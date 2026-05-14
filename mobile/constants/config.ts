export const cognitoConfig = {
  userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ?? '',
  userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID ?? '',
  region: process.env.EXPO_PUBLIC_AWS_REGION ?? 'us-east-1',
};
