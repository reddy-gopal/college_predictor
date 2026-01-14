from django.contrib import admin
from .models import (
    Scholarship, ScholarshipEligibilityRule, ScholarshipApplication,
    ScholarshipDocument, ApplicationReview
)


@admin.register(Scholarship)
class ScholarshipAdmin(admin.ModelAdmin):
    list_display = ['title', 'provider_name', 'scholarship_type', 'status', 'is_active', 'application_deadline', 'created_at']
    list_filter = ['status', 'scholarship_type', 'is_active', 'created_at']
    search_fields = ['title', 'provider_name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'description', 'provider_name', 'provider_website')
        }),
        ('Scholarship Details', {
            'fields': ('scholarship_type', 'amount', 'amount_description', 'application_deadline')
        }),
        ('Status', {
            'fields': ('status', 'is_active')
        }),
        ('Application Details', {
            'fields': ('eligibility_rules', 'required_documents', 'application_instructions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(ScholarshipEligibilityRule)
class ScholarshipEligibilityRuleAdmin(admin.ModelAdmin):
    list_display = ['scholarship', 'rule_type', 'is_required', 'order', 'created_at']
    list_filter = ['rule_type', 'is_required', 'scholarship']
    search_fields = ['scholarship__title', 'description']
    readonly_fields = ['created_at']


@admin.register(ScholarshipApplication)
class ScholarshipApplicationAdmin(admin.ModelAdmin):
    list_display = ['student', 'scholarship', 'status', 'submitted_at', 'reviewed_at', 'created_at']
    list_filter = ['status', 'scholarship', 'submitted_at', 'created_at']
    search_fields = ['student__email', 'scholarship__title']
    readonly_fields = ['created_at', 'updated_at', 'submitted_at', 'reviewed_at']
    fieldsets = (
        ('Application Information', {
            'fields': ('student', 'scholarship', 'status')
        }),
        ('Application Content', {
            'fields': ('personal_statement', 'additional_info')
        }),
        ('Timestamps', {
            'fields': ('submitted_at', 'reviewed_at', 'created_at', 'updated_at')
        }),
    )


@admin.register(ScholarshipDocument)
class ScholarshipDocumentAdmin(admin.ModelAdmin):
    list_display = ['application', 'document_type', 'file_name', 'file_size', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['application__student__email', 'file_name']
    readonly_fields = ['uploaded_at', 'file_size']


@admin.register(ApplicationReview)
class ApplicationReviewAdmin(admin.ModelAdmin):
    list_display = ['application', 'reviewer', 'decision', 'reviewed_at', 'created_at']
    list_filter = ['decision', 'reviewed_at', 'created_at']
    search_fields = ['application__student__email', 'reviewer__email', 'comments']
    readonly_fields = ['created_at', 'reviewed_at']
    fieldsets = (
        ('Review Information', {
            'fields': ('application', 'reviewer', 'decision')
        }),
        ('Review Content', {
            'fields': ('comments', 'student_feedback')
        }),
        ('Timestamps', {
            'fields': ('reviewed_at', 'created_at')
        }),
    )

