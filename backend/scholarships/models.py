
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class Scholarship(models.Model):
    """
    Scholarship definition with eligibility criteria.
    """
    class ScholarshipType(models.TextChoices):
        MERIT_BASED = 'merit_based', 'Merit Based'
        NEED_BASED = 'need_based', 'Need Based'
        SPORTS = 'sports', 'Sports'
        MINORITY = 'minority', 'Minority'
        DISABILITY = 'disability', 'Disability'
        RESEARCH = 'research', 'Research'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        ACTIVE = 'active', 'Active'
        CLOSED = 'closed', 'Closed'
        ARCHIVED = 'archived', 'Archived'

    title = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='Scholarship Title'
    )
    description = models.TextField(
        verbose_name='Description'
    )
    provider_name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name='Provider Name',
        help_text='Organization providing the scholarship'
    )
    provider_website = models.URLField(
        blank=True,
        verbose_name='Provider Website'
    )
    scholarship_type = models.CharField(
        max_length=50,
        choices=ScholarshipType.choices,
        db_index=True,
        verbose_name='Scholarship Type'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='Scholarship Amount',
        help_text='Amount in INR (null if variable)'
    )
    amount_description = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Amount Description',
        help_text='Description if amount is variable (e.g., "Up to 50,000")'
    )
    application_deadline = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Application Deadline'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
        verbose_name='Status'
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name='Is Active'
    )
    eligibility_rules = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Eligibility Rules',
        help_text='Structured eligibility criteria (JSON) for rule engine'
    )
    required_documents = models.JSONField(
        default=list,
        blank=True,
        verbose_name='Required Documents',
        help_text='List of required document types'
    )
    application_instructions = models.TextField(
        blank=True,
        verbose_name='Application Instructions'
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
        verbose_name = 'Scholarship'
        verbose_name_plural = 'Scholarships'
        ordering = ['-created_at', 'title']
        indexes = [
            models.Index(fields=['status', 'is_active', '-application_deadline']),
            models.Index(fields=['scholarship_type', 'status']),
            models.Index(fields=['provider_name', 'status']),
        ]

    def __str__(self):
        return f"{self.title} - {self.provider_name}"


class ScholarshipEligibilityRule(models.Model):
    """
    Detailed eligibility rules for scholarships.
    Allows flexible rule definition for future rule engine.
    """
    class RuleType(models.TextChoices):
        MIN_AGE = 'min_age', 'Minimum Age'
        MAX_AGE = 'max_age', 'Maximum Age'
        MIN_INCOME = 'min_income', 'Minimum Family Income'
        MAX_INCOME = 'max_income', 'Maximum Family Income'
        MIN_PERCENTAGE = 'min_percentage', 'Minimum Percentage'
        EXAM_SCORE = 'exam_score', 'Exam Score Requirement'
        STATE = 'state', 'State Requirement'
        CATEGORY = 'category', 'Category Requirement'
        GENDER = 'gender', 'Gender Requirement'
        CUSTOM = 'custom', 'Custom Rule'

    scholarship = models.ForeignKey(
        Scholarship,
        on_delete=models.CASCADE,
        related_name='detailed_eligibility_rules',
        db_index=True,
        verbose_name='Scholarship'
    )
    rule_type = models.CharField(
        max_length=50,
        choices=RuleType.choices,
        db_index=True,
        verbose_name='Rule Type'
    )
    rule_value = models.JSONField(
        default=dict,
        verbose_name='Rule Value',
        help_text='Rule parameters (e.g., {"min": 18, "max": 25} for age)'
    )
    description = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Description',
        help_text='Human-readable description of the rule'
    )
    is_required = models.BooleanField(
        default=True,
        verbose_name='Is Required',
        help_text='If False, this is an optional/preferred criterion'
    )
    order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name='Display Order'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Scholarship Eligibility Rule'
        verbose_name_plural = 'Scholarship Eligibility Rules'
        ordering = ['scholarship', 'order', 'rule_type']
        indexes = [
            models.Index(fields=['scholarship', 'is_required', 'order']),
        ]

    def __str__(self):
        return f"{self.scholarship.title} - {self.get_rule_type_display()}"


class ScholarshipApplication(models.Model):
    """
    Student's application for a scholarship.
    Tracks application lifecycle and status.
    """
    class ApplicationStatus(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        UNDER_REVIEW = 'under_review', 'Under Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        WITHDRAWN = 'withdrawn', 'Withdrawn'

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scholarship_applications',
        db_index=True,
        verbose_name='Student'
    )
    scholarship = models.ForeignKey(
        Scholarship,
        on_delete=models.PROTECT,
        related_name='applications',
        db_index=True,
        verbose_name='Scholarship'
    )
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.DRAFT,
        db_index=True,
        verbose_name='Application Status'
    )
    personal_statement = models.TextField(
        blank=True,
        verbose_name='Personal Statement',
        help_text='Student\'s personal statement or essay'
    )
    additional_info = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Additional Information',
        help_text='Additional application data (flexible schema)'
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Submitted At'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Reviewed At'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Created At'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )

    class Meta:
        verbose_name = 'Scholarship Application'
        verbose_name_plural = 'Scholarship Applications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['student', '-created_at']),
            models.Index(fields=['scholarship', 'status']),
            models.Index(fields=['status', '-submitted_at']),
            models.Index(fields=['student', 'scholarship']),
        ]
        # Prevent duplicate applications
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'scholarship'],
                name='unique_scholarship_application',
                condition=models.Q(status__in=['draft', 'submitted', 'under_review'])
            )
        ]

    def __str__(self):
        return f"{self.student.email} - {self.scholarship.title} ({self.get_status_display()})"


class ScholarshipDocument(models.Model):
    """
    Documents uploaded for a scholarship application.
    """
    class DocumentType(models.TextChoices):
        IDENTITY_PROOF = 'identity_proof', 'Identity Proof'
        INCOME_CERTIFICATE = 'income_certificate', 'Income Certificate'
        ACADEMIC_TRANSCRIPT = 'academic_transcript', 'Academic Transcript'
        MARK_SHEET = 'mark_sheet', 'Mark Sheet'
        EXAM_SCORE_CARD = 'exam_score_card', 'Exam Score Card'
        CASTE_CERTIFICATE = 'caste_certificate', 'Caste Certificate'
        DISABILITY_CERTIFICATE = 'disability_certificate', 'Disability Certificate'
        BANK_STATEMENT = 'bank_statement', 'Bank Statement'
        RECOMMENDATION_LETTER = 'recommendation_letter', 'Recommendation Letter'
        PERSONAL_STATEMENT = 'personal_statement', 'Personal Statement'
        OTHER = 'other', 'Other'

    application = models.ForeignKey(
        ScholarshipApplication,
        on_delete=models.CASCADE,
        related_name='documents',
        db_index=True,
        verbose_name='Application'
    )
    document_type = models.CharField(
        max_length=50,
        choices=DocumentType.choices,
        db_index=True,
        verbose_name='Document Type'
    )
    file = models.FileField(
        upload_to='scholarship_documents/%Y/%m/%d/',
        verbose_name='Document File'
    )
    file_name = models.CharField(
        max_length=255,
        verbose_name='File Name',
        help_text='Original file name'
    )
    file_size = models.PositiveIntegerField(
        verbose_name='File Size (Bytes)'
    )
    description = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Description'
    )
    uploaded_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Uploaded At'
    )

    class Meta:
        verbose_name = 'Scholarship Document'
        verbose_name_plural = 'Scholarship Documents'
        ordering = ['application', 'document_type', '-uploaded_at']
        indexes = [
            models.Index(fields=['application', 'document_type']),
        ]

    def __str__(self):
        return f"{self.application.student.email} - {self.get_document_type_display()} ({self.file_name})"


class ApplicationReview(models.Model):
    """
    Admin review of scholarship applications.
    Provides audit trail for approval/rejection decisions.
    """
    class ReviewDecision(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        PENDING = 'pending', 'Pending Review'
        NEEDS_MORE_INFO = 'needs_more_info', 'Needs More Information'

    application = models.ForeignKey(
        ScholarshipApplication,
        on_delete=models.CASCADE,
        related_name='reviews',
        db_index=True,
        verbose_name='Application'
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='scholarship_reviews',
        db_index=True,
        verbose_name='Reviewer',
        help_text='Admin user who reviewed the application'
    )
    decision = models.CharField(
        max_length=20,
        choices=ReviewDecision.choices,
        db_index=True,
        verbose_name='Review Decision'
    )
    comments = models.TextField(
        blank=True,
        verbose_name='Review Comments',
        help_text='Internal review notes'
    )
    student_feedback = models.TextField(
        blank=True,
        verbose_name='Student Feedback',
        help_text='Feedback message visible to student'
    )
    reviewed_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Reviewed At'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Application Review'
        verbose_name_plural = 'Application Reviews'
        ordering = ['-reviewed_at']
        indexes = [
            models.Index(fields=['application', '-reviewed_at']),
            models.Index(fields=['reviewer', '-reviewed_at']),
            models.Index(fields=['decision', '-reviewed_at']),
        ]

    def __str__(self):
        return f"{self.application.student.email} - {self.get_decision_display()} by {self.reviewer.email}"

