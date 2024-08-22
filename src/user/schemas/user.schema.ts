
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
  @Prop()
  userId: string;

  @Prop()
  email: string;

  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  @Prop()
  avatarUrl?: string;

  @Prop()
  hash?: string;

  @Prop()
  avatarFilePath?: string;
  id: any;
}

export const UserSchema = SchemaFactory.createForClass(User);