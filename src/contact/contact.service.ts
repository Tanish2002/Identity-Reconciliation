import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  async identify(createContactDto: CreateContactDto) {
    return 'Do logic here';
  }
}
