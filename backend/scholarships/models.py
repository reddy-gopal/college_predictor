from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from accounts.models import CustomUser

class Scholarship(models.Model):
    """
    Read-only scholarship listing.
    Users are redirected to official scholarship page.
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
        ACTIVE = 'active', 'Active'
        CLOSED = 'closed', 'Closed'
        ARCHIVED = 'archived', 'Archived'

    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    description = models.TextField()

    provider_name = models.CharField(
        max_length=255,
        db_index=True
    )

    official_url = models.URLField(
        help_text='Official scholarship application page',
        null=True,
        blank=True
    )

    scholarship_type = models.CharField(
        max_length=50,
        choices=ScholarshipType.choices,
        db_index=True
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    amount_description = models.CharField(
        max_length=255,
        blank=True,
        help_text='Example: Up to ₹50,000'
    )

    application_deadline = models.DateField(
        null=True,
        blank=True,
        db_index=True
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )

    eligibility_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='Fast eligibility filtering'
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['application_deadline', 'title']
        indexes = [
            models.Index(fields=['status', 'application_deadline']),
            models.Index(fields=['scholarship_type', 'status']),
            models.Index(fields=['provider_name']),
        ]

    def save(self, *args, **kwargs):
        """Auto-generate slug from title if not set.
        
        For SEO purposes, slugs are generated once and remain stable.
        Only generate if slug is empty to preserve existing URLs.
        """
        if not self.slug and self.title:
            base_slug = slugify(self.title)
            if not base_slug:  # Handle edge case where title doesn't generate a valid slug
                base_slug = f"scholarship-{self.pk or 'new'}"
            
            slug = base_slug
            counter = 1
            
            # Ensure slug is unique
            while Scholarship.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            
            self.slug = slug
        
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class ScholarshipEligibilityRule(models.Model):
    """
    Structured eligibility rules for scholarship filtering.
    """

    class RuleType(models.TextChoices):
        MIN_AGE = 'min_age', 'Minimum Age'
        MAX_AGE = 'max_age', 'Maximum Age'
        MIN_INCOME = 'min_income', 'Minimum Family Income'
        MAX_INCOME = 'max_income', 'Maximum Family Income'
        MIN_PERCENTAGE = 'min_percentage', 'Minimum Percentage'
        STATE = 'state', 'State'
        CATEGORY = 'category', 'Category'
        GENDER = 'gender', 'Gender'
        CUSTOM = 'custom', 'Custom Rule'

    scholarship = models.ForeignKey(
        Scholarship,
        on_delete=models.CASCADE,
        related_name='eligibility_rule_list',
        db_index=True
    )

    rule_type = models.CharField(
        max_length=50,
        choices=RuleType.choices,
        db_index=True
    )

    rule_value = models.JSONField(
        help_text='Example: {"min": 18, "max": 25}'
    )

    description = models.CharField(
        max_length=255,
        blank=True
    )

    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['order']
        indexes = [
            models.Index(fields=['rule_type']),
            models.Index(fields=['scholarship', 'rule_type']),
        ]

    def __str__(self):
        return f"{self.scholarship.title} - {self.rule_type}"


class ScholarshipInteraction(models.Model):
    """
    Lightweight application status tracking.
    No real application or verification.
    """

    class Status(models.TextChoices):
        NOT_STARTED = 'not_started', 'Not Started'
        VIEWED = 'viewed', 'Viewed'
        REDIRECTED = 'redirected', 'Redirected to Official Site'
        APPLIED = 'applied', 'Applied (Self Reported)'
        RESULT_RECEIVED = 'result_received', 'Result Received'

    student = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='scholarship_interactions',
        db_index=True
    )

    scholarship = models.ForeignKey(
        Scholarship,
        on_delete=models.CASCADE,
        related_name='interactions',
        db_index=True
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NOT_STARTED,
        db_index=True
    )

    applied_at = models.DateTimeField(
        null=True,
        blank=True
    )

    redirected_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when user was redirected to official website'
    )

    notification_sent = models.BooleanField(
        default=False,
        db_index=True,
        help_text='Whether follow-up notification has been sent'
    )

    last_interacted_at = models.DateTimeField(
        default=timezone.now,
        db_index=True
    )

    notes = models.CharField(
        max_length=255,
        blank=True,
        help_text='Optional student notes'
    )

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'scholarship')
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['scholarship', 'status']),
        ]

    def __str__(self):
        return f"{self.student_id} - {self.scholarship.title} ({self.status})"


class ScholarshipOnboarding(models.Model):
    """
    Onboarding data for scholarship personalization.
    Stores user preferences and eligibility criteria.
    """
    
    class Stream(models.TextChoices):
        SCIENCE = 'Science', 'Science'
        COMMERCE = 'Commerce', 'Commerce'
        ARTS = 'Arts', 'Arts'
        OTHER = 'Other', 'Other'
    
    class Board(models.TextChoices):
        CBSE = 'CBSE', 'CBSE'
        ICSE = 'ICSE', 'ICSE'
        STATE = 'State', 'State Board'
        IB = 'IB', 'IB'
        IGCSE = 'IGCSE', 'IGCSE'
        OTHER = 'Other', 'Other'
    
    class Category(models.TextChoices):
        GENERAL = 'General', 'General'
        OBC = 'OBC', 'OBC'
        SC = 'SC', 'SC'
        ST = 'ST', 'ST'
        OTHER = 'Other', 'Other'
    
    class Gender(models.TextChoices):
        MALE = 'Male', 'Male'
        FEMALE = 'Female', 'Female'
        OTHER = 'Other', 'Other'
        PREFER_NOT_TO_SAY = 'Prefer not to say', 'Prefer not to say'
    
    class FamilyIncomeRange(models.TextChoices):
        BELOW_1_LAKH = '₹0 – ₹1,00,000', '₹0 – ₹1,00,000'
        ONE_TO_TWO_FIFTY = '₹1,00,000 – ₹2,50,000', '₹1,00,000 – ₹2,50,000'
        TWO_FIFTY_TO_FIVE = '₹2,50,000 – ₹5,00,000', '₹2,50,000 – ₹5,00,000'
        FIVE_TO_TEN = '₹5,00,000 – ₹10,00,000', '₹5,00,000 – ₹10,00,000'
        ABOVE_TEN = '₹10,00,000+', '₹10,00,000+'
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='scholarship_onboarding',
        db_index=True,
        verbose_name='User'
    )
    
    stream = models.CharField(
        max_length=50,
        choices=Stream.choices,
        verbose_name='Stream'
    )
    
    board = models.CharField(
        max_length=50,
        choices=Board.choices,
        verbose_name='Board'
    )
    
    state = models.CharField(
        max_length=100,
        verbose_name='State'
    )
    
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        verbose_name='Category'
    )
    
    family_income_range = models.CharField(
        max_length=50,
        choices=FamilyIncomeRange.choices,
        verbose_name='Family Income Range'
    )
    
    gender = models.CharField(
        max_length=50,
        choices=Gender.choices,
        verbose_name='Gender'
    )
    
    age = models.PositiveIntegerField(
        verbose_name='Age'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Created At'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Updated At'
    )
    
    class Meta:
        verbose_name = 'Scholarship Onboarding'
        verbose_name_plural = 'Scholarship Onboardings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['stream', 'state', 'category']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - Scholarship Onboarding"
