import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { Repository } from 'typeorm';

export interface IdentifyResponse {
  contact: {
    primaryContatctId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
}

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}
  async identify(payload: CreateContactDto): Promise<IdentifyResponse> {
    const { email, phoneNumber } = payload;

    const matches = await this.contactRepository.find({
      where: [{ email: email || null }, { phoneNumber: phoneNumber || null }],
      order: { createdAt: 'ASC' },
    });

    // If no matches create new contact with linkPrecedence primary
    if (matches.length === 0) {
      const newContact = this.contactRepository.create({
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      });
      const savedContact = await this.contactRepository.save(newContact);

      return {
        contact: {
          primaryContatctId: savedContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      };
    }

    // find primary contact from all matches
    const primaryContact =
      matches.find((c) => c.linkPrecedence === 'primary') ||
      matches.reduce((oldest, current) =>
        oldest.createdAt < current.createdAt ? oldest : current,
      );

    // mark other contacts as secondary
    const otherContacts = matches.filter((c) => c.id !== primaryContact.id);
    for (const contact of otherContacts) {
      if (
        contact.linkPrecedence !== 'secondary' ||
        contact.linkedId !== primaryContact.id
      ) {
        contact.linkedId = primaryContact.id;
        contact.linkPrecedence = 'secondary';
        await this.contactRepository.save(contact);
      }
    }

    const existingEmails = matches.map((c) => c.email).filter(Boolean);
    const existingPhoneNumbers = matches
      .map((c) => c.phoneNumber)
      .filter(Boolean);

    if (
      (email && !existingEmails.includes(email)) ||
      (phoneNumber && !existingPhoneNumbers.includes(phoneNumber))
    ) {
      const newSecondaryContact = this.contactRepository.create({
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary',
      });
      await this.contactRepository.save(newSecondaryContact);
      otherContacts.push(newSecondaryContact);
    }

    const emails = Array.from(
      new Set([
        primaryContact.email,
        ...otherContacts.map((c) => c.email).filter(Boolean),
      ]),
    );

    const phoneNumbers = Array.from(
      new Set([
        primaryContact.phoneNumber,
        ...otherContacts.map((c) => c.phoneNumber).filter(Boolean),
      ]),
    );

    return {
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: otherContacts.map((c) => c.id),
      },
    };
  }
}
