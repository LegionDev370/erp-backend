import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BlogService } from './blog.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { QueryPostsDto } from './dto/query-posts.dto';
import { QueryCommentsDto } from './dto/query-comments.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateCategoryDto, ModerateCommentDto } from './dto/moderate-comment.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Public · Blog')
@Public()
@Controller('public/blog')
export class PublicBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'Chop etilgan maqolalar (filter: category, featured, search)' })
  list(@Query() q: QueryPostsDto) {
    return this.blogService.listPublic(q);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Blog kategoriyalari (post soni bilan)' })
  categories() {
    return this.blogService.listCategories();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Maqola (slug) + tasdiqlangan izohlar' })
  bySlug(@Param('slug') slug: string) {
    return this.blogService.publicBySlug(slug);
  }

  @Post(':slug/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Izoh qoldirish (moderatsiyaga tushadi)' })
  addComment(@Param('slug') slug: string, @Body() dto: CreateCommentDto) {
    return this.blogService.addComment(slug, dto);
  }
}

@ApiTags('Admin · Blog')
@ApiBearerAuth('access-token')
@Roles('admin', 'super_admin')
@Controller('admin/blog')
export class AdminBlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Barcha maqolalar (filter: status, category, search)' })
  list(@Query() q: QueryPostsDto) {
    return this.blogService.listAll(q);
  }

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi maqola' })
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePostDto) {
    return this.blogService.create(userId, dto);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Maqola tafsiloti' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogService.findOne(id);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Maqolani yangilash' })
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdatePostDto) {
    return this.blogService.update(id, dto);
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Maqolani o\'chirish' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogService.remove(id);
  }

  @Patch('posts/:id/publish')
  @ApiOperation({ summary: 'Maqolani nashr etish' })
  publish(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.blogService.publish(id);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Kategoriya qo\'shish' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.blogService.createCategory(dto.name, dto.slug);
  }

  @Get('comments')
  @ApiOperation({ summary: 'Izohlar moderatsiya navbati (filter: status)' })
  comments(@Query() q: QueryCommentsDto) {
    return this.blogService.listComments(q, q.status);
  }

  @Patch('comments/:id/moderate')
  @ApiOperation({ summary: 'Izohni tasdiqlash / rad etish' })
  moderate(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ModerateCommentDto) {
    return this.blogService.moderateComment(id, dto);
  }
}
