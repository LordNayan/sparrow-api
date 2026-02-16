import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { FastifyReply } from "fastify";

/**
 * OAuth2 Test Controller
 * Provides mock OAuth2 endpoints for testing both Client Credentials and Authorization Code flows
 */
@ApiTags("OAuth2 Test")
@Controller("oauth2-test")
export class OAuth2TestController {
  // In-memory storage for demo purposes
  private authorizationCodes = new Map<string, any>();
  private accessTokens = new Map<string, any>();

  // Test credentials
  private readonly TEST_CLIENT_ID = "test_client_id_123";
  private readonly TEST_CLIENT_SECRET = "test_client_secret_456";
  private readonly TEST_SCOPE = "read write";

  /**
   * Authorization endpoint for Authorization Code flow
   * Step 1: User is redirected here for authorization
   */
  @Get("authorize")
  @ApiOperation({
    summary: "OAuth2 Authorization Endpoint (Authorization Code Flow)",
  })
  async authorize(
    @Query("response_type") responseType: string,
    @Query("client_id") clientId: string,
    @Query("redirect_uri") redirectUri: string,
    @Query("scope") scope: string,
    @Query("state") state: string,
    @Res() res: FastifyReply,
  ) {
    if (clientId !== this.TEST_CLIENT_ID) {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "invalid_client",
        error_description: "Invalid client_id",
      });
    }

    if (responseType !== "code") {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "unsupported_response_type",
        error_description: 'Only "code" response type is supported',
      });
    }

    const authCode = "auth_code_" + Math.random().toString(36).substring(7);

    this.authorizationCodes.set(authCode, {
      clientId,
      redirectUri,
      scope: scope || this.TEST_SCOPE,
      createdAt: Date.now(),
      used: false,
    });

    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.append("code", authCode);
    if (state) {
      redirectUrl.searchParams.append("state", state);
    }

    return res.redirect(redirectUrl.toString());
  }

  /**
   * Token endpoint for both flows
   * - Client Credentials: exchange client credentials for access token
   * - Authorization Code: exchange authorization code for access token
   */
  @Post("token")
  @ApiOperation({ summary: "OAuth2 Token Endpoint (Both Flows)" })
  async token(
    @Body("grant_type") grantType: string,
    @Body("client_id") clientId: string,
    @Body("client_secret") clientSecret: string,
    @Body("code") code: string,
    @Body("redirect_uri") redirectUri: string,
    @Body("scope") scope: string,
    @Res() res: FastifyReply,
  ) {
    if (
      clientId !== this.TEST_CLIENT_ID ||
      clientSecret !== this.TEST_CLIENT_SECRET
    ) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        error: "invalid_client",
        error_description: "Invalid client credentials",
      });
    }

    if (grantType === "client_credentials") {
      return this.handleClientCredentials(clientId, scope, res);
    } else if (grantType === "authorization_code") {
      return this.handleAuthorizationCode(code, clientId, redirectUri, res);
    } else {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "unsupported_grant_type",
        error_description:
          "Supported grant types: client_credentials, authorization_code",
      });
    }
  }

  /**
   * Protected resource endpoint to test the access token
   */
  @Get("protected-resource")
  @ApiOperation({ summary: "Protected Resource (Test Access Token)" })
  async protectedResource(
    @Query("access_token") accessToken: string,
    @Res() res: FastifyReply,
  ) {
    // Fastify stores request on res.request
    const authHeader = res.request.headers.authorization;
    let token = accessToken;

    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (!token) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        error: "missing_token",
        error_description: "Access token is required",
      });
    }

    const tokenData = this.accessTokens.get(token);
    if (!tokenData) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        error: "invalid_token",
        error_description: "Invalid or expired access token",
      });
    }

    if (Date.now() - tokenData.createdAt > 15 * 60 * 1000) {
      return res.status(HttpStatus.UNAUTHORIZED).send({
        error: "expired_token",
        error_description: "Access token has expired",
      });
    }

    return res.status(HttpStatus.OK).send({
      message: "Access granted to protected resource",
      user_id: "test_user_123",
      scope: tokenData.scope,
      client_id: tokenData.clientId,
      grant_type: tokenData.grantType,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get test credentials endpoint
   */
  @Get("credentials")
  @ApiOperation({ summary: "Get Test Credentials" })
  getCredentials() {
    return {
      message: "Use these credentials for testing OAuth2 flows",
      client_id: this.TEST_CLIENT_ID,
      client_secret: this.TEST_CLIENT_SECRET,
      default_scope: this.TEST_SCOPE,
      endpoints: {
        authorization_url: "http://localhost:9000/oauth2-test/authorize",
        token_url: "http://localhost:9000/oauth2-test/token",
        protected_resource_url:
          "http://localhost:9000/oauth2-test/protected-resource",
      },
    };
  }

  /**
   * Handle Client Credentials flow
   */
  private handleClientCredentials(
    clientId: string,
    scope: string,
    res: FastifyReply,
  ) {
    const accessToken = "cc_token_" + Math.random().toString(36).substring(7);

    this.accessTokens.set(accessToken, {
      clientId,
      scope: scope || this.TEST_SCOPE,
      grantType: "client_credentials",
      createdAt: Date.now(),
    });

    return res.status(HttpStatus.OK).send({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutes
      scope: scope || this.TEST_SCOPE,
    });
  }

  /**
   * Handle Authorization Code flow
   */
  private handleAuthorizationCode(
    code: string,
    clientId: string,
    redirectUri: string,
    res: FastifyReply,
  ) {
    const authData = this.authorizationCodes.get(code);

    if (!authData) {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "invalid_grant",
        error_description: "Invalid authorization code",
      });
    }

    if (authData.used) {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "invalid_grant",
        error_description: "Authorization code has already been used",
      });
    }

    if (authData.clientId !== clientId) {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "invalid_grant",
        error_description:
          "Authorization code was issued to a different client",
      });
    }

    if (authData.redirectUri !== redirectUri) {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "invalid_grant",
        error_description: "Redirect URI does not match",
      });
    }

    if (Date.now() - authData.createdAt > 10 * 60 * 1000) {
      return res.status(HttpStatus.BAD_REQUEST).send({
        error: "invalid_grant",
        error_description: "Authorization code has expired",
      });
    }

    authData.used = true;

    const accessToken = "ac_token_" + Math.random().toString(36).substring(7);

    this.accessTokens.set(accessToken, {
      clientId,
      scope: authData.scope,
      grantType: "authorization_code",
      createdAt: Date.now(),
    });

    return res.status(HttpStatus.OK).send({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 900, // 15 minutes
      scope: authData.scope,
    });
  }
}
