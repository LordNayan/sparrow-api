import { Body, Controller, Post, Res, UseGuards } from "@nestjs/common";
import { ChatbotService } from "../services/chatbot.service";
import { FastifyReply } from "fastify";
import { HttpStatusCode } from "@src/modules/common/enum/httpStatusCode.enum";
import { ApiResponseService } from "@src/modules/common/services/api-response.service";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@src/modules/common/guards/jwt-auth.guard";
import { PromptDto } from "../payloads/chat-ai.payload";
import { error } from "console";

@ApiBearerAuth()
@ApiTags("chatbot")
@Controller("api")
@UseGuards(JwtAuthGuard)
export class ChatbotController {
  /**
   * Constructor to initialize ChatbotController with the required service.
   * @param chatbotService - Injected ChatbotService to handle business logic.
   */
  constructor(private readonly chatbotService: ChatbotService) {}

  @ApiOperation({
    summary: "Get a respose for chatbot",
    description: "this will return AI response from the prompt",
  })
  @ApiResponse({
    status: 201,
    description: "AI response Generated Successfully",
  })
  @ApiResponse({ status: 400, description: "Generate AI Response Failed" })
  @Post("chatbot/prompt")
  async generate(@Body() prompt: PromptDto, @Res() res: FastifyReply) {
    if (prompt.text.length > 10) {
      throw error("exceed");
    }
    const data = await this.chatbotService.generateText(prompt.text);
    const response = new ApiResponseService(
      "Chatbot Reposonse Generated",
      HttpStatusCode.CREATED,
      data,
    );
    return res.status(response.httpStatusCode).send(response);
  }
}
