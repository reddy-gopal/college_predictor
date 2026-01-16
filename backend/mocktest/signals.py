"""
Django signals for mocktest app.
Handles automatic XP awarding and task completion when tests are submitted.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import date, timedelta
from .models import TestAttempt, XPLog
from .gamification import award_xp, calculate_weekly_goal_progress


@receiver(post_save, sender=TestAttempt)
def handle_test_completion(sender, instance, created, **kwargs):
    """
    Handle test completion and award XP for related tasks.
    Only triggers when a test is marked as completed.
    
    Note: This signal fires after test_completed XP is awarded in the submit() method.
    We check for test_completed XP to ensure the test was just completed.
    """
    # Only process if test is completed
    if not instance.is_completed or not instance.completed_at:
        return
    
    # Check if test_completed XP exists (indicates test was just submitted)
    # This ensures we only process when a test is actually submitted, not on every save
    test_completed_xp_exists = XPLog.objects.filter(
        student=instance.student,
        source_type='test_completed',
        source_id=instance.id
    ).exists()
    
    # If test_completed XP doesn't exist yet, the submit() method hasn't finished awarding it
    # Skip this run - the signal will fire again after test_completed XP is awarded
    if not test_completed_xp_exists:
        return
    
    today = date.today()
    student_profile = instance.student
    
    # Award XP for "take-test" task (only for first test of the day)
    # Count tests completed today (including this one)
    today_tests_count = TestAttempt.objects.filter(
        student=student_profile,
        is_completed=True,
        completed_at__date=today
    ).count()
    
    # If this is the first test of the day, award "take-test" task XP
    if today_tests_count == 1:
        # Check if already awarded today
        if not XPLog.objects.filter(
            student=student_profile,
            source_type='task_completion',
            action__contains='take-test',
            logged_at__date=today
        ).exists():
            award_xp(
                student_profile=student_profile,
                xp_amount=50,
                action='Completed take-test task (first test of the day)',
                source_type='task_completion',
                source_id=None
            )
    
    # Check and award XP for "weekly-goal" task
    weekly_progress = calculate_weekly_goal_progress(student_profile)
    
    # Check if weekly goal was just met (completed == goal)
    if weekly_progress['completed'] == weekly_progress['goal'] and weekly_progress['goal'] > 0:
        # Check if already awarded this week
        week_start = today - timedelta(days=today.weekday())
        if not XPLog.objects.filter(
            student=student_profile,
            source_type='task_completion',
            action__contains='weekly-goal',
            logged_at__date__gte=week_start
        ).exists():
            award_xp(
                student_profile=student_profile,
                xp_amount=30,
                action='Completed weekly-goal task',
                source_type='task_completion',
                source_id=None
            )

