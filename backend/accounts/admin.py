"""
Accounts App Admin Configuration

Production-ready admin interface for authentication and logging.
"""
from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import UserLoginLog, UserActivityLog, Referral, RewardHistory

User = get_user_model()

# Unregister default UserAdmin if it exists (for custom user model)
if admin.site.is_registered(User):
    admin.site.unregister(User)


@admin.register(User)
class CustomUserAdmin(admin.ModelAdmin):
    """Admin for CustomUser model."""
    list_display = ['email', 'phone', 'referral_code', 'room_credits', 'total_referrals', 'is_phone_verified', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'is_phone_verified', 'first_login_rewarded', 'date_joined']
    search_fields = ['email', 'phone', 'username', 'first_name', 'last_name', 'referral_code']
    readonly_fields = ['date_joined', 'last_login', 'referral_code']
    fieldsets = (
        ('Authentication', {
            'fields': ('email', 'phone', 'is_phone_verified', 'password')
        }),
        ('Personal Info', {
            'fields': ('first_name', 'last_name', 'username')
        }),
        ('OAuth (Google)', {
            'fields': ('google_id', 'google_email', 'google_picture'),
            'classes': ('collapse',)
        }),
        ('Referral System', {
            'fields': ('referral_code', 'referred_by', 'total_referrals', 'room_credits', 'first_login_rewarded')
        }),
        ('Permissions', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined')
        }),
    )


@admin.register(UserLoginLog)
class UserLoginLogAdmin(admin.ModelAdmin):
    """Admin for UserLoginLog model."""
    list_display = ['user', 'email', 'success', 'ip_address', 'created_at']
    list_filter = ['success', 'created_at']
    search_fields = ['email', 'user__email', 'ip_address']
    readonly_fields = ['user', 'email', 'ip_address', 'user_agent', 'success', 
                       'failure_reason', 'metadata', 'created_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Login Information', {
            'fields': ('user', 'email', 'success', 'failure_reason')
        }),
        ('Request Details', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    """Admin for UserActivityLog model."""
    list_display = ['user', 'action_type', 'app_name', 'object_type', 'created_at']
    list_filter = ['action_type', 'app_name', 'created_at']
    search_fields = ['user__email', 'action_type', 'object_type', 'app_name']
    readonly_fields = ['user', 'action_type', 'app_name', 'object_id', 'object_type',
                      'ip_address', 'user_agent', 'metadata', 'created_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Activity Information', {
            'fields': ('user', 'action_type', 'app_name')
        }),
        ('Related Object', {
            'fields': ('object_id', 'object_type')
        }),
        ('Request Details', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Metadata', {
            'fields': ('metadata',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    """Admin for Referral model."""
    list_display = ['referrer', 'referred', 'status', 'referral_code_used', 'created_at', 'activated_at']
    list_filter = ['status', 'created_at', 'activated_at']
    search_fields = ['referrer__email', 'referred__email', 'referral_code_used']
    readonly_fields = ['created_at', 'activated_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Referral Information', {
            'fields': ('referrer', 'referred', 'status', 'referral_code_used')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'activated_at')
        }),
    )


@admin.register(RewardHistory)
class RewardHistoryAdmin(admin.ModelAdmin):
    """Admin for RewardHistory model."""
    list_display = ['user', 'reward_type', 'credits_awarded', 'created_at']
    list_filter = ['reward_type', 'created_at']
    search_fields = ['user__email', 'reward_type']
    readonly_fields = ['user', 'reward_type', 'details', 'credits_awarded', 'created_at']
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Reward Information', {
            'fields': ('user', 'reward_type', 'credits_awarded')
        }),
        ('Details', {
            'fields': ('details',),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )

