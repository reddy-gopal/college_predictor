"""
Predictor App - College Prediction Models

Design Decisions:
1. Normalized structure: Exam → College → Course → Cutoff (proper 3NF)
2. TextChoices for all categorical fields (type-safe, admin-friendly)
3. Indexes on rank fields for fast range queries (opening_rank, closing_rank)
4. Prediction stores input snapshot + output JSON (audit trail + flexibility)
5. ScoreToRank uses ranges for interpolation queries
6. All CharFields avoid null=True unless absolutely necessary
7. Related names follow pattern: model_name_set (e.g., exam_cutoffs)
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Exam(models.Model):
    """
    Represents an entrance exam (JEE Main, NEET, etc.)
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        verbose_name='Exam Name'
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        verbose_name='Exam Code',
        help_text='Short code for the exam (e.g., JEE_MAIN, NEET)'
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
        indexes = [
            models.Index(fields=['is_active', 'name']),
        ]

    def __str__(self):
        return self.name


class College(models.Model):
    """
    Represents a college/university.
    """
    class CollegeType(models.TextChoices):
        PRIVATE = 'private', 'Private'
        GOVERNMENT = 'government', 'Government'
        AUTONOMOUS = 'autonomous', 'Autonomous'
        DEEMED = 'deemed', 'Deemed University'

    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='College Name'
    )
    code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        db_index=True,
        verbose_name='College Code'
    )
    location = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='Location'
    )
    state = models.CharField(
        max_length=100,
        db_index=True,
        verbose_name='State'
    )
    college_type = models.CharField(
        max_length=20,
        choices=CollegeType.choices,
        default=CollegeType.PRIVATE,
        db_index=True,
        verbose_name='College Type'
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
        verbose_name = 'College'
        verbose_name_plural = 'Colleges'
        ordering = ['name']
        indexes = [
            models.Index(fields=['state', 'college_type']),
            models.Index(fields=['is_active', 'name']),
        ]

    def __str__(self):
        return f"{self.name}, {self.location}"


class Course(models.Model):
    """
    Represents a course offered by a college.
    """
    class DegreeType(models.TextChoices):
        BTECH = 'btech', 'B.Tech'
        MTECH = 'mtech', 'M.Tech'
        BSC = 'bsc', 'B.Sc'
        MSC = 'msc', 'M.Sc'
        BA = 'ba', 'B.A'
        MA = 'ma', 'M.A'
        MBA = 'mba', 'MBA'
        PHD = 'phd', 'Ph.D'

    class BranchType(models.TextChoices):
        CSE = 'cse', 'Computer Science and Engineering'
        ECE = 'ece', 'Electronics and Communication Engineering'
        EEE = 'eee', 'Electrical and Electronics Engineering'
        ME = 'me', 'Mechanical Engineering'
        CE = 'ce', 'Civil Engineering'
        IT = 'it', 'Information Technology'
        AE = 'ae', 'Aerospace Engineering'
        CHE = 'che', 'Chemical Engineering'
        OTHER = 'other', 'Other'

    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='Course Name'
    )
    college = models.ForeignKey(
        College,
        on_delete=models.CASCADE,
        related_name='courses',
        db_index=True,
        verbose_name='College'
    )
    duration = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        verbose_name='Duration (Years)'
    )
    degree = models.CharField(
        max_length=50,
        choices=DegreeType.choices,
        default=DegreeType.BTECH,
        db_index=True,
        verbose_name='Degree Type'
    )
    branch = models.CharField(
        max_length=100,
        choices=BranchType.choices,
        default=BranchType.CSE,
        db_index=True,
        verbose_name='Branch'
    )
    total_seats = models.PositiveIntegerField(
        verbose_name='Total Seats'
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
        verbose_name = 'Course'
        verbose_name_plural = 'Courses'
        ordering = ['college', 'name']
        indexes = [
            models.Index(fields=['college', 'degree', 'branch']),
            models.Index(fields=['is_active', 'degree']),
        ]

    def __str__(self):
        return f"{self.name} - {self.college.name}"


class Cutoff(models.Model):
    """
    Represents cutoff ranks for a course in a specific exam, year, category, quota.
    """
    class CategoryType(models.TextChoices):
        GENERAL = 'general', 'General'
        SC = 'sc', 'SC'
        ST = 'st', 'ST'
        OBC = 'obc', 'OBC'
        OBC_NCL = 'obc_ncl', 'OBC-NCL'
        EWS = 'ews', 'EWS'
        GEN_EWS = 'gen_ews', 'GEN-EWS'
        GEN_EWS_PWD = 'gen_ews_pwd', 'GEN-EWS-PWD'
        GEN_PWD = 'gen_pwd', 'GEN-PWD'
        OBC_NCL_PWD = 'obc_ncl_pwd', 'OBC-NCL-PWD'
        SC_PWD = 'sc_pwd', 'SC-PWD'
        ST_PWD = 'st_pwd', 'ST-PWD'
        EWS_PWD = 'ews_pwd', 'EWS-PWD'

    class QuotaType(models.TextChoices):
        STATE = 'state', 'State'
        AIQ = 'aiq', 'All India Quota'
        AI = 'ai', 'All India'
        AP = 'ap', 'Andhra Pradesh'
        GO = 'go', 'Goa'
        HS = 'hs', 'Home State'
        JK = 'jk', 'Jammu & Kashmir'
        LA = 'la', 'Ladakh'
        OS = 'os', 'Other State'

    class SeatType(models.TextChoices):
        OPEN = 'open', 'OPEN'
        OPEN_PWD = 'open_pwd', 'OPEN (PwD)'
        OBC_NCL = 'obc_ncl', 'OBC-NCL'
        OBC_NCL_PWD = 'obc_ncl_pwd', 'OBC-NCL (PwD)'
        SC = 'sc', 'SC'
        SC_PWD = 'sc_pwd', 'SC (PwD)'
        ST = 'st', 'ST'
        ST_PWD = 'st_pwd', 'ST (PwD)'
        EWS = 'ews', 'EWS'
        EWS_PWD = 'ews_pwd', 'EWS (PwD)'

    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='cutoffs',
        db_index=True,
        verbose_name='Exam'
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='cutoffs',
        db_index=True,
        verbose_name='Course'
    )
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        db_index=True,
        verbose_name='Year'
    )
    category = models.CharField(
        max_length=20,
        choices=CategoryType.choices,
        db_index=True,
        verbose_name='Category'
    )
    quota = models.CharField(
        max_length=10,
        choices=QuotaType.choices,
        db_index=True,
        verbose_name='Quota'
    )
    seat_type = models.CharField(
        max_length=20,
        choices=SeatType.choices,
        default=SeatType.OPEN,
        db_index=True,
        verbose_name='Seat Type'
    )
    state = models.CharField(
        max_length=255,
        default='All',
        db_index=True,
        verbose_name='State'
    )
    opening_rank = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Opening Rank'
    )
    closing_rank = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Closing Rank'
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
        verbose_name = 'Cutoff'
        verbose_name_plural = 'Cutoffs'
        ordering = ['-year', 'exam', 'opening_rank']
        indexes = [
            # Critical indexes for rank-based queries
            models.Index(fields=['exam', 'year', 'category', 'opening_rank', 'closing_rank']),
            models.Index(fields=['exam', 'category', 'quota', 'state', 'opening_rank']),
            models.Index(fields=['course', 'year', 'category']),
            models.Index(fields=['opening_rank', 'closing_rank']),
        ]
        # Prevent duplicate cutoffs
        constraints = [
            models.UniqueConstraint(
                fields=['exam', 'course', 'year', 'category', 'quota', 'seat_type', 'state'],
                name='unique_cutoff'
            )
        ]

    def __str__(self):
        return f"{self.exam.name} {self.year} - {self.course.name} ({self.category}) - Rank {self.opening_rank}-{self.closing_rank}"


class Prediction(models.Model):
    """
    Stores user prediction requests and results.
    Input snapshot preserved for audit, output stored as JSON for flexibility.
    """
    class CategoryType(models.TextChoices):
        GENERAL = 'general', 'General'
        SC = 'sc', 'SC'
        ST = 'st', 'ST'
        OBC = 'obc', 'OBC'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='predictions',
        null=True,
        blank=True,
        db_index=True,
        verbose_name='User',
        help_text='Null for anonymous predictions'
    )
    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='predictions',
        db_index=True,
        verbose_name='Exam'
    )
    input_rank = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Input Rank'
    )
    category = models.CharField(
        max_length=10,
        choices=CategoryType.choices,
        db_index=True,
        verbose_name='Category'
    )
    state = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='State'
    )
    branch_list = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Preferred Branches',
        help_text='List of preferred branch codes'
    )
    # Store full input snapshot for audit
    input_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Input Snapshot',
        help_text='Complete input data at time of prediction'
    )
    # Store prediction results as JSON (flexible schema)
    predicted_result = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Prediction Results',
        help_text='Structured prediction output'
    )
    timestamp = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Prediction Time'
    )

    class Meta:
        verbose_name = 'Prediction'
        verbose_name_plural = 'Predictions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['exam', 'category', 'input_rank']),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else 'Anonymous'
        return f"{user_str} - {self.exam.name} Rank {self.input_rank} ({self.timestamp.strftime('%Y-%m-%d')})"


class ScoreToRank(models.Model):
    """
    Maps score ranges to rank ranges for interpolation.
    Used for converting scores to estimated ranks.
    """
    class CategoryType(models.TextChoices):
        GENERAL = 'general', 'General'
        SC = 'sc', 'SC'
        ST = 'st', 'ST'
        OBC = 'obc', 'OBC'

    exam = models.ForeignKey(
        Exam,
        on_delete=models.CASCADE,
        related_name='score_to_rank_mappings',
        db_index=True,
        verbose_name='Exam'
    )
    year = models.PositiveIntegerField(
        validators=[MinValueValidator(2000), MaxValueValidator(2100)],
        db_index=True,
        verbose_name='Year'
    )
    category = models.CharField(
        max_length=10,
        choices=CategoryType.choices,
        db_index=True,
        verbose_name='Category'
    )
    score_low = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Score Low'
    )
    score_high = models.PositiveIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Score High'
    )
    percentile_low = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Percentile Low'
    )
    percentile_high = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='Percentile High'
    )
    rank_low = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Rank Low'
    )
    rank_high = models.PositiveIntegerField(
        db_index=True,
        verbose_name='Rank High'
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
        verbose_name = 'Score to Rank Mapping'
        verbose_name_plural = 'Score to Rank Mappings'
        ordering = ['exam', '-year', 'category', 'rank_low']
        indexes = [
            models.Index(fields=['exam', 'year', 'category', 'rank_low', 'rank_high']),
            models.Index(fields=['exam', 'year', 'category', 'score_low', 'score_high']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['exam', 'year', 'category', 'rank_low', 'rank_high'],
                name='unique_score_rank_mapping'
            )
        ]

    def __str__(self):
        score_str = f"Score {self.score_low}-{self.score_high}" if self.score_low else "N/A"
        return f"{self.exam.name} {self.year} ({self.category}) - {score_str} → Rank {self.rank_low}-{self.rank_high}"
