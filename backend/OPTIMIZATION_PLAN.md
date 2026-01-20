# Question Optimization Plan

## Problem Statement
Currently, the system stores duplicate questions when the same question appears in multiple mock tests. For example, if you have 10 unique questions but they appear in 2 different tests, you end up with 20 question records instead of 10.

## Root Cause
The `Question` model has a ForeignKey to `MockTest`, which creates a one-to-many relationship. When the same question is used in multiple tests, it gets duplicated because each question must belong to a specific test.

## Solution: Question Bank Pattern with Many-to-Many Relationship

### Architecture Overview
1. **QuestionBank** - Stores unique questions (no mock_test FK)
2. **MockTestQuestion** - Junction table linking questions to tests with question numbers
3. **Question** - Keep for backward compatibility during migration, but deprecate

---

## Models to Change

### 1. Create New Model: `QuestionBank`
**Purpose**: Store unique questions that can be reused across multiple tests

**Fields**:
- `id` (auto)
- `question_type` (CharField) - MCQ, INTEGER, NUMERICAL
- `text` (TextField) - Question text
- `subject` (CharField)
- `exam` (ForeignKey to Exam)
- `year` (PositiveIntegerField, nullable)
- `option_a`, `option_b`, `option_c`, `option_d` (CharField, nullable)
- `correct_option` (CharField)
- `difficulty_level` (ForeignKey to DifficultyLevel)
- `topic` (CharField, nullable)
- `explanation` (TextField, nullable)
- `marks` (FloatField, default=4.0)
- `negative_marks` (FloatField, default=1.0)
- `created_at` (DateTimeField)
- `updated_at` (DateTimeField)
- `is_active` (BooleanField, default=True) - Soft delete

**Meta**:
- Unique constraint on (`text`, `exam`, `year`) to prevent exact duplicates
- Indexes on: `exam`, `year`, `subject`, `difficulty_level`, `topic`, `is_active`

---

### 2. Create New Model: `MockTestQuestion`
**Purpose**: Junction table linking questions to mock tests with ordering

**Fields**:
- `id` (auto)
- `mock_test` (ForeignKey to MockTest)
- `question` (ForeignKey to QuestionBank)
- `question_number` (PositiveIntegerField) - Position in the test
- `created_at` (DateTimeField)

**Meta**:
- Unique constraint on (`mock_test`, `question_number`)
- Unique constraint on (`mock_test`, `question`) - Prevent same question twice in one test
- Indexes on: `mock_test`, `question`, (`mock_test`, `question_number`)

---

### 3. Modify Existing Model: `Question`
**Purpose**: Keep for backward compatibility, mark as deprecated

**Changes**:
- Add `deprecated` field (BooleanField, default=True)
- Add `question_bank_ref` (ForeignKey to QuestionBank, nullable) - Link to QuestionBank if migrated
- Keep all existing fields for backward compatibility
- Add migration note in docstring

---

### 4. Update Related Models

#### `StudentAnswer`
- Change `question` ForeignKey from `Question` to `QuestionBank`
- OR keep both: `question` (Question, nullable) and `question_bank` (QuestionBank, nullable)
- Add logic to handle both during transition

#### `MistakeNotebook`
- Change `question` ForeignKey from `Question` to `QuestionBank`
- OR keep both for transition period

#### `RoomQuestion`
- Change `question` ForeignKey from `Question` to `QuestionBank`
- This already uses a junction pattern, so minimal changes needed

---

## Migration Strategy

### Phase 1: Add New Models (Non-Breaking)
1. Create `QuestionBank` model
2. Create `MockTestQuestion` model
3. Add `deprecated` and `question_bank_ref` fields to `Question`
4. Run migrations

### Phase 2: Data Migration
1. Identify unique questions from `Question` table
   - Group by: `text`, `exam_id`, `year`, `subject`, `correct_option`
2. Create `QuestionBank` entries for unique questions
3. Link existing `Question` records to `QuestionBank` via `question_bank_ref`
4. Create `MockTestQuestion` entries for all test-question relationships
5. Verify data integrity

### Phase 3: Update Code (Gradual)
1. Update views to use `QuestionBank` and `MockTestQuestion`
2. Update serializers
3. Update room services
4. Update test generation logic
5. Keep `Question` queries working for backward compatibility

### Phase 4: Cleanup (After Full Migration)
1. Update all ForeignKeys from `Question` to `QuestionBank`
2. Remove deprecated `Question` model (or keep as archive)
3. Remove `question_bank_ref` field

---

## Code Changes Required

### Views to Update:
1. `generate_test()` - Use QuestionBank instead of duplicating questions
2. `generate_custom_test()` - Use QuestionBank instead of duplicating questions
3. `generate_test_from_mistakes()` - Use QuestionBank instead of duplicating questions
4. All question listing endpoints - Query QuestionBank via MockTestQuestion
5. Room question generation - Already uses junction pattern, minimal changes

### Serializers to Update:
1. Question serializers - Handle both Question and QuestionBank during transition
2. MockTest serializers - Include questions via MockTestQuestion relationship

### Services to Update:
1. `room_services.py` - Update to use QuestionBank
2. Question filtering logic - Update to query QuestionBank

---

## Benefits After Optimization

1. **Storage Reduction**: 10 unique questions = 10 records (not 20, 30, etc.)
2. **Data Consistency**: Update question once, reflects everywhere
3. **Better Analytics**: Track question performance across all tests
4. **Easier Question Management**: Single source of truth for questions
5. **Faster Queries**: Smaller question table, better indexing

---

## Backward Compatibility

During migration:
- Keep `Question` model functional
- Support both old and new patterns
- Gradual migration of views/services
- No breaking changes to API during transition

---

## Example Query After Migration

**Before (Current)**:
```python
# Gets all questions, including duplicates
questions = Question.objects.filter(mock_test_id=20)
```

**After (Optimized)**:
```python
# Gets unique questions via junction table
mock_test = MockTest.objects.get(id=20)
questions = QuestionBank.objects.filter(
    mocktestquestion__mock_test=mock_test
).order_by('mocktestquestion__question_number')
```

---

## Estimated Impact

- **Storage**: Reduce by ~50-80% depending on question reuse
- **Query Performance**: Improve by 20-30% (smaller table, better indexes)
- **Data Integrity**: Significantly improved (single source of truth)
- **Development Time**: 2-3 days for full migration

---

## Notes

- Consider adding a `question_hash` field to QuestionBank for faster duplicate detection
- Add soft delete (`is_active`) to QuestionBank for question management
- Consider versioning if questions need to be updated but old tests should keep old version
- Add admin interface for QuestionBank management

