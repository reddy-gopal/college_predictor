"""
Accounts App - User Authentication, Activity & Login Tracking

Design Decisions:
1. CustomUser extends AbstractUser with email as USERNAME_FIELD
2. Separate login and activity logs for different query patterns
3. JSONField for metadata to allow flexible tracking without schema changes
4. Indexes on user, timestamp, and action_type for analytics queries
5. IP and user_agent stored as CharField (not TextField) with reasonable limits
6. Success status as boolean for fast filtering
"""
from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission, BaseUserManager
from django.conf import settings
from django.utils import timezone


class CustomUserManager(BaseUserManager):
    """
    Custom user manager where email is the unique identifier
    for authentication instead of username.
    """
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    """
    Custom User model with email as USERNAME_FIELD.
    Supports phone authentication and OAuth (Google).
    """
    # Override username to make it nullable and non-unique since we use email
    username = models.CharField(
        max_length=150,
        unique=False,
        null=True,
        blank=True,
        verbose_name='username',
        help_text='Optional. Not used for authentication (email is used instead).'
    )
    
    # Override email to make it unique since it's USERNAME_FIELD
    email = models.EmailField(
        unique=True,
        blank=True,
        null=True,
        verbose_name='email address',
        db_index=True
    )
    
    phone = models.CharField(
        max_length=15,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Phone Number'
    )
    is_phone_verified = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Phone Verified'
    )

    # OAuth fields (Google)
    google_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Google ID'
    )
    google_email = models.EmailField(
        null=True,
        blank=True,
        verbose_name='Google Email'
    )
    google_picture = models.URLField(
        null=True,
        blank=True,
        verbose_name='Google Picture URL'
    )
    is_google_user = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Google User'
    )

    # Additional profile fields
    class_level = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name='Class Level'
    )
    exam_target = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='Exam Target'
    )
    preferred_branches = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name='Preferred Branches',
        help_text='Comma-separated list of preferred branches'
    )

    # Referral system fields
    referral_code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Referral Code',
        help_text='Unique code for referring other users'
    )
    referred_by = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Referred By',
        help_text='Referral code of the user who referred this user'
    )
    total_referrals = models.IntegerField(
        default=0,
        verbose_name='Total Referrals',
        help_text='Total number of active referrals'
    )
    room_credits = models.IntegerField(
        default=0,
        verbose_name='Room Credits',
        help_text='Available credits for creating rooms'
    )
    first_login_rewarded = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='First Login Rewarded',
        help_text='Whether the user has received their first login bonus'
    )

    # Override groups and user_permissions to avoid reverse accessor clash
    groups = models.ManyToManyField(
        Group,
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='customuser_set',
        related_query_name='customuser',
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='customuser_set',
        related_query_name='customuser',
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  
    
    objects = CustomUserManager()

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['is_active', 'is_staff']),
            models.Index(fields=['referral_code']),
            models.Index(fields=['referred_by']),
        ]

    def save(self, *args, **kwargs):
        """Generate referral code if not set."""
        if not self.referral_code:
            import secrets
            import string
            # Generate unique 8-character referral code
            while True:
                code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
                if not CustomUser.objects.filter(referral_code=code).exists():
                    self.referral_code = code
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email or self.phone or self.username


class UserLoginLog(models.Model):
    """
    Tracks all user login attempts (successful and failed).
    Optimized for security auditing and analytics.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='login_logs',
        null=True,  # Allow null for failed login attempts with invalid users
        blank=True,
        db_index=True,
        verbose_name='User'
    )
    email = models.EmailField(
        db_index=True,
        verbose_name='Email Attempted'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='IP Address'
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='User Agent'
    )
    success = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Login Successful'
    )
    failure_reason = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Failure Reason'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Additional Metadata'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Login Attempt Time'
    )

    class Meta:
        verbose_name = 'User Login Log'
        verbose_name_plural = 'User Login Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at', 'success']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
        ]

    def __str__(self):
        status = "✓" if self.success else "✗"
        user_str = self.user.email if self.user else self.email
        return f"{status} {user_str} @ {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"


class UserActivityLog(models.Model):
    """
    Tracks user actions across all apps (predictor, mocktest, scholarships).
    Designed for analytics and audit trails.
    """
    class ActionType(models.TextChoices):
        # Predictor actions
        PREDICTION_CREATED = 'prediction_created', 'Prediction Created'
        PREDICTION_VIEWED = 'prediction_viewed', 'Prediction Viewed'
        COLLEGE_SEARCHED = 'college_searched', 'College Searched'
        
        # Mocktest actions
        TEST_STARTED = 'test_started', 'Test Started'
        TEST_COMPLETED = 'test_completed', 'Test Completed'
        TEST_ABANDONED = 'test_abandoned', 'Test Abandoned'
        QUESTION_ANSWERED = 'question_answered', 'Question Answered'
        MISTAKE_LOGGED = 'mistake_logged', 'Mistake Logged'
        
        # Scholarship actions
        SCHOLARSHIP_VIEWED = 'scholarship_viewed', 'Scholarship Viewed'
        APPLICATION_STARTED = 'application_started', 'Application Started'
        APPLICATION_SUBMITTED = 'application_submitted', 'Application Submitted'
        APPLICATION_VIEWED = 'application_viewed', 'Application Viewed'
        
        # General actions
        PROFILE_UPDATED = 'profile_updated', 'Profile Updated'
        SETTINGS_CHANGED = 'settings_changed', 'Settings Changed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activity_logs',
        db_index=True,
        verbose_name='User'
    )
    action_type = models.CharField(
        max_length=50,
        choices=ActionType.choices,
        db_index=True,
        verbose_name='Action Type'
    )
    app_name = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name='App Name',
        help_text='predictor, mocktest, or scholarships'
    )
    object_id = models.BigIntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Related Object ID',
        help_text='ID of the related object (Prediction, TestAttempt, etc.)'
    )
    object_type = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Related Object Type',
        help_text='Model name of the related object'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP Address'
    )
    user_agent = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='User Agent'
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Action Metadata',
        help_text='Additional context about the action'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Activity Time'
    )

    class Meta:
        verbose_name = 'User Activity Log'
        verbose_name_plural = 'User Activity Logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['app_name', '-created_at']),
            models.Index(fields=['user', 'action_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.get_action_type_display()} @ {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"


class Referral(models.Model):
    """
    Tracks referrals between users.
    A referral is only counted when the referred user logs in at least once.
    """
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'

    referrer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referrals_made',
        db_index=True,
        verbose_name='Referrer',
        help_text='User who made the referral'
    )
    referred = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='referral_received',
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Referred User',
        help_text='User who was referred (null until activation)'
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name='Status',
        help_text='Referral status'
    )
    referral_code_used = models.CharField(
        max_length=20,
        db_index=True,
        verbose_name='Referral Code Used',
        help_text='The referral code that was used'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Created At'
    )
    activated_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Activated At',
        help_text='When the referral was activated (referred user logged in)'
    )

    class Meta:
        verbose_name = 'Referral'
        verbose_name_plural = 'Referrals'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['referrer', 'status']),
            models.Index(fields=['referred', 'status']),
            models.Index(fields=['referral_code_used']),
            models.Index(fields=['-created_at']),
        ]
        # Prevent duplicate referrals from same referrer to same referred user
        constraints = [
            models.UniqueConstraint(
                fields=['referrer', 'referred'],
                condition=models.Q(referred__isnull=False),
                name='unique_referral'
            ),
        ]

    def __str__(self):
        referrer_email = self.referrer.email or self.referrer.phone or str(self.referrer.id)
        referred_email = self.referred.email or self.referred.phone or str(self.referred.id) if self.referred else 'Pending'
        return f"{referrer_email} → {referred_email} ({self.get_status_display()})"


class RewardHistory(models.Model):
    """
    Tracks all rewards given to users (first login bonus, referral bonuses).
    """
    class RewardType(models.TextChoices):
        FIRST_LOGIN = 'first_login', 'First Login Bonus'
        REFERRAL_BONUS = 'referral_bonus', 'Referral Bonus'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reward_history',
        db_index=True,
        verbose_name='User'
    )
    reward_type = models.CharField(
        max_length=20,
        choices=RewardType.choices,
        db_index=True,
        verbose_name='Reward Type'
    )
    details = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Details',
        help_text='Additional context about the reward (e.g., referral count, milestone reached)'
    )
    credits_awarded = models.IntegerField(
        default=0,
        verbose_name='Credits Awarded',
        help_text='Number of room credits awarded'
    )
    created_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Reward History'
        verbose_name_plural = 'Reward Histories'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['reward_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.get_reward_type_display()} - {self.credits_awarded} credits @ {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"


class Notification(models.Model):
    """
    Reusable notification model for user notifications.
    Supports different categories (Guild, General, Task, etc.).
    """
    class Category(models.TextChoices):
        GUILD = 'GUILD', 'Guild'
        GENERAL = 'GENERAL', 'General'
        TASK = 'TASK', 'Task'
        SCHOLARSHIP = 'SCHOLARSHIP', 'Scholarship'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True,
        verbose_name='User'
    )
    category = models.CharField(
        max_length=50,
        choices=Category.choices,
        db_index=True,
        verbose_name='Category'
    )
    message = models.TextField(
        verbose_name='Message'
    )
    is_read = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name='Is Read'
    )
    # Interactive notification fields
    action_type = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Type of action (e.g., "scholarship_apply_confirm")',
        verbose_name='Action Type'
    )
    action_data = models.JSONField(
        blank=True,
        null=True,
        help_text='Additional data for the action (e.g., {"interaction_id": 1})',
        verbose_name='Action Data'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name='Created At'
    )

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['category', '-created_at']),
        ]

    def __str__(self):
        read_status = "✓" if self.is_read else "○"
        return f"{read_status} {self.user.email} - {self.get_category_display()} - {self.message[:50]}"



