import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { StellarService } from '../stellar/stellar.service';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly stellarService: StellarService
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user data',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        username: 'username',
        role: 'student',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns user data',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        username: 'username',
        role: 'student',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: { example: { id: 'uuid', email: 'user@example.com' } },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any
  ) {
    if (!this.usersService.canUpdateUser(user.id, id, user.role)) {
      throw new ForbiddenException('You can only update your own profile');
    }
    return this.usersService.update(id, dto);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: { example: { avatarUrl: 'https://...' } },
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } }
  ) {
    if (!file) {
      throw new NotFoundException('File is required');
    }
    return this.usersService.uploadAvatar(req.user.id, file);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Search users with filtering and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
    schema: {
      example: {
        data: [{ id: 'uuid', email: 'user@example.com' }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        statusCode: 200,
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    },
  })
  searchUsers(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id/token-balance')
  @ApiOperation({ summary: 'Get BST token balance for a user' })
  @ApiResponse({
    status: 200,
    description: 'Returns BST token balance',
    schema: { example: { balance: '1000', stellarPublicKey: 'G...' } },
  })
  @ApiResponse({ status: 404, description: 'User not found or no Stellar key linked' })
  async getTokenBalance(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    if (!user.stellarPublicKey)
      throw new NotFoundException('User has no Stellar public key linked');
    const balance = await this.stellarService.getTokenBalance(user.stellarPublicKey);
    return { balance, stellarPublicKey: user.stellarPublicKey };
  }

  @Get(':id/referrals')
  @ApiOperation({ summary: 'Get referral count and earned BST for a user' })
  getReferrals(@Param('id') id: string) {
    return this.usersService.getReferralStats(id);
  }
}
