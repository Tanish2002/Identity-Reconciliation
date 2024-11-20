import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Contact } from './entities/contact.entity';
import { EntityManager, Repository } from 'typeorm';

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

    return this.contactRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Find existing contacts
        const existingContacts = await this.findExistingContacts(
          transactionalEntityManager,
          email,
          phoneNumber,
        );

        // no data found, create new primary contact
        if (existingContacts.length === 0) {
          return this.createNewPrimaryContact(
            transactionalEntityManager,
            email,
            phoneNumber,
          );
        }

        const primaryContact = await this.determinePrimaryContact(
          transactionalEntityManager,
          existingContacts,
        );

        const updatedContacts = await this.processContactLinking(
          transactionalEntityManager,
          primaryContact,
          existingContacts,
          email,
          phoneNumber,
        );

        // Save updated contacts
        if (updatedContacts.length > 0) {
          await transactionalEntityManager.save(updatedContacts);
        }

        // fetch all linked contacts, I did do all the processing above so I could use that but this seems more robust.
        const linkedContacts = await this.fetchLinkedContacts(
          transactionalEntityManager,
          primaryContact,
        );

        return this.buildIdentityResponse(primaryContact, linkedContacts);
      },
    );
  }

  private async findExistingContacts(
    entityManager: EntityManager,
    email?: string,
    phoneNumber?: string,
  ): Promise<Contact[]> {
    return entityManager.find(Contact, {
      where: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  // find a primary contact from all matches if not found (shouldn't happend tbh) mark oldest contact as primary
  private async determinePrimaryContact(
    entityManager: EntityManager,
    contacts: Contact[],
  ): Promise<Contact> {
    let primaryContact = contacts.find((c) => c.linkPrecedence === 'primary');

    // if no primary contact then find the linked primary contact from secondary
    if (!primaryContact) {
      // not really neccessary ig. could just pick anyone
      const oldestSecondaryContact = contacts.reduce((oldest, current) =>
        oldest.createdAt <= current.createdAt ? oldest : current,
      );
      primaryContact = await entityManager.findOne(Contact, {
        where: [{ id: oldestSecondaryContact.linkedId }],
      });
    }

    return primaryContact;
  }

  private async processContactLinking(
    entityManager: EntityManager,
    primaryContact: Contact,
    existingContacts: Contact[],
    email?: string,
    phoneNumber?: string,
  ): Promise<Contact[]> {
    const updatedContacts: Contact[] = [];

    // mark other contacts as secondary
    const secondaryContacts = existingContacts.filter(
      (c) => c.id !== primaryContact.id,
    );
    for (const contact of secondaryContacts) {
      if (
        contact.linkPrecedence !== 'secondary' ||
        contact.linkedId !== primaryContact.id
      ) {
        contact.linkedId = primaryContact.id;
        contact.linkPrecedence = 'secondary';
        updatedContacts.push(contact);
      }
    }

    // Check if new contact information needs to be added
    const existingEmails = new Set(
      existingContacts.map((c) => c.email).filter(Boolean),
    );
    const existingPhoneNumbers = new Set(
      existingContacts.map((c) => c.phoneNumber).filter(Boolean),
    );

    const isNewEmail = email && !existingEmails.has(email);
    const isNewPhoneNumber =
      phoneNumber && !existingPhoneNumbers.has(phoneNumber);

    // Create new secondary contact if needed
    if (isNewEmail || isNewPhoneNumber) {
      const newSecondaryContact = entityManager.create(Contact, {
        email,
        phoneNumber,
        linkedId: primaryContact.id,
        linkPrecedence: 'secondary',
      });
      updatedContacts.push(newSecondaryContact);
    }

    return updatedContacts;
  }

  private async fetchLinkedContacts(
    entityManager: EntityManager,
    primaryContact: Contact,
  ): Promise<Contact[]> {
    return entityManager.find(Contact, {
      where: [{ id: primaryContact.id }, { linkedId: primaryContact.id }],
      order: { createdAt: 'ASC' },
    });
  }

  private buildIdentityResponse(
    primaryContact: Contact,
    linkedContacts: Contact[],
  ): IdentifyResponse {
    const emails = Array.from(
      new Set(linkedContacts.map((c) => c.email).filter(Boolean)),
    );
    const phoneNumbers = Array.from(
      new Set(linkedContacts.map((c) => c.phoneNumber).filter(Boolean)),
    );

    return {
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: linkedContacts
          .filter((c) => c.id !== primaryContact.id)
          .map((c) => c.id),
      },
    };
  }

  private async createNewPrimaryContact(
    entityManager: EntityManager,
    email?: string,
    phoneNumber?: string,
  ): Promise<IdentifyResponse> {
    const newContact = entityManager.create(Contact, {
      email,
      phoneNumber,
      linkPrecedence: 'primary',
    });

    const savedContact = await entityManager.save(newContact);

    return {
      contact: {
        primaryContatctId: savedContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: [],
      },
    };
  }
}
