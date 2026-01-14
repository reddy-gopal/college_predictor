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
    REQUIRED_FIELDS = []  # Email is the only required field
    
    objects = CustomUserManager()

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone']),
            models.Index(fields=['is_active', 'is_staff']),
        ]

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

