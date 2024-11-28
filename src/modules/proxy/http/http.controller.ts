import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpService } from "./http.service";
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiBearerAuth()
@ApiTags("proxy")
@Controller("api/proxy")
export class HttpController {
  constructor(private readonly httpService: HttpService) {}

  @Post("http-request")
  @ApiOperation({
    summary: "Proxy to route HTTP requests",
    description: `This will help address CORS error encountered when requests are made directly from a browser agent.
       Instead of browser agent, request will be routed through this proxy.`,
  })
  async handleHttpRequest(
    @Body("url") url: string,
    @Body("method") method: string,
    @Body("headers") headers: string,
    @Body("body") body: any,
    @Body("contentType") contentType: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      const response = await this.httpService.makeHttpRequest({
        url,
        method,
        headers,
        body,
        contentType,
      });

      // Set the response headers and status
      Object.entries(response.headers).forEach(([key, value]) => {
        res.header(key, value as string);
      });

      res.status(response.status).send(response.data);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_GATEWAY);
    }
  }
}
