import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('identify')
export class ContactController {
  constructor(private readonly contactService: ContactService) { }

  @Post()
  async identify(@Body() body: CreateContactDto) {

    if (!body.email && !body.phoneNumber) {
      throw new BadRequestException('Either email or phone number must be provided');
    }

    const email = body.email ? body.email.trim().toLowerCase() : null;
    const phoneNumber = body.phoneNumber
      ? body.phoneNumber.replace(/\D/g, '')
      : null;

    try {
      const result = await this.contactService.identify({ email, phoneNumber });
      return result;
    } catch (error) {
      throw error;
    }
  }
}
