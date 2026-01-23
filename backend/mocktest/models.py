"""
Mocktest App - Mock Test Platform Models

Design Decisions:
1. CustomUser is defined in accounts app (AUTH_USER_MODEL = 'accounts.CustomUser')
2. Unique constraints prevent duplicate test attempts per student
3. Scoring-safe: all calculations done at application level, stored values are immutable
4. Indexes on frequently queried fields (student, test, score, timestamp)
5. TextChoices for all categorical fields
6. JSONField only for flexible metadata (not core scoring data)
7. Proper related_name to avoid conflicts
8. Timestamps on all models for audit trail
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.db.models import Q
import hashlib
from accounts.models import CustomUser


class PhoneOTP(models.Model):
    """
    OTP for phone-based authentication.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='phone_otps',
        db_index=True,
        verbose_name='User'
    )
    otp_code = models.CharField(
        max_length=6,
        verbose_name='OTP Code'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Created At'
    )
    is_used = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Is Used'
    )
    expires_at = models.DateTimeField(
        db_index=True,
        verbose_name='Expires At'
    )

    class Meta:
        verbose_name = 'Phone OTP'
        verbose_name_plural = 'Phone OTPs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_used', '-created_at']),
        ]

    def __str__(self):
        return f"OTP for {self.user.email} - {self.otp_code}"


class DifficultyLevel(models.Model):
    """
    Difficulty levels for questions and tests.
    """
    class Level(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'
        VERY_HARD = 'very_hard', 'Very Hard'

    level = models.CharField(
        max_length=20,
        choices=Level.choices,
        unique=True,
        db_index=True,
        verbose_name='Difficulty Level'
    )
    order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name='Display Order',
        help_text='Lower numbers appear first'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Difficulty Level'
        verbose_name_plural = 'Difficulty Levels'
        ordering = ['order', 'level']

    def __str__(self):
        return self.get_level_display()


class Exam(models.Model):
    """
    Exam model for organizing tests and questions by exam type.
    """
    code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name='Exam Code',
        help_text='Unique code for the exam (e.g., jee_main, neet)'
    )
    name = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name='Exam Name',
        help_text='Display name (e.g., JEE Main, NEET)'
    )
    logo = models.URLField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Exam Logo'
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name='Is Active'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Exam'
        verbose_name_plural = 'Exams'
        ordering = ['name']

    def __str__(self):
        return self.name


class MockTest(models.Model):
    """
    Mock test definition.
    """
    class TestType(models.TextChoices):
        FULL_LENGTH = 'full_length', 'Full Length'
        PRACTICE = 'practice', 'Practice'
        SECTIONAL = 'sectional', 'Sectional'
        CUSTOM = 'custom', 'Custom'
        TOPIC_WISE = 'topic_wise', 'Topic Wise'

    title = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='Test Title'
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.PROTECT,
        related_name='mock_tests',
        db_index=True,
        null=True,
        blank=True,
        verbose_name='Exam',
        help_text='Exam this test belongs to'
    )
    test_type = models.CharField(
        max_length=30,
        choices=TestType.choices,
        db_index=True,
        verbose_name='Test Type'
    )
    total_questions = models.PositiveIntegerField(
        default=0,
        verbose_name='Total Questions'
    )
    marks_per_question = models.FloatField(
        default=4.0,
        validators=[MinValueValidator(0)],
        verbose_name='Marks Per Question'
    )
    negative_marks = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0)],
        verbose_name='Negative Marks Per Wrong Answer'
    )
    total_marks = models.FloatField(
        default=0.0,
        verbose_name='Total Marks',
        help_text='Auto-calculated: total_questions * marks_per_question'
    )
    duration_minutes = models.PositiveIntegerField(
        default=180,
        verbose_name='Duration (Minutes)'
    )
    difficulty = models.ForeignKey(
        DifficultyLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mock_tests',
        verbose_name='Difficulty Level'
    )
    is_vip = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='VIP Test',
        help_text='Requires premium subscription'
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name='Is Active'
    )
    instructions = models.TextField(
        blank=True,
        verbose_name='Test Instructions'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Mock Test'
        verbose_name_plural = 'Mock Tests'
        ordering = ['-created_at', 'title']
        indexes = [
            models.Index(fields=['is_vip', 'is_active']),
            models.Index(fields=['exam', 'test_type', 'is_active']),
        ]

    def save(self, *args, **kwargs):
        """Auto-calculate total_marks before saving."""
        # Calculate total_marks from actual questions in QuestionBank via MockTestQuestion
        # This ensures accuracy even if questions have different marks
        if self.pk:  # Only calculate if test already exists (has questions linked)
            from django.db.models import Sum
            total_from_questions = self.test_questions.aggregate(
                total=Sum('question__marks')
            )['total'] or 0.0
            
            if total_from_questions > 0:
                self.total_marks = total_from_questions
            elif not self.total_marks or self.total_marks == 0:
                # Fallback to formula if no questions linked yet
                self.total_marks = self.total_questions * self.marks_per_question
        else:
            # For new tests, use formula (questions will be linked after save)
            if not self.total_marks or self.total_marks == 0:
                self.total_marks = self.total_questions * self.marks_per_question
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.get_test_type_display()})"


class QuestionBank(models.Model):
    """
    Canonical question bank - stores unique questions reusable across multiple tests.
    
    This model eliminates duplicate questions by storing each unique question once.
    Questions are linked to mock tests via MockTestQuestion junction table.
    
    Migration Note: This replaces the pattern where Question had a ForeignKey to MockTest,
    which caused duplicate questions when the same question appeared in multiple tests.
    """
    class QuestionType(models.TextChoices):
        MCQ = 'mcq', 'Multiple Choice Question'
        INTEGER = 'integer', 'Integer Type'
        NUMERICAL = 'numerical', 'Numerical Value'

    question_type = models.CharField(
        max_length=30,
        choices=QuestionType.choices,
        default=QuestionType.MCQ,
        db_index=True,
        verbose_name='Question Type'
    )
    text = models.TextField(
        verbose_name='Question Text'
    )
    subject = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name='Subject'
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.PROTECT,
        related_name='question_bank_questions',
        db_index=True,
        null=True,
        blank=True,
        verbose_name='Exam',
        help_text='Exam this question belongs to'
    )
    year = models.PositiveIntegerField(
        db_index=True,
        blank=True,
        null=True,
        verbose_name='Year',
        help_text='Year of the question (e.g., 2021, 2022, 2023)'
    )
    option_a = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Option A'
    )
    option_b = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Option B'
    )
    option_c = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Option C'
    )
    option_d = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Option D'
    )
    correct_option = models.CharField(
        max_length=10,
        verbose_name='Correct Answer',
        help_text='A, B, C, D, or numerical value'
    )
    difficulty_level = models.ForeignKey(
        DifficultyLevel,
        on_delete=models.PROTECT,
        related_name='question_bank_questions',
        db_index=True,
        verbose_name='Difficulty Level'
    )
    topic = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name='Topic'
    )
    explanation = models.TextField(
        blank=True,
        verbose_name='Explanation'
    )
    marks = models.FloatField(
        default=4.0,
        validators=[MinValueValidator(0)],
        verbose_name='Marks',
        help_text='Marks for this question'
    )
    negative_marks = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0)],
        verbose_name='Negative Marks',
        help_text='Negative marks for wrong answer'
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name='Is Active',
        help_text='Soft delete flag - set to False to hide question without deleting'
    )
    question_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name='Question Hash',
        help_text='SHA256 hash of (text + exam_id + year + subject) for duplicate detection'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Question Bank'
        verbose_name_plural = 'Question Bank'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['exam', 'year']),
            models.Index(fields=['subject', 'difficulty_level']),
            models.Index(fields=['topic', 'subject']),
            models.Index(fields=['exam', 'year', 'subject']),
            models.Index(fields=['is_active', 'exam']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['question_hash'],
                name='unique_question_hash'
            )
        ]

    def save(self, *args, **kwargs):
        """Auto-generate question_hash before saving."""
        if not self.question_hash:
            exam_id = str(self.exam_id) if self.exam_id else ''
            year = str(self.year) if self.year else ''
            hash_string = f"{self.text}{exam_id}{year}{self.subject}"
            self.question_hash = hashlib.sha256(hash_string.encode()).hexdigest()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"QBank {self.id} - {self.subject} ({self.get_question_type_display()})"


class MockTestQuestion(models.Model):
    """
    Junction table linking MockTest to QuestionBank.
    
    This allows the same question to be reused across multiple tests without duplication.
    Questions are stored once in QuestionBank and linked to tests via this junction table.
    """
    mock_test = models.ForeignKey(
        MockTest,
        on_delete=models.CASCADE,
        related_name='test_questions',
        db_index=True,
        verbose_name='Mock Test'
    )
    question = models.ForeignKey(
        QuestionBank,
        on_delete=models.CASCADE,
        related_name='test_assignments',
        db_index=True,
        verbose_name='Question'
    )
    question_number = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Question Number',
        help_text='Position of this question in the test'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Mock Test Question'
        verbose_name_plural = 'Mock Test Questions'
        ordering = ['mock_test', 'question_number']
        indexes = [
            models.Index(fields=['mock_test', 'question_number']),
            models.Index(fields=['mock_test', 'question']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['mock_test', 'question_number'],
                name='unique_mocktestquestion_number_per_test'
            ),
            models.UniqueConstraint(
                fields=['mock_test', 'question'],
                name='unique_question_per_mocktest',
                # Allow same question to appear multiple times if needed
                # Remove this constraint if you want to allow duplicates in same test
            )
        ]

    def __str__(self):
        return f"{self.mock_test.title} - Q{self.question_number} (QBank {self.question.id})"


class StudentProfile(models.Model):
    """
    Extended profile for students.
    """
    class ClassLevel(models.TextChoices):
        CLASS_11 = 'class_11', 'Class 11'
        CLASS_12 = 'class_12', 'Class 12'
        DROPPER = 'dropper', 'Dropper'
        GRADUATE = 'graduate', 'Graduate'

    class ExamTarget(models.TextChoices):
        JEE_MAIN = 'jee_main', 'JEE Main'
        JEE_ADVANCED = 'jee_advanced', 'JEE Advanced'
        NEET = 'neet', 'NEET'
        EAPCET = 'eapcet', 'EAPCET'
        BITSAT = 'bitsat', 'BITSAT'
        OTHER = 'other', 'Other'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_profile',
        db_index=True,
        verbose_name='User'
    )
    class_level = models.CharField(
        max_length=20,
        choices=ClassLevel.choices,
        db_index=True,
        verbose_name='Class Level'
    )
    exam_target = models.CharField(
        max_length=30,
        choices=ExamTarget.choices,
        db_index=True,
        verbose_name='Exam Target'
    )
    target_rank = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='Target Rank',
        help_text='User\'s target rank/score goal'
    )
    tests_per_week = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name='Tests Per Week',
        help_text='User\'s preferred test frequency (e.g., "1-2 tests", "3-5 tests", "Daily practice")'
    )
    onboarding_completed = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Onboarding Completed',
        help_text='Whether user has completed the onboarding process'
    )
    total_xp = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name='Total XP'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Student Profile'
        verbose_name_plural = 'Student Profiles'
        ordering = ['-total_xp', 'user']

    def __str__(self):
        return f"{self.user.email} - {self.get_exam_target_display()}"


class TestAttempt(models.Model):
    """
    Student's attempt at a mock test.
    Unique constraint prevents duplicate attempts.
    """
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='test_attempts',
        db_index=True,
        verbose_name='Student'
    )
    mock_test = models.ForeignKey(
        MockTest,
        on_delete=models.PROTECT,
        related_name='test_attempts',
        db_index=True,
        verbose_name='Mock Test'
    )
    score = models.FloatField(
        default=0.0,
        db_index=True,
        verbose_name='Score'
    )
    percentage = models.FloatField(
        default=0.0,
        db_index=True,
        verbose_name='Percentage',
        help_text='(score / total_marks) * 100'
    )
    percentile = models.FloatField(
        default=0.0,
        db_index=True,
        verbose_name='Percentile'
    )
    correct_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Correct Answers'
    )
    wrong_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Wrong Answers'
    )
    unanswered_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Unanswered Questions'
    )
    started_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Started At'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Completed At'
    )
    is_completed = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Is Completed'
    )
    time_taken_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name='Time Taken (Seconds)'
    )
    test_mode = models.CharField(
        max_length=20,
        choices=[('preset', 'Preset'), ('custom', 'Custom')],
        default='preset',
        db_index=True,
        verbose_name='Test Mode',
        help_text='Whether this is a preset test or custom generated test'
    )
    generation_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Generation Config',
        help_text='Configuration used to generate custom tests (exam, years, subjects, etc.)'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Test Attempt'
        verbose_name_plural = 'Test Attempts'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['student', '-started_at']),
            models.Index(fields=['mock_test', '-score']),
            models.Index(fields=['is_completed', '-completed_at']),
            models.Index(fields=['student', 'mock_test', 'is_completed']),
        ]
        # Prevent duplicate attempts (can be relaxed if needed)
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'mock_test'],
                name='unique_test_attempt_per_student',
                condition=models.Q(is_completed=True)
            )
        ]

    def __str__(self):
        status = "Completed" if self.is_completed else "In Progress"
        return f"{self.student.user.email} - {self.mock_test.title} ({status})"


class StudentAnswer(models.Model):
    """
    Student's answer to a question in a test attempt.
    """
    attempt = models.ForeignKey(
        TestAttempt,
        on_delete=models.CASCADE,
        related_name='answers',
        db_index=True,
        verbose_name='Test Attempt'
    )
    question_bank = models.ForeignKey(
        QuestionBank,
        on_delete=models.PROTECT,
        related_name='student_answers',
        db_index=True,
        verbose_name='Question Bank'
    )
    selected_option = models.CharField(
        max_length=50,
        blank=True,
        verbose_name='Selected Answer',
        help_text='A, B, C, D, or numerical value'
    )
    is_correct = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Is Correct'
    )
    marks_obtained = models.FloatField(
        default=0.0,
        verbose_name='Marks Obtained',
        help_text='Positive for correct, negative for wrong, 0 for unanswered'
    )
    time_taken_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name='Time Taken (Seconds)'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Student Answer'
        verbose_name_plural = 'Student Answers'
        ordering = ['attempt']
        indexes = [
            models.Index(fields=['attempt', 'question_bank']),
            models.Index(fields=['attempt', 'is_correct']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['attempt', 'question_bank'],
                name='unique_answer_per_question_bank'
            )
        ]

    def get_question(self):
        """Helper method to get question."""
        return self.question_bank

    def __str__(self):
        return f"{self.attempt.student.user.email} - QBank {self.question_bank.id} ({'✓' if self.is_correct else '✗'})"


class MistakeNotebook(models.Model):
    """
    Tracks mistakes made by students for review.
    """
    class ErrorType(models.TextChoices):
        CONCEPTUAL = 'conceptual', 'Conceptual Error'
        CALCULATION = 'calculation', 'Calculation Error'
        SILLY = 'silly', 'Silly Mistake'
        TIME_PRESSURE = 'time_pressure', 'Time Pressure'
        NOT_ATTEMPTED = 'not_attempted', 'Not Attempted'

    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='mistakes',
        db_index=True,
        verbose_name='Student'
    )
    question_bank = models.ForeignKey(
        QuestionBank,
        on_delete=models.CASCADE,
        related_name='mistakes',
        db_index=True,
        verbose_name='Question Bank'
    )
    attempt = models.ForeignKey(
        TestAttempt,
        on_delete=models.CASCADE,
        related_name='mistakes',
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Test Attempt'
    )
    error_type = models.CharField(
        max_length=30,
        choices=ErrorType.choices,
        blank=True,
        db_index=True,
        verbose_name='Error Type'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Notes',
        help_text='Student notes about the mistake'
    )
    logged_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Logged At'
    )

    class Meta:
        verbose_name = 'Mistake Notebook Entry'
        verbose_name_plural = 'Mistake Notebook Entries'
        ordering = ['-logged_at']
        indexes = [
            models.Index(fields=['student', '-logged_at']),
            models.Index(fields=['student', 'error_type']),
            models.Index(fields=['question_bank', 'student']),
        ]

    def get_question(self):
        """Helper method to get question."""
        return self.question_bank

    def __str__(self):
        return f"{self.student.user.email} - Mistake QBank {self.question_bank.id} ({self.get_error_type_display()})"


class StudyGuild(models.Model):
    """
    Study groups/guilds for collaborative learning.
    """
    name = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name='Guild Name'
    )
    leader = models.ForeignKey(
        StudentProfile,
        on_delete=models.PROTECT,
        related_name='led_guilds',
        db_index=True,
        verbose_name='Guild Leader'
    )
    members = models.ManyToManyField(
        StudentProfile,
        related_name='guilds',
        blank=True,
        verbose_name='Members'
    )
    description = models.TextField(
        blank=True,
        verbose_name='Description'
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name='Is Active'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Study Guild'
        verbose_name_plural = 'Study Guilds'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['leader', 'is_active']),
        ]

    def is_unlocked(self):
        """Check if guild has minimum members (4) to unlock features."""
        return self.members.count() >= 4

    def __str__(self):
        member_count = self.members.count()
        return f"{self.name} ({member_count} members)"


class XPLog(models.Model):
    """
    Logs XP (experience points) earned by students.
    """
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='xp_logs',
        db_index=True,
        verbose_name='Student'
    )
    action = models.CharField(
        max_length=200,
        db_index=True,
        verbose_name='Action',
        help_text='Description of the action that earned XP'
    )
    xp_amount = models.PositiveIntegerField(
        db_index=True,
        verbose_name='XP Amount'
    )
    source_type = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name='Source Type',
        help_text='Type of source (test_completed, referral, etc.)'
    )
    source_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Source ID',
        help_text='ID of the source object'
    )
    logged_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Logged At'
    )

    class Meta:
        verbose_name = 'XP Log'
        verbose_name_plural = 'XP Logs'
        ordering = ['-logged_at']
        indexes = [
            models.Index(fields=['student', '-logged_at']),
            models.Index(fields=['student', 'source_type']),
        ]

    def __str__(self):
        return f"{self.student.user.email} - +{self.xp_amount} XP ({self.action})"


class Leaderboard(models.Model):
    """
    Leaderboard entries for students.
    Updated periodically via background tasks.
    """
    class LeaderboardType(models.TextChoices):
        OVERALL = 'overall', 'Overall'
        MONTHLY = 'monthly', 'Monthly'
        WEEKLY = 'weekly', 'Weekly'
        DAILY = 'daily', 'Daily'
        EXAM_SPECIFIC = 'exam_specific', 'Exam Specific'

    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='leaderboard_entries',
        db_index=True,
        verbose_name='Student'
    )
    leaderboard_type = models.CharField(
        max_length=20,
        choices=LeaderboardType.choices,
        default=LeaderboardType.OVERALL,
        db_index=True,
        verbose_name='Leaderboard Type'
    )
    period_start = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Period Start',
        help_text='Start date for period-based leaderboards'
    )
    period_end = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Period End',
        help_text='End date for period-based leaderboards'
    )
    total_score = models.FloatField(
        default=0.0,
        db_index=True,
        verbose_name='Total Score'
    )
    total_tests = models.PositiveIntegerField(
        default=0,
        verbose_name='Total Tests Completed'
    )
    average_score = models.FloatField(
        default=0.0,
        verbose_name='Average Score'
    )
    rank = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name='Rank'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        db_index=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Leaderboard Entry'
        verbose_name_plural = 'Leaderboard Entries'
        ordering = ['leaderboard_type', 'rank', 'total_score']
        indexes = [
            models.Index(fields=['leaderboard_type', 'rank']),
            models.Index(fields=['leaderboard_type', '-total_score']),
            models.Index(fields=['student', 'leaderboard_type']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'leaderboard_type', 'period_start', 'period_end'],
                name='unique_leaderboard_entry'
            )
        ]

    def __str__(self):
        return f"{self.student.user.email} - {self.get_leaderboard_type_display()} Rank {self.rank}"


class DailyFocus(models.Model):
    """
    Daily attendance/focus tracking for students.
    Marks a student as "Present" when they complete meaningful study activities.
    """
    class Status(models.TextChoices):
        PRESENT = 'present', 'Present'
        PARTIAL = 'partial', 'Partial'
    
    class Source(models.TextChoices):
        MOCK_TEST = 'mock_test', 'Mock Test'
        CUSTOM_TEST = 'custom_test', 'Custom Test'
        MISTAKE_REVIEW = 'mistake_review', 'Mistake Review'
    
    student = models.ForeignKey(
        StudentProfile,
        on_delete=models.CASCADE,
        related_name='daily_focus_records',
        db_index=True,
        verbose_name='Student'
    )
    date = models.DateField(
        db_index=True,
        verbose_name='Date',
        help_text='Date for this focus record'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
        db_index=True,
        verbose_name='Status'
    )
    source = models.CharField(
        max_length=30,
        choices=Source.choices,
        db_index=True,
        verbose_name='Source',
        help_text='What activity marked this day as present'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )
    
    class Meta:
        verbose_name = 'Daily Focus'
        verbose_name_plural = 'Daily Focus Records'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['student', '-date']),
            models.Index(fields=['student', 'date']),
            models.Index(fields=['date', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'date'],
                name='unique_daily_focus_per_student'
            )
        ]
    
    def __str__(self):
        return f"{self.student.user.email} - {self.date} ({self.get_status_display()})"



class Room(models.Model):
    """
    Tournament-style test room where multiple participants take the same test.
    """
    PUBLIC = "public"
    PRIVATE = "private"
    ROOM_PRIVACY_CHOICES = [
        (PUBLIC, "Public"),
        (PRIVATE, "Private"),
    ]

    class SubjectMode(models.TextChoices):
        SPECIFIC = "specific", "Specific Subjects"
        RANDOM = "random", "Random"

    class Difficulty(models.TextChoices):
        EASY = "easy", "Easy"
        MEDIUM = "medium", "Medium"
        HARD = "hard", "Hard"
        MIXED = "mixed", "Mixed"

    class QuestionTypeMix(models.TextChoices):
        MCQ = "mcq", "MCQ Only"
        INTEGER = "integer", "Integer Type Only"
        NUMERICAL = "numerical", "Numerical Type Only"
        MIXED = "mixed", "Mixed"

    class RandomizationMode(models.TextChoices):
        NONE = "none", "No Randomization"
        QUESTION_ORDER = "question_order", "Randomize Question Order"
        QUESTION_AND_OPTIONS = "question_and_options", "Randomize Questions & Options"

    class Status(models.TextChoices):
        WAITING = "waiting", "Waiting"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        LOCKED = "locked", "Locked"

    class AttemptMode(models.TextChoices):
        ALL_AT_ONCE = "ALL_AT_ONCE", "All at once"
        INDIVIDUAL = "INDIVIDUAL", "Individual"

    code = models.CharField(max_length=10, unique=True, db_index=True, verbose_name="Room Code")
    host = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="hosted_rooms",
        verbose_name="Host"
    )
    exam_id = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name="rooms",
        verbose_name="Exam"
    )
    
    # Subject selection
    subject_mode = models.CharField(
        max_length=20,
        choices=SubjectMode.choices,
        default=SubjectMode.RANDOM,
        verbose_name="Subject Selection Mode"
    )
    subjects = models.JSONField(
        default=list,
        blank=True,
        null=True,
        help_text="List of subjects/topics (used when subject_mode='specific')",
        verbose_name="Selected Subjects"
    )
    
    # Test configuration
    number_of_questions = models.PositiveIntegerField(
        default=10,
        verbose_name="Number of Questions"
    )
    time_per_question = models.FloatField(
        default=2.0,
        validators=[MinValueValidator(0.1)],
        help_text="Time per question in minutes (supports decimals like 1.5)",
        verbose_name="Time Per Question (minutes)"
    )
    duration = models.PositiveIntegerField(
        default=20,
        help_text="Total duration in minutes (auto-calculated: number_of_questions × time_per_question)",
        verbose_name="Total Duration (minutes)"
    )
    
    # Question filtering
    difficulty = models.CharField(
        max_length=20,
        choices=Difficulty.choices,
        default=Difficulty.MIXED,
        verbose_name="Difficulty Level"
    )
    question_types = models.JSONField(
        default=list,
        blank=True,
        null=True,
        help_text="List of question types to include (MCQ, INTEGER, NUMERICAL, etc.)",
        verbose_name="Question Types"
    )
    question_type_mix = models.CharField(
        max_length=20,
        choices=QuestionTypeMix.choices,
        default=QuestionTypeMix.MIXED,
        verbose_name="Question Type Mix"
    )
    
    # Randomization
    randomization_mode = models.CharField(
        max_length=30,
        choices=RandomizationMode.choices,
        default=RandomizationMode.QUESTION_ORDER,
        verbose_name="Randomization Mode"
    )
    
    # Room settings
    privacy = models.CharField(
        max_length=10,
        choices=ROOM_PRIVACY_CHOICES,
        default=PUBLIC,
        verbose_name="Privacy"
    )
    password_hash = models.CharField(
        max_length=128,
        blank=True,
        null=True,
        verbose_name="Password Hash"
    )
    participant_limit = models.PositiveIntegerField(
        default=0,
        help_text="0 = unlimited",
        verbose_name="Participant Limit"
    )
    allow_pause = models.BooleanField(
        default=False,
        help_text="Allow participants to pause the test",
        verbose_name="Allow Pause"
    )
    
    # Timing
    start_time = models.DateTimeField(
        verbose_name="Start Time"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.WAITING,
        db_index=True,
        verbose_name="Status"
    )
    
    # Attempt mode
    attempt_mode = models.CharField(
        max_length=20,
        choices=AttemptMode.choices,
        default=AttemptMode.ALL_AT_ONCE,
        verbose_name="Attempt Mode"
    )
    
    # Legacy field (kept for backward compatibility)
    topics = models.JSONField(blank=True, null=True, verbose_name="Topics")

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        verbose_name = "Room"
        verbose_name_plural = "Rooms"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['status', 'start_time']),
            models.Index(fields=['host', 'status']),
        ]

    def save(self, *args, **kwargs):
        """Auto-calculate duration before saving."""
        if self.number_of_questions and self.time_per_question:
            self.duration = int(self.number_of_questions * self.time_per_question)
        super().save(*args, **kwargs)

    def is_full(self):
        """Check if room has reached participant limit."""
        if self.participant_limit == 0:
            return False
        active_participants = self.participants.filter(status=RoomParticipant.JOINED).count()
        return active_participants >= self.participant_limit

    def can_be_edited(self):
        """Check if room configuration can be edited."""
        return self.status == self.Status.WAITING and self.participants.filter(status=RoomParticipant.JOINED).count() == 0

    def is_expired(self):
        """Check if room has expired (24 hours after creation)."""
        from datetime import timedelta
        return timezone.now() > self.created_at + timedelta(hours=24)

    def __str__(self):
        return f"{self.code} ({self.get_privacy_display()}) - {self.get_status_display()}"

class RoomParticipant(models.Model):
    """
    Participant in a test room.
    """
    JOINED = "joined"
    LEFT = "left"
    KICKED = "kicked"

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="participants",
        verbose_name="Room"
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="joined_rooms",
        verbose_name="User"
    )
    joined_at = models.DateTimeField(auto_now_add=True, verbose_name="Joined At")
    status = models.CharField(
        max_length=10,
        choices=[(JOINED, "Joined"), (LEFT, "Left"), (KICKED, "Kicked")],
        default=JOINED,
        db_index=True,
        verbose_name="Status"
    )
    randomization_seed = models.IntegerField(
        null=True,
        blank=True,
        help_text="Random seed for question/option randomization per participant",
        verbose_name="Randomization Seed"
    )
    participant_start_time = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When this participant started the test (for INDIVIDUAL mode)",
        verbose_name="Participant Start Time"
    )

    class Meta:
        verbose_name = "Room Participant"
        verbose_name_plural = "Room Participants"
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(
                fields=['room', 'user'],
                condition=models.Q(status='joined'),
                name='unique_active_participant_per_room'
            )
        ]
        indexes = [
            models.Index(fields=['room', 'status']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"{self.user.email} in {self.room.code} ({self.get_status_display()})"


class RoomQuestion(models.Model):
    """
    Questions selected for a room.
    Stores the questions that will be used in the room test.
    """
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="room_questions",
        verbose_name="Room"
    )
    question_bank = models.ForeignKey(
        QuestionBank,
        on_delete=models.CASCADE,
        related_name="room_questions",
        verbose_name="Question Bank"
    )
    question_number = models.PositiveIntegerField(
        verbose_name="Question Number",
        help_text="Order of question in the room test"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")

    class Meta:
        verbose_name = "Room Question"
        verbose_name_plural = "Room Questions"
        ordering = ['question_number']
        unique_together = [['room', 'question_number']]
        indexes = [
            models.Index(fields=['room', 'question_number']),
            models.Index(fields=['room', 'question_bank']),
        ]

    def get_question(self):
        """Helper method to get question."""
        return self.question_bank

    def __str__(self):
        return f"Room {self.room.code} - Q{self.question_number}"


class ParticipantAttempt(models.Model):
    """
    Participant's attempt/answers for a room test.
    Stores answers, timing, and scoring for each participant.
    """
    participant = models.ForeignKey(
        RoomParticipant,
        on_delete=models.CASCADE,
        related_name="attempts",
        verbose_name="Participant"
    )
    room_question = models.ForeignKey(
        RoomQuestion,
        on_delete=models.CASCADE,
        related_name="attempts",
        verbose_name="Room Question"
    )
    selected_option = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Selected answer option (A, B, C, D, etc.)",
        verbose_name="Selected Option"
    )
    answer_text = models.TextField(
        blank=True,
        null=True,
        help_text="Text answer for non-MCQ questions",
        verbose_name="Answer Text"
    )
    is_correct = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether the answer is correct (calculated after submission)",
        verbose_name="Is Correct"
    )
    marks_obtained = models.FloatField(
        default=0.0,
        help_text="Marks obtained for this question",
        verbose_name="Marks Obtained"
    )
    time_spent_seconds = models.PositiveIntegerField(
        default=0,
        help_text="Time spent on this question in seconds",
        verbose_name="Time Spent (seconds)"
    )
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When participant started answering this question",
        verbose_name="Started At"
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When participant submitted answer",
        verbose_name="Submitted At"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Created At")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Updated At")

    class Meta:
        verbose_name = "Participant Attempt"
        verbose_name_plural = "Participant Attempts"
        ordering = ['room_question__question_number']
        unique_together = [['participant', 'room_question']]
        indexes = [
            models.Index(fields=['participant', 'room_question']),
            models.Index(fields=['participant', 'is_correct']),
        ]

    def __str__(self):
        return f"{self.participant.user.email} - Q{self.room_question.question_number} - {self.room_question.room.code}"
