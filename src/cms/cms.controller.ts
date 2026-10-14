import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CmsService } from './cms.service';
import { CreatePageDto, UpdatePageDto, CreateBlogPostDto, UpdateBlogPostDto } from './cms.dto';
import { Public, Roles } from '../auth/auth.guards';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

// ─── Public CMS ──────────────────────────────────────────────────────────────

@ApiTags('CMS — Public')
@Controller()
export class CmsPublicController {
  constructor(private readonly svc: CmsService) {}

  @Public()
  @Get('pages/:slug')
  @ApiOperation({ summary: 'Get a published page by slug' })
  getPage(@Param('slug') slug: string) {
    return this.svc.getPage(slug);
  }

  @Public()
  @Get('blog')
  @ApiOperation({ summary: 'List published blog posts' })
  listBlog(@Query('page') page = 1) {
    return this.svc.listBlogPosts(+page);
  }

  @Public()
  @Get('blog/:slug')
  @ApiOperation({ summary: 'Get a published blog post' })
  getBlogPost(@Param('slug') slug: string) {
    return this.svc.getBlogPost(slug);
  }

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'List FAQs' })
  listFaqs(@Query('category') category?: string) {
    return this.svc.listFaqs(category);
  }

  @Public()
  @Get('reviews')
  @ApiOperation({ summary: 'List published reviews' })
  listReviews() {
    return this.svc.listReviews();
  }

  @Public()
  @Get('success-stories')
  @ApiOperation({ summary: 'List success stories' })
  listSuccessStories() {
    return this.svc.listSuccessStories();
  }

  @Public()
  @Get('safety')
  @ApiOperation({ summary: 'Child safety policy content' })
  getSafety() {
    return this.svc.getSafetyContent();
  }

  @Public()
  @Get('labor-laws')
  @ApiOperation({ summary: 'Child labor law information' })
  getLaborLaws() {
    return this.svc.getLaborLawContent();
  }
}

// ─── Admin CMS ───────────────────────────────────────────────────────────────

@ApiTags('Admin — CMS')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.CMS_EDITOR)
@Controller('admin')
export class CmsAdminController {
  constructor(private readonly svc: CmsService) {}

  @Post('pages')
  @ApiOperation({ summary: 'Create a page' })
  createPage(@Body() dto: CreatePageDto) {
    return this.svc.createPage(dto);
  }

  @Patch('pages/:id')
  @ApiOperation({ summary: 'Update a page' })
  updatePage(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.svc.updatePage(id, dto);
  }

  @Delete('pages/:id')
  @ApiOperation({ summary: 'Delete a page' })
  deletePage(@Param('id') id: string) {
    return this.svc.deletePage(id);
  }

  @Post('blog')
  @ApiOperation({ summary: 'Create a blog post' })
  createBlogPost(@Body() dto: CreateBlogPostDto) {
    return this.svc.createBlogPost(dto);
  }

  @Patch('blog/:id')
  @ApiOperation({ summary: 'Update a blog post' })
  updateBlogPost(@Param('id') id: string, @Body() dto: UpdateBlogPostDto) {
    return this.svc.updateBlogPost(id, dto);
  }

  @Delete('blog/:id')
  @ApiOperation({ summary: 'Delete a blog post' })
  deleteBlogPost(@Param('id') id: string) {
    return this.svc.deleteBlogPost(id);
  }
}
