
import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { NotFoundException } from '@nestjs/common';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { User } from './schemas/user.schema';
import { throwError } from 'rxjs';

describe('UserController', () => {
  let controller: UserController;
  let userService: UserService;
  let httpService: HttpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: {
            create: jest.fn(),
            getAvatar: jest.fn(),
            deleteAvatar: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
    httpService = module.get<HttpService>(HttpService);
  });

  describe('create', () => {
    it('should create a user', async () => {
      const createUserDto = { first_name: 'Test', last_name: 'User', email: 'test@example.com' };
      const createdUser: User = {
        userId: '1', ...createUserDto,
        id: undefined
      };
      jest.spyOn(userService, 'create').mockResolvedValue(createdUser);

      const result = await controller.create(createUserDto);

      expect(result).toEqual(createdUser);
      expect(userService.create).toHaveBeenCalledWith(createUserDto);
    });
  });

  describe('getUser', () => {
    it('should get a user from reqres.in', async () => {
      const userId = '1';
      const userData = { id: userId, first_name: 'Test', last_name: 'User', email: 'test@example.com' };
      const axiosResponse: AxiosResponse = {
        data: { data: userData },
        status: 200,
        statusText: 'OK',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      };
      
      jest.spyOn(httpService, 'get').mockReturnValue(of(axiosResponse));

      const result = await controller.getUser(userId);

      expect(result).toEqual(userData);
      expect(httpService.get).toHaveBeenCalledWith(`https://reqres.in/api/users/${userId}`);
    });
  });

  describe('getAvatar', () => {
    it('should get user avatar', async () => {
      const userId = '1';
      const base64Avatar = 'base64encodedavatar';
      jest.spyOn(userService, 'getAvatar').mockResolvedValue(base64Avatar);

      const result = await controller.getAvatar(userId);

      expect(result).toEqual({ avatar: base64Avatar });
      expect(userService.getAvatar).toHaveBeenCalledWith(userId);
    });
  });

  describe('deleteAvatar', () => {
    it('should delete user avatar', async () => {
      const userId = '1';
      jest.spyOn(userService, 'deleteAvatar').mockResolvedValue(undefined);

      const result = await controller.deleteAvatar(userId);

      expect(result).toEqual({ message: 'Avatar deleted successfully' });
      expect(userService.deleteAvatar).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when avatar not found', async () => {
      const userId = '1';
      jest.spyOn(userService, 'deleteAvatar').mockRejectedValue(new Error('Avatar not found'));

      await expect(controller.deleteAvatar(userId)).rejects.toThrow(NotFoundException);
      expect(userService.deleteAvatar).toHaveBeenCalledWith(userId);
    });
  });

  // Additional tests to cover edge cases and error scenarios

  describe('create - error handling', () => {
    it('should handle user creation failure', async () => {
      const createUserDto = { first_name: 'Test', last_name: 'User', email: 'test@example.com' };
      jest.spyOn(userService, 'create').mockRejectedValue(new Error('Creation failed'));

      await expect(controller.create(createUserDto)).rejects.toThrow('Creation failed');
    });
  });

  describe('getUser - error handling', () => {
    it('should handle user not found', async () => {
      const userId = '999';
      const errorResponse = {
        response: { status: 404, statusText: 'Not Found' },
      };
  
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => errorResponse));
  
      await expect(controller.getUser(userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvatar - error handling', () => {
    it('should handle avatar not found', async () => {
      const userId = '1';
      jest.spyOn(userService, 'getAvatar').mockRejectedValue(new NotFoundException('Avatar not found'));
  
      await expect(controller.getAvatar(userId)).rejects.toThrow(NotFoundException);
    });
  });
});