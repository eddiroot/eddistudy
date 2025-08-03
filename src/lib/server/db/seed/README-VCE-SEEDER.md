# VCE Curriculum Data Seeder

This module provides comprehensive seeding functionality for VCE (Victorian Certificate of Education) curriculum data into the eddistudy database.

## Features

### 🎯 **Automated Data Processing**
- Processes all VCE subject JSON files from `data/vcaa-vce-data/`
- Creates proper relational structures with foreign key relationships
- Handles curriculum subjects, learning areas, outcomes, and assessments

### 📊 **Sequential Indexing**
- **Key Knowledge**: Automatically indexed 1, 2, 3... within each outcome
- **Key Skills**: Automatically indexed 1, 2, 3... within each outcome
- Enables easy referencing: "Apply Key Knowledge item 3" or "Use Key Skills 1 and 2"

### 🔗 **Relational Mapping**
- Creates proper many-to-many relationships using junction tables
- Maps learning activities to key knowledge and key skills
- Links sample assessments to outcomes and learning areas

## Usage

### Run VCE Seeder Only
```bash
npm run db:seed:vce
```

### Run Full Database Seed (includes VCE data)
```bash
npm run db:seed
```

### Run Seeder Programmatically
```typescript
import { seedVCECurriculumData } from './vce-curriculum-seeder';

await seedVCECurriculumData();
```

## Data Structure

### Input JSON Format
Each VCE subject file should contain:
```json
{
  "id": 18000,
  "name": "Accounting Units 1 and 2",
  "learningAreas": [...],
  "outcomes": [
    {
      "id": 18000,
      "number": 1,
      "description": "...",
      "keyKnowledge": [
        { "description": "...", "outcomeId": 18000 }
      ],
      "keySkills": [
        { "description": "...", "outcomeId": 18000 }
      ]
    }
  ],
  "extracontents": [...],
  "activities": [...],
  "examples": [...],
  "tasks": [...]
}
```

### Database Tables Created
- `curriculum` - VCE curriculum record
- `curriculum_subject` - Individual subjects (Accounting, Biology, etc.)
- `learning_area` - Areas of study (U1AOS1, U1AOS2, etc.)
- `outcome` - Learning outcomes
- `key_knowledge` - **Indexed knowledge items** (number: 1, 2, 3...)
- `key_skill` - **Indexed skill items** (number: 1, 2, 3...)
- `extra_content` - Definitions, methods, characteristics
- `curriculum_learning_activity` - Learning activities
- `detailed_example` - Detailed examples
- `sample_assessment` - Sample assessments/tasks

## Key Features

### 🔢 **Sequential Indexing System**
Key knowledge and key skills are automatically indexed for easy referencing:

```typescript
// Get indexed key knowledge and skills
const { keyKnowledge, keySkills } = await getIndexedKeyKnowledgeAndSkills(
  outcomeId, 
  curriculumSubjectId
);

// Reference specific items by index
const keyKnowledge3 = await getKeyKnowledgeByIndex(3, outcomeId);
const keySkill1 = await getKeySkillByIndex(1, outcomeId);
```

### 📚 **Content Types**
Supports various VCE content types:
- **Activities**: Curriculum learning activities
- **Examples**: Detailed examples with titles
- **Tasks**: Sample assessments and tasks
- **Extra Content**: Definitions, methods, characteristics

### 🛡️ **Data Integrity**
- Handles duplicate prevention with `onConflictDoNothing()`
- Validates enum types for extra content
- Creates proper foreign key relationships
- Transaction-safe processing

## API Reference

### Core Functions

#### `seedVCECurriculumData()`
Main seeding function that processes all VCE JSON files.

#### `getIndexedKeyKnowledgeAndSkills(outcomeId?, curriculumSubjectId?)`
Returns key knowledge and skills with their indexed numbers.

#### `getKeyKnowledgeByIndex(index, outcomeId?, curriculumSubjectId?)`
Gets specific key knowledge item by its index number.

#### `getKeySkillByIndex(index, outcomeId?, curriculumSubjectId?)`
Gets specific key skill item by its index number.

### Query Examples

```typescript
// Get all key knowledge for an outcome
const outcome1Knowledge = await getIndexedKeyKnowledgeAndSkills(18000);

// Get key knowledge item #3 for accounting subject
const accounting = await getKeyKnowledgeByIndex(3, undefined, 18000);

// Get key skill #1 for specific outcome
const skill = await getKeySkillByIndex(1, 18000);
```

## File Structure

```
src/lib/server/db/seed/
├── vce-curriculum-seeder.ts      # Main seeder logic
├── run-vce-seeder.ts            # Standalone script runner
└── README-VCE-SEEDER.md         # This documentation

data/vcaa-vce-data/
├── accounting12.json
├── biology12.json
├── chemistry12.json
└── [other VCE subjects...]
```

## Development Notes

### Adding New VCE Subjects
1. Add JSON file to `data/vcaa-vce-data/`
2. Follow the established JSON schema
3. Run `npm run db:seed:vce`

### Index Numbering
- Key knowledge and skills are numbered sequentially within each outcome
- Numbers start from 1 (not 0)
- Perfect for curriculum referencing: "Complete Key Knowledge items 1-3"

### Error Handling
- Comprehensive error logging
- Graceful handling of missing fields
- Transaction rollback on failures

## Integration

This seeder integrates with:
- Main database seeding (`db:seed`)
- Drizzle ORM schema
- VCE curriculum JSON data structure
- eddistudy relational database design

Perfect for maintaining VCE curriculum data with proper indexing and relational integrity! 🎓
