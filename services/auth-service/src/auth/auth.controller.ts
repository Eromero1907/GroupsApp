import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('validate/:token')
  async validateToken(@Param('token') token: string) {
    return this.authService.validateToken(token);
  }

  @Get('user/:id')
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }

  /** Lista todos los usuarios registrados — usado por users-service para sincronizar */
  @Get('users')
  async listUsers() {
    return this.authService.listUsers();
  }
}