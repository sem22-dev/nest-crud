
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { getModelToken } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('axios');
jest.mock('fs');
jest.mock('path');

describe('UserService', () => {
  let service: UserService;
  let mockUserModel: Partial<Model<User>>;

  const mockUser = {
    userId: '1',
    avatarUrl: 'http://example.com/avatar.jpg',
    hash: 'somehash',
    avatarFilePath: '/path/to/avatar.jpg',
    save: jest.fn(),
  };

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };
  
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();
  
    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const createUserDto = { name: 'John Doe' };
      (mockUserModel.create as jest.Mock).mockResolvedValue(mockUser);


      const result = await service.create(createUserDto);

      expect(mockUserModel.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('getAvatar', () => {
    it('should return existing avatar if it exists', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('fake-image-data'));

      const result = await service.getAvatar('1');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ userId: '1' });
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/avatar.jpg');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/avatar.jpg');
      expect(result).toBe('ZmFrZS1pbWFnZS1kYXRh'); // Base64 encoded 'fake-image-data'
    });

    it('should fetch and save new avatar if user exists but has no avatar', async () => {
      const userWithoutAvatar = { ...mockUser, avatarUrl: undefined, avatarFilePath: undefined, save: jest.fn() };
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(userWithoutAvatar);
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { data: { avatar: 'http://example.com/new-avatar.jpg' } } });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: Buffer.from('new-fake-image-data') });
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('new-fake-image-data'));
    
      const result = await service.getAvatar('1');
    
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ userId: '1' });
      expect(axios.get).toHaveBeenCalledWith('https://reqres.in/api/users/1');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(userWithoutAvatar.save).toHaveBeenCalled();
      expect(result).toBe('bmV3LWZha2UtaW1hZ2UtZGF0YQ=='); // Base64 encoded 'new-fake-image-data'
    });

    it('should create new user and save avatar if user does not exist', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(null);
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: { data: { id: 1, avatar: 'http://example.com/new-avatar.jpg' } } });
      (axios.get as jest.Mock).mockResolvedValueOnce({ data: Buffer.from('new-fake-image-data') });
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      (mockUserModel.create as jest.Mock).mockResolvedValue(mockUser);


      const result = await service.getAvatar('1');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ userId: '1' });
      expect(axios.get).toHaveBeenCalledWith('https://reqres.in/api/users/1');
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(mockUserModel.create).toHaveBeenCalled();
      expect(result).toBe('bmV3LWZha2UtaW1hZ2UtZGF0YQ=='); // Base64 encoded 'new-fake-image-data'
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar file and update user document', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await service.deleteAvatar('1');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ userId: '1' });
      expect(fs.existsSync).toHaveBeenCalledWith('/path/to/avatar.jpg');
      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/avatar.jpg');
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.avatarUrl).toBeUndefined();
      expect(mockUser.hash).toBeUndefined();
      expect(mockUser.avatarFilePath).toBeUndefined();
    });

    it('should throw NotFoundException if user or avatar not found', async () => {
      (mockUserModel.findOne as jest.Mock).mockResolvedValue(null);


      await expect(service.deleteAvatar('1')).rejects.toThrow('Avatar not found for this user');
    });
  });
});