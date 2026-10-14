import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreatePageDto, UpdatePageDto, CreateBlogPostDto, UpdateBlogPostDto } from './cms.dto';

// Static safety/labor-law content — no DB needed, managed in code
const SAFETY_CONTENT = {
  title: 'Child Safety Policy',
  sections: [
    {
      heading: 'Our Commitment',
      body: 'All professionals on this platform are verified before they can contact guardians or view talent profiles. Every communication is routed through the guardian — never directly to a child.',
    },
    {
      heading: 'Reporting',
      body: 'Use the Report button on any profile, message, or casting call. Child safety reports are automatically escalated to our safety team within minutes.',
    },
    {
      heading: 'Data Protection',
      body: "Children's personal data is never shared with third parties. Talent profiles are only visible to verified casting professionals.",
    },
  ],
};

const LABOR_LAW_CONTENT = {
  title: 'Child Labor Laws & Compliance',
  disclaimer: 'This is general information only. Always consult a qualified attorney for legal advice.',
  regions: [
    {
      region: 'United States',
      summary: 'Child performers are protected under the Coogan Law (California) and equivalent state laws. Earnings must be set aside in a blocked trust account.',
      links: ['https://www.dir.ca.gov/dlse/coogan.html'],
    },
    {
      region: 'United Kingdom',
      summary: 'Children in entertainment require a licence from the local authority. Working hours are strictly regulated by age.',
      links: ['https://www.gov.uk/child-employment'],
    },
  ],
};

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Pages ─────────────────────────────────────────────────────────────────

  async getPage(slug: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { slug } });
    if (!page || !page.isPublished) throw new NotFoundException('Page not found');
    return page;
  }

  async createPage(dto: CreatePageDto) {
    const existing = await this.prisma.cmsPage.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    return this.prisma.cmsPage.create({ data: dto });
  }

  async updatePage(id: string, dto: UpdatePageDto) {
    const page = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.cmsPage.update({ where: { id }, data: dto });
  }

  async deletePage(id: string) {
    const page = await this.prisma.cmsPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    await this.prisma.cmsPage.delete({ where: { id } });
    return { success: true };
  }

  // ─── Blog ──────────────────────────────────────────────────────────────────

  async listBlogPosts(page = 1) {
    const take = 12;
    const skip = (page - 1) * take;
    const [items, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where: { isPublished: true },
        select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.blogPost.count({ where: { isPublished: true } }),
    ]);
    return { items, total, page, pages: Math.ceil(total / take) };
  }

  async getBlogPost(slug: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { slug } });
    if (!post || !post.isPublished) throw new NotFoundException('Post not found');
    return post;
  }

  async createBlogPost(dto: CreateBlogPostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Slug already exists');
    return this.prisma.blogPost.create({
      data: {
        ...dto,
        publishedAt: dto.isPublished ? new Date() : undefined,
      },
    });
  }

  async updateBlogPost(id: string, dto: UpdateBlogPostDto) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    const data: any = { ...dto };
    if (dto.isPublished && !post.publishedAt) data.publishedAt = new Date();
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async deleteBlogPost(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.blogPost.delete({ where: { id } });
    return { success: true };
  }

  // ─── FAQs ──────────────────────────────────────────────────────────────────

  async listFaqs(category?: string) {
    return this.prisma.faq.findMany({
      where: { isPublished: true, ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  // ─── Reviews ───────────────────────────────────────────────────────────────

  async listReviews() {
    return this.prisma.review.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  // ─── Success Stories ───────────────────────────────────────────────────────

  async listSuccessStories() {
    return this.prisma.successStory.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Static content ────────────────────────────────────────────────────────

  getSafetyContent() {
    return SAFETY_CONTENT;
  }

  getLaborLawContent() {
    return LABOR_LAW_CONTENT;
  }
}
