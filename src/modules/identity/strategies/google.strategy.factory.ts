import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleStrategy } from "./google.strategy";

@Injectable()
export class GoogleStrategyFactory {
  constructor(private readonly configService: ConfigService) {}

  createStrategy(): GoogleStrategy | undefined {
    const clientID = this.configService.get("oauth.google.clientId");
    const clientSecret = this.configService.get("oauth.google.clientSecret");
    const callbackURL = `${this.configService.get(
      "oauth.google.appUrl",
    )}/api/auth/google/callback`;

    if (clientID && clientSecret && callbackURL) {
      return new GoogleStrategy(clientID, clientSecret, callbackURL);
    }

    return undefined;
  }
}
