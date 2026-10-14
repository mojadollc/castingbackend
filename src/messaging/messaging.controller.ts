import {
  Controller, Get, Post, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagingService } from './messaging.service';
import { CreateConversationDto, SendMessageDto, ReportConversationDto } from './messaging.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class MessagingController {
  constructor(private readonly svc: MessagingService) {}

  @Get()
  @ApiOperation({ summary: 'List my conversations' })
  list(@CurrentUser('id') userId: string) {
    return this.svc.listConversations(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Start a conversation (Professional → Guardian)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateConversationDto) {
    return this.svc.createConversation(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  getOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.getConversation(id, userId);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get messages (cursor-paginated)' })
  getMessages(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.svc.getMessages(id, userId, cursor);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message' })
  sendMessage(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.sendMessage(id, userId, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.markRead(id, userId);
  }

  @Post(':id/report')
  @ApiOperation({ summary: 'Report a conversation' })
  report(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportConversationDto,
  ) {
    return this.svc.reportConversation(id, userId, dto);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block a conversation' })
  block(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.blockConversation(id, userId);
  }
}
