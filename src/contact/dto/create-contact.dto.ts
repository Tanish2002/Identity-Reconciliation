import { IsEmail, IsMobilePhone, IsOptional, IsString } from 'class-validator';

export class CreateContactDto {
  @IsOptional()
  @IsString()
  @IsMobilePhone(null, null, { message: 'Invalid phone number format' })
  phoneNumber?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;
}
