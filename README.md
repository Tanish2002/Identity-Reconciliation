# Bitespeed Backend Task: Identity Reconciliation

## Overview
The goal of this project is to link and track client IDs across many purchases by implementing an identity reconciliation service for FluxKart.com. Even when clients make transactions using different phone numbers or email addresses, the program helps keep a single customer profile.

## Problem Statement
FluxKart.com needs to identify and track customers across multiple purchases, even when they use different contact information. The challenge is to:
- Link orders with different contact information to the same customer
- Maintain a hierarchy of primary and secondary contact records
- Provide a consolidated view of customer contact information

## Solution
The solution implements a REST API endpoint that:
- Receives customer contact information (email and/or phone number)
- Identifies existing customer records
- Links related contact information
- Returns consolidated customer data

### Key Features
- Contact identification and linking
- Primary/secondary contact management
- Transaction-based data consistency
- Flexible handling of partial contact information

## Technical Implementation

### Architecture
- Framework: NestJS with TypeScript
- Database: PostgreSQL with TypeORM
- Architecture: Repository pattern with service layer

### Data Model
```typescript
@Entity()
export class Contact {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  linkedId: number;

  @Column({
    type: 'enum',
    enum: ['primary', 'secondary'],
    default: 'primary',
  })
  linkPrecedence: 'primary' | 'secondary';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deletedAt: Date;
}
```

### API Endpoint

#### POST /identify
Identifies and consolidates customer contact information.

**Request Format:**
```json
{
  "email": "example@email.com",
  "phoneNumber": "1234567890"
}
```

**Response Format:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["example@email.com"],
    "phoneNumbers": ["1234567890"],
    "secondaryContactIds": []
  }
}
```

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn or bun
- PostgreSQL (or your preferred SQL database)

### Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/identity-reconciliation.git
   ```

2. Install dependencies:
   ```bash
   cd identity-reconciliation
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp .envrc.example .envrc
   # Edit .envrc with your database credentials
   # if you don't use direnv you'll have to manually add all variables to your current shell scope
   ```

4. Start the server:
   ```bash
   bun run build && bun run start:prod
   ```

## Usage Examples

### Creating a New Contact
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'
```

### Linking an Existing Contact
```bash
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

## Implementation Details

### Contact Linking Logic
1. **New Contact Creation:**
   - Creates a primary contact when no matching records exist
   - Assigns primary status to the first contact

2. **Contact Linking:**
   - Links contacts based on matching email or phone number
   - Maintains the oldest contact as primary
   - Creates secondary contacts for new information

3. **Response Generation:**
   - Fetches all linked contact information
   - Returns primary contact ID and all associated information

## Live Demo
The API is hosted at: `https://identity-reconciliation-lcw3.onrender.com/identify`

## Future Improvements
- Add caching layer for frequently accessed contacts
- Implement bulk contact reconciliation
- Enhance validation and error handling
- Add rate limiting and security measures
