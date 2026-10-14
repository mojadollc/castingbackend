import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { UpdateNotificationPreferencesDto } from './notifications.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List my notifications' })
  list(@CurrentUser('id') userId: string, @Query('page') page = 1) {
    return this.svc.list(userId, +page);
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.markRead(id, userId);
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.svc.markAllRead(userId);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  getPrefs(@CurrentUser('id') userId: string) {
    return this.svc.getPreferences(userId);
  }

  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  updatePrefs(@CurrentUser('id') userId: string, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.svc.updatePreferences(userId, dto);
  }
}
