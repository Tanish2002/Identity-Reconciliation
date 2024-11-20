import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Controller('identify')
export class ContactController {
  private readonly logger = new Logger(ContactController.name);
  constructor(private readonly contactService: ContactService) {}

  @Post()
  async identify(@Body() body: CreateContactDto) {
    this.logger.log('Identify endpoint called', {
      hasEmail: !!body.email,
      hasPhoneNumber: !!body.phoneNumber,
    });

    if (!body.email && !body.phoneNumber) {
      this.logger.warn('Identification attempt with no email or phone number');
      throw new BadRequestException(
        'Either email or phone number must be provided',
      );
    }

    const email = body.email ? body.email.trim().toLowerCase() : null;
    const phoneNumber = body.phoneNumber
      ? body.phoneNumber.replace(/\D/g, '')
      : null;

    try {
      const result = await this.contactService.identify({ email, phoneNumber });

      this.logger.log('Identification successful', {
        primaryContactId: result.contact.primaryContatctId,
      });

      return result;
    } catch (error) {
      this.logger.error('Identification failed', error.message, error.stack);
      throw error;
    }
  }
}
