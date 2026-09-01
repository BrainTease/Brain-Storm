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
import { UserResponseDto, toUserResponseDto, toUserResponseDtos } from './dto/user-response.dto';
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
  @ApiResponse({ status: 200, description: 'Returns current user data', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() user: any): Promise<UserResponseDto> {
    const found = await this.usersService.findById(user.id);
    if (!found) throw new NotFoundException('User not found');
    return toUserResponseDto(found);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Returns user data', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return toUserResponseDto(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own profile' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any
  ): Promise<UserResponseDto> {
    if (!this.usersService.canUpdateUser(user.id, id, user.role)) {
      throw new ForbiddenException('You can only update your own profile');
    }
    const updated = await this.usersService.update(id, dto);
    return toUserResponseDto(updated);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Avatar uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } }
  ) {
    if (!file) throw new NotFoundException('File is required');
    return this.usersService.uploadAvatar(req.user.id, file);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Search users with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of users' })
  async searchUsers(@Query() query: UserQueryDto) {
    const result = await this.usersService.findAll(query);
    // Wrap data array through DTO so internal fields are stripped from every row
    return { ...result, data: toUserResponseDtos(result.data ?? []) };
  }

  @Get(':id/token-balance')
  @ApiOperation({ summary: 'Get BST token balance for a user' })
  @ApiResponse({ status: 200, description: 'Returns BST token balance' })
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
