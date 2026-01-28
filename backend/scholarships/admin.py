from django.contrib import admin
from .models import Scholarship, ScholarshipEligibilityRule, ScholarshipInteraction, ScholarshipOnboarding


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'provider_name', 'scholarship_type', 'status', 'application_deadline', 'created_at']
    list_filter = ['status', 'scholarship_type', 'created_at']
    search_fields = ['title', 'provider_name', 'description']
    readonly_fields = ['created_at', 'updated_at', 'slug']
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'slug', 'description', 'provider_name', 'official_url')
        }),
        ('Scholarship Details', {
            'fields': ('scholarship_type', 'amount', 'amount_description', 'application_deadline')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Application Details', {
            'fields': ('eligibility_rules',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ScholarshipEligibilityRule)
class ScholarshipEligibilityRuleAdmin(admin.ModelAdmin):
    list_display = ['scholarship', 'rule_type', 'order', 'created_at']
    list_filter = ['rule_type', 'scholarship']
    search_fields = ['scholarship__title', 'description']
    readonly_fields = ['created_at']


@admin.register(ScholarshipInteraction)
class ScholarshipInteractionAdmin(admin.ModelAdmin):
    list_display = ['student', 'scholarship', 'status', 'created_at', 'redirected_at', 'notification_sent']
    list_filter = ['status', 'scholarship', 'created_at']
    search_fields = ['student__username', 'scholarship__title']
    readonly_fields = ['created_at', 'redirected_at', 'notification_sent']


@admin.register(ScholarshipOnboarding)
class ScholarshipOnboardingAdmin(admin.ModelAdmin):
    list_display = ['user', 'stream', 'board', 'state', 'category', 'gender', 'age', 'created_at']
    list_filter = ['stream', 'board', 'category', 'gender', 'state', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'state']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Academic Information', {
            'fields': ('stream', 'board', 'state')
        }),
        ('Personal Information', {
            'fields': ('category', 'family_income_range', 'gender', 'age')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )







