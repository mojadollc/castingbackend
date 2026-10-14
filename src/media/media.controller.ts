import {
  Controller, Post, Get, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { RequestUploadUrlDto, CompleteUploadDto } from './media.dto';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request a presigned S3 upload URL' })
  requestUploadUrl(@CurrentUser() user: User, @Body() dto: RequestUploadUrlDto) {
    return this.mediaService.requestUploadUrl(user.id, dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Notify server that upload is complete and trigger processing' })
  completeUpload(@CurrentUser() user: User, @Body() dto: CompleteUploadDto) {
    return this.mediaService.completeUpload(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media file details and signed download URL' })
  getMedia(@Param('id') id: string, @CurrentUser() user: User) {
    return this.mediaService.getMedia(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a media file' })
  deleteMedia(@Param('id') id: string, @CurrentUser() user: User) {
    return this.mediaService.deleteMedia(id, user.id);
  }
}
