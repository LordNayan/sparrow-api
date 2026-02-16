import { Module } from "@nestjs/common";
import { OAuth2TestController } from "./oauth2-test.controller";

@Module({
  controllers: [OAuth2TestController],
})
export class OAuth2TestModule {}
