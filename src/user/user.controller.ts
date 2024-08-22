
import { Controller, Post, Get, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { UserService } from './user.service';
import { catchError, firstValueFrom, throwError } from 'rxjs';

@Controller('api/user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private httpService: HttpService
  ) {}

  @Post()
  async create(@Body() createUserDto: any) {
    const user = await this.userService.create(createUserDto);
    
    // Dummy email sending
    console.log(`Simulated email sent to: ${user.email}`);
    
    // Dummy RabbitMQ event
    console.log(`Simulated RabbitMQ event for user: ${user.id}`);
    
    return user;
  }

  @Get(':userId')
  async getUser(@Param('userId') userId: string) {
    const url = `https://reqres.in/api/users/${userId}`;
    
    try {
      const response = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error) => {
            if (error.response && error.response.status === 404) {
              throw new NotFoundException('User not found');
            }
            return throwError(() => new Error('An error occurred'));
          })
        )
      );
      return response.data.data;
    } catch (error) {
      throw new NotFoundException('User not found');
    }
  }
  
  @Get(':userId/avatar')
  async getAvatar(@Param('userId') userId: string) {
    const base64Avatar = await this.userService.getAvatar(userId);
    return { avatar: base64Avatar };
  }

  @Delete(':reqresId/avatar')
  async deleteAvatar(@Param('reqresId') reqresId: string) {
    try {
      await this.userService.deleteAvatar(reqresId);
      return { message: 'Avatar deleted successfully' };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }
}