import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { BlogStatus, CommentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { paginate, PaginationDto } from '../common/dto/pagination.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ModerateCommentDto } from './dto/moderate-comment.dto';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // PUBLIC
  // ============================================================
  async listPublic(q: QueryPostsDto) {
    const where: Prisma.BlogPostWhereInput = { status: BlogStatus.published };
    if (q.category) where.category = { slug: q.category };
    if (q.featured !== undefined) where.isFeatured = q.featured;
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { excerpt: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { publishedAt: q.order ?? 'desc' },
        select: this.cardSelect(),
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async publicBySlug(slug: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: BlogStatus.published },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        author: { select: { firstName: true, lastName: true, avatarUrl: true } },
        comments: {
          where: { status: CommentStatus.approved, parentId: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            authorName: true,
            text: true,
            createdAt: true,
            replies: {
              where: { status: CommentStatus.approved },
              orderBy: { createdAt: 'asc' },
              select: { id: true, authorName: true, text: true, createdAt: true },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException("Maqola topilmadi");

    await this.prisma.blogPost.update({
      where: { id: post.id },
      data: { viewsCount: { increment: 1 } },
    });

    return post;
  }

  async addComment(slug: string, dto: CreateCommentDto) {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: BlogStatus.published },
      select: { id: true },
    });
    if (!post) throw new NotFoundException("Maqola topilmadi");

    if (dto.parentId) {
      const parent = await this.prisma.blogComment.findFirst({
        where: { id: dto.parentId, postId: post.id },
        select: { id: true },
      });
      if (!parent) throw new NotFoundException("Javob berilayotgan izoh topilmadi");
    }

    await this.prisma.blogComment.create({
      data: {
        postId: post.id,
        parentId: dto.parentId,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        text: dto.text,
      },
    });

    return { message: "Izohingiz qabul qilindi va moderatsiyadan so'ng chop etiladi" };
  }

  async listCategories() {
    return this.prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { posts: { where: { status: BlogStatus.published } } } } },
    });
  }

  // ============================================================
  // ADMIN — POSTS
  // ============================================================
  async listAll(q: QueryPostsDto) {
    const where: Prisma.BlogPostWhereInput = {};
    if (q.status) where.status = q.status;
    if (q.category) where.category = { slug: q.category };
    if (q.search) {
      where.OR = [
        { title: { contains: q.search, mode: 'insensitive' } },
        { excerpt: { contains: q.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { createdAt: q.order ?? 'desc' },
        select: { ...this.cardSelect(), status: true, viewsCount: true },
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async findOne(id: string) {
    const post = await this.prisma.blogPost.findUnique({
      where: { id },
      include: { category: true, author: { select: { firstName: true, lastName: true } } },
    });
    if (!post) throw new NotFoundException("Maqola topilmadi");
    return post;
  }

  async create(authorId: string, dto: CreatePostDto) {
    const dup = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
    if (dup) throw new ConflictException("Bunday slug bilan maqola allaqachon mavjud");

    const status = dto.status ?? BlogStatus.draft;
    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt,
        content: dto.content,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        readMinutes: dto.readMinutes ?? 5,
        isFeatured: dto.isFeatured ?? false,
        status,
        publishedAt: status === BlogStatus.published ? new Date() : null,
        authorId,
      },
    });
  }

  async update(id: string, dto: UpdatePostDto) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Maqola topilmadi");

    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await this.prisma.blogPost.findUnique({ where: { slug: dto.slug } });
      if (dup) throw new ConflictException("Bunday slug bilan maqola allaqachon mavjud");
    }

    const data: Prisma.BlogPostUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.readMinutes !== undefined) data.readMinutes = dto.readMinutes;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.categoryId !== undefined) {
      data.category = dto.categoryId ? { connect: { id: dto.categoryId } } : { disconnect: true };
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === BlogStatus.published && !existing.publishedAt) data.publishedAt = new Date();
    }

    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Maqola topilmadi");
    await this.prisma.blogPost.delete({ where: { id } });
    return { message: "Maqola o'chirildi" };
  }

  async publish(id: string) {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Maqola topilmadi");
    return this.prisma.blogPost.update({
      where: { id },
      data: { status: BlogStatus.published, publishedAt: existing.publishedAt ?? new Date() },
    });
  }

  // ============================================================
  // ADMIN — CATEGORIES
  // ============================================================
  async createCategory(name: string, slug: string) {
    const dup = await this.prisma.blogCategory.findUnique({ where: { slug } });
    if (dup) throw new ConflictException("Bunday slug bilan kategoriya mavjud");
    return this.prisma.blogCategory.create({ data: { name, slug } });
  }

  // ============================================================
  // ADMIN — COMMENTS (moderatsiya)
  // ============================================================
  async listComments(q: PaginationDto, status?: CommentStatus) {
    const where: Prisma.BlogCommentWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.blogComment.findMany({
        where,
        skip: q.skip,
        take: q.take,
        orderBy: { createdAt: 'desc' },
        include: { post: { select: { id: true, title: true, slug: true } } },
      }),
      this.prisma.blogComment.count({ where }),
    ]);

    return paginate(items, total, q.page ?? 1, q.limit ?? 20);
  }

  async moderateComment(id: string, dto: ModerateCommentDto) {
    const comment = await this.prisma.blogComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException("Izoh topilmadi");
    return this.prisma.blogComment.update({ where: { id }, data: { status: dto.status } });
  }

  // ============================================================
  // INTERNAL
  // ============================================================
  private cardSelect() {
    return {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      imageUrl: true,
      readMinutes: true,
      isFeatured: true,
      publishedAt: true,
      createdAt: true,
      category: { select: { id: true, name: true, slug: true } },
      author: { select: { firstName: true, lastName: true, avatarUrl: true } },
    } satisfies Prisma.BlogPostSelect;
  }
}
