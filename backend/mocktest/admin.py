"""
Mocktest App Admin Configuration

Production-ready admin interface with proper filtering, search, and display options.

Note: CustomUser admin is in accounts app.
"""
from django.contrib import admin
from django.utils.html import format_html

from .models import (
    PhoneOTP, DifficultyLevel, MockTest, Question,
    StudentProfile, TestAttempt, StudentAnswer, MistakeNotebook,
    StudyGuild, XPLog, Leaderboard, Exam
)


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    """
    Admin for Exam model.
    Exam is the root entity - all questions and tests are organized by exam.
    """
    list_display = ['name', 'code', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(PhoneOTP)
class PhoneOTPAdmin(admin.ModelAdmin):
    """Admin for PhoneOTP model."""
    list_display = ['user', 'otp_code', 'is_used', 'created_at', 'expires_at']
    list_filter = ['is_used', 'created_at']
    search_fields = ['user__email', 'user__phone', 'otp_code']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'


@admin.register(DifficultyLevel)
class DifficultyLevelAdmin(admin.ModelAdmin):
    """Admin for DifficultyLevel model."""
    list_display = ['level', 'order', 'created_at']
    list_editable = ['order']
    ordering = ['order', 'level']


class QuestionInline(admin.TabularInline):
    """Inline admin for Questions in MockTest."""
    model = Question
    extra = 0
    fields = ['question_number', 'question_type', 'subject', 'topic', 'difficulty_level', 'marks']
    readonly_fields = ['question_number']


@admin.register(MockTest)
class MockTestAdmin(admin.ModelAdmin):
    """
    Admin for MockTest model.
    MockTest represents curated full-length tests or generated tests.
    - Full Length: Curated tests with fixed questions
    - Practice/Sectional/Custom: Generated tests (created via API)
    """
    list_display = ['title', 'exam', 'test_type', 'total_questions', 'total_marks', 'duration_minutes', 'is_vip', 'is_active', 'created_at']
    list_filter = ['exam', 'test_type', 'is_vip', 'is_active', 'difficulty', 'created_at']
    search_fields = ['title', 'instructions', 'exam__name']
    readonly_fields = ['total_marks', 'created_at', 'updated_at']
    inlines = [QuestionInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'exam', 'test_type', 'difficulty')
        }),
        ('Test Configuration', {
            'fields': ('total_questions', 'marks_per_question', 'negative_marks', 'total_marks', 'duration_minutes')
        }),
        ('Settings', {
            'fields': ('is_vip', 'is_active', 'instructions')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    """
    Admin for Question model.
    Questions are the source of truth - can be standalone (question bank) or attached to MockTest.
    - Standalone questions (mock_test=None): Used for generating practice/sectional/custom tests
    - Attached questions (mock_test set): Belong to a curated full-length test
    """
    list_display = ['id', 'question_number', 'mock_test', 'exam', 'year', 'subject', 'topic', 'difficulty_level', 'question_type', 'marks']
    list_filter = ['exam', 'year', 'mock_test', 'subject', 'difficulty_level', 'question_type', 'topic']
    search_fields = ['text', 'topic', 'subject', 'mock_test__title', 'exam__name']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        ('Question Info', {
            'fields': ('mock_test', 'question_number', 'question_type', 'text')
        }),
        ('Exam & Year', {
            'fields': ('exam', 'year'),
            'description': 'Required: Exam and year identify the question source'
        }),
        ('Subject & Topic', {
            'fields': ('subject', 'topic', 'difficulty_level')
        }),
        ('Options (MCQ)', {
            'fields': ('option_a', 'option_b', 'option_c', 'option_d', 'correct_option'),
            'classes': ('collapse',)
        }),
        ('Scoring', {
            'fields': ('marks', 'negative_marks')
        }),
        ('Explanation', {
            'fields': ('explanation',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    """Admin for StudentProfile model."""
    list_display = ['user', 'class_level', 'exam_target', 'target_rank', 'tests_per_week', 'onboarding_completed', 'total_xp', 'created_at']
    list_filter = ['class_level', 'exam_target', 'created_at']
    search_fields = ['user__email', 'user__phone']
    readonly_fields = ['total_xp', 'created_at', 'updated_at']
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Profile Information', {
            'fields': ('class_level', 'exam_target', 'target_rank', 'tests_per_week', 'onboarding_completed')
        }),
        ('Gamification', {
            'fields': ('total_xp',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )


class StudentAnswerInline(admin.TabularInline):
    """Inline admin for StudentAnswers in TestAttempt."""
    model = StudentAnswer
    extra = 0
    fields = ['question', 'selected_option', 'is_correct', 'marks_obtained', 'time_taken_seconds']
    readonly_fields = ['is_correct', 'marks_obtained']


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    """Admin for TestAttempt model."""
    list_display = ['student', 'mock_test', 'score', 'percentage', 'percentile', 'is_completed', 'started_at', 'completed_at']
    list_filter = ['is_completed', 'started_at', 'completed_at', 'mock_test']
    search_fields = ['student__user__email', 'mock_test__title']
    readonly_fields = [
        'score', 'percentage', 'percentile', 'correct_count', 'wrong_count',
        'unanswered_count', 'started_at', 'completed_at', 'created_at', 'updated_at'
    ]
    inlines = [StudentAnswerInline]
    fieldsets = (
        ('Test Information', {
            'fields': ('student', 'mock_test')
        }),
        ('Scoring', {
            'fields': ('score', 'percentage', 'percentile', 'correct_count', 'wrong_count', 'unanswered_count')
        }),
        ('Timing', {
            'fields': ('started_at', 'completed_at', 'time_taken_seconds', 'is_completed')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    date_hierarchy = 'started_at'


@admin.register(StudentAnswer)
class StudentAnswerAdmin(admin.ModelAdmin):
    """Admin for StudentAnswer model."""
    list_display = ['attempt', 'question', 'selected_option', 'is_correct', 'marks_obtained', 'time_taken_seconds']
    list_filter = ['is_correct', 'attempt__mock_test', 'attempt__is_completed']
    search_fields = ['attempt__student__user__email', 'question__text', 'question__subject']
    readonly_fields = ['is_correct', 'marks_obtained', 'created_at', 'updated_at']


@admin.register(MistakeNotebook)
class MistakeNotebookAdmin(admin.ModelAdmin):
    """Admin for MistakeNotebook model."""
    list_display = ['student', 'question', 'error_type', 'logged_at']
    list_filter = ['error_type', 'logged_at']
    search_fields = ['student__user__email', 'question__text', 'question__subject']
    readonly_fields = ['logged_at']
    date_hierarchy = 'logged_at'


@admin.register(StudyGuild)
class StudyGuildAdmin(admin.ModelAdmin):
    """Admin for StudyGuild model."""
    list_display = ['name', 'leader', 'members_count', 'is_active', 'is_unlocked_display', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'leader__user__email']
    readonly_fields = ['created_at', 'updated_at', 'members_count_display']
    filter_horizontal = ['members']
    
    def members_count(self, obj):
        """Display member count."""
        return obj.members.count()
    members_count.short_description = 'Members'
    
    def is_unlocked_display(self, obj):
        """Display unlock status with color."""
        if obj.is_unlocked():
            return format_html('<span style="color: green;">✓ Unlocked</span>')
        return format_html('<span style="color: red;">✗ Locked</span>')
    is_unlocked_display.short_description = 'Status'
    
    def members_count_display(self, obj):
        """Display member count in detail view."""
        return obj.members.count()
    members_count_display.short_description = 'Total Members'


@admin.register(XPLog)
class XPLogAdmin(admin.ModelAdmin):
    """Admin for XPLog model."""
    list_display = ['student', 'action', 'xp_amount', 'source_type', 'logged_at']
    list_filter = ['source_type', 'logged_at']
    search_fields = ['student__user__email', 'action']
    readonly_fields = ['logged_at']
    date_hierarchy = 'logged_at'


@admin.register(Leaderboard)
class LeaderboardAdmin(admin.ModelAdmin):
    """Admin for Leaderboard model."""
    list_display = ['student', 'leaderboard_type', 'rank', 'total_score', 'total_tests', 'average_score', 'updated_at']
    list_filter = ['leaderboard_type', 'updated_at']
    search_fields = ['student__user__email']
    readonly_fields = ['total_score', 'total_tests', 'average_score', 'updated_at']
    ordering = ['leaderboard_type', 'rank']
