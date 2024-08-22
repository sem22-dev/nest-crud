import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import axios from 'axios';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

@Injectable()
export class UserService {

    private readonly avatarsDir: string;
    
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
        this.avatarsDir = path.join(__dirname, '..', '..', 'avatars');
        this.ensureAvatarsDirectoryExists();
      }
    
      private ensureAvatarsDirectoryExists() {
        if (!fs.existsSync(this.avatarsDir)) {
          fs.mkdirSync(this.avatarsDir, { recursive: true });
        }
      }

      async create(createUserDto: any): Promise<User> {
        return this.userModel.create(createUserDto);
      }

  async getAvatar(userId: string): Promise<string> {
    console.log(`Getting avatar for user ${userId}`);
    
    // Find the user in the database by userId
    let user = await this.userModel.findOne({ userId });

    if (user) {
        // If user exists and has an avatar, return the base64 representation
        if (user.avatarFilePath && fs.existsSync(user.avatarFilePath)) {
            console.log(`Avatar already exists for user ${userId}, returning from file`);
            return this.getBase64(user.avatarFilePath);
        } else if (!user.avatarUrl) {
            // If user exists but doesn't have an avatarUrl, fetch it from reqres.in
            console.log(`User ${userId} exists but has no avatar, fetching avatar...`);
            const response = await axios.get(`https://reqres.in/api/users/${userId}`);
            const avatarUrl = response.data.data.avatar;

            // Download and save avatar
            const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(avatarResponse.data, 'binary');
            const avatarHash = crypto.createHash('md5').update(buffer).digest('hex');
            const fileName = `${avatarHash}.jpg`;
            const filePath = path.join(this.avatarsDir, fileName);
            fs.writeFileSync(filePath, buffer);

            // Update the existing user with avatar information
            user.avatarUrl = avatarUrl;
            user.hash = avatarHash;
            user.avatarFilePath = filePath;
            await user.save();

            console.log(`Avatar saved for existing user ${userId}`);
            return this.getBase64(filePath);
        } else {
            // If user exists but no avatar file, handle this case if needed (e.g., return an error or fetch new avatar)
            throw new Error(`User ${userId} exists but avatar file is missing.`);
        }
    } else {
        // If user doesn't exist, create a new user entry
        console.log(`User ${userId} not found in our database, fetching from reqres.in`);
        const response = await axios.get(`https://reqres.in/api/users/${userId}`);
        const userData = response.data.data;

        // Download and save avatar
        const avatarUrl = userData.avatar;
        const avatarResponse = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(avatarResponse.data, 'binary');
        const avatarHash = crypto.createHash('md5').update(buffer).digest('hex');
        const fileName = `${avatarHash}.jpg`;
        const filePath = path.join(this.avatarsDir, fileName);
        fs.writeFileSync(filePath, buffer);

        // Create a new user in our database with avatar information
        user = await this.userModel.create({
            userId: userData.id.toString(),
            avatarUrl: avatarUrl,
            hash: avatarHash,
            avatarFilePath: filePath,
        });
        await user.save();

        console.log(`Avatar saved for new user ${userId}`);
        return this.getBase64(filePath);
    }
}


  private getBase64(filePath: string): string {
    const file = fs.readFileSync(filePath);
    return file.toString('base64');
  }

  //delete
  async deleteAvatar(userId: string): Promise<void> {
    console.log(`Deleting avatar for user ${userId}`);
    const user = await this.userModel.findOne({ userId });

    if (!user || !user.avatarFilePath) {
      throw new NotFoundException('Avatar not found for this user');
    }

    // Delete the avatar file from the filesystem
    if (fs.existsSync(user.avatarFilePath)) {
      fs.unlinkSync(user.avatarFilePath);
      console.log(`Deleted avatar file at ${user.avatarFilePath}`);
    }

    // Remove the avatar fields from the database entry
    user.avatarUrl = undefined;
    user.hash = undefined;
    user.avatarFilePath = undefined;
    await user.save();

    console.log(`Avatar entry removed from the database for user ${userId}`);
  }

}