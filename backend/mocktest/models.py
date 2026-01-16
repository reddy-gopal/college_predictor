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
        if not self.total_marks or self.total_marks == 0:
            self.total_marks = self.total_questions * self.marks_per_question
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.get_test_type_display()})"


class Question(models.Model):
    """
    Question in a mock test.
    """
    class QuestionType(models.TextChoices):
        MCQ = 'mcq', 'Multiple Choice Question'
        INTEGER = 'integer', 'Integer Type'
        NUMERICAL = 'numerical', 'Numerical Value'

    mock_test = models.ForeignKey(
        MockTest,
        on_delete=models.CASCADE,
        related_name='questions',
        db_index=True,
        null=True,
        blank=True,
        verbose_name='Mock Test',
        help_text='Mock test this question belongs to (null for standalone questions in question bank)'
    )
    question_number = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Question Number',
        help_text='Position in the test'
    )
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
        related_name='questions',
        db_index=True,
        null=True,
        blank=True,
        verbose_name='Exam',
        help_text='Exam this question belongs to (required for new questions)'
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
        related_name='questions',
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
        help_text='Marks for this question (can override test default)'
    )
    negative_marks = models.FloatField(
        default=1.0,
        validators=[MinValueValidator(0)],
        verbose_name='Negative Marks',
        help_text='Negative marks for wrong answer (can override test default)'
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
        verbose_name = 'Question'
        verbose_name_plural = 'Questions'
        ordering = ['mock_test', 'question_number']
        indexes = [
            models.Index(fields=['mock_test', 'question_number']),
            models.Index(fields=['subject', 'difficulty_level']),
            models.Index(fields=['topic', 'subject']),
            models.Index(fields=['exam', 'year']),
            models.Index(fields=['exam', 'year', 'subject']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['mock_test', 'question_number'],
                name='unique_question_number_per_test'
            )
        ]

    def __str__(self):
        test_title = self.mock_test.title if self.mock_test else "Standalone"
        return f"Q{self.question_number} - {self.subject} ({test_title})"


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
    question = models.ForeignKey(
        Question,
        on_delete=models.PROTECT,
        related_name='student_answers',
        db_index=True,
        verbose_name='Question'
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
        ordering = ['attempt', 'question__question_number']
        indexes = [
            models.Index(fields=['attempt', 'question']),
            models.Index(fields=['attempt', 'is_correct']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['attempt', 'question'],
                name='unique_answer_per_question'
            )
        ]

    def __str__(self):
        return f"{self.attempt.student.user.email} - Q{self.question.question_number} ({'✓' if self.is_correct else '✗'})"


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
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='mistakes',
        db_index=True,
        verbose_name='Question'
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
            models.Index(fields=['question', 'student']),
        ]

    def __str__(self):
        return f"{self.student.user.email} - Mistake Q{self.question.question_number} ({self.get_error_type_display()})"


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
