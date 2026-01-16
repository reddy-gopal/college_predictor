"""
Gamification utilities for XP and streak calculations.
"""
from datetime import date, timedelta
from django.utils import timezone
from .models import StudentProfile, XPLog, DailyFocus


def award_xp(student_profile, xp_amount, action, source_type='test_completed', source_id=None):
    """
    Award XP to a student and update their total XP.
    
    Args:
        student_profile: StudentProfile instance
        xp_amount: Amount of XP to award
        action: Description of the action (e.g., "Completed mock test")
        source_type: Type of source (e.g., 'test_completed', 'streak_bonus')
        source_id: ID of the source object (e.g., TestAttempt ID)
    
    Returns:
        Updated StudentProfile instance
    """
    # Create XP log entry
    XPLog.objects.create(
        student=student_profile,
        xp_amount=xp_amount,
        action=action,
        source_type=source_type,
        source_id=source_id,
    )
    
    # Update total XP
    student_profile.total_xp += xp_amount
    student_profile.save(update_fields=['total_xp'])
    
    return student_profile


def calculate_streaks(student_profile):
    """
    Calculate current and max streaks from DailyFocus records.
    
    Args:
        student_profile: StudentProfile instance
    
    Returns:
        dict with 'current' and 'max' streak values
    """
    # Get all daily focus records, ordered by date
    daily_focus_records = DailyFocus.objects.filter(
        student=student_profile
    ).order_by('date')
    
    if not daily_focus_records.exists():
        return {'current': 0, 'max': 0}
    
    today = date.today()
    current_streak = 0
    max_streak = 0
    temp_streak = 0
    
    # Convert to list for easier iteration
    records_list = list(daily_focus_records)
    
    # Calculate current streak (from today backwards)
    # Check if today is present
    today_record = daily_focus_records.filter(date=today).first()
    if today_record and (today_record.status == DailyFocus.Status.PRESENT or 
                         today_record.status == DailyFocus.Status.PARTIAL):
        current_streak = 1
        # Count backwards from yesterday
        check_date = today - timedelta(days=1)
        for record in reversed(records_list):
            if record.date == check_date and record.date < today:
                if (record.status == DailyFocus.Status.PRESENT or 
                    record.status == DailyFocus.Status.PARTIAL):
                    current_streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
    else:
        # Today is not present, check backwards from yesterday
        check_date = today - timedelta(days=1)
        for record in reversed(records_list):
            if record.date == check_date and record.date < today:
                if (record.status == DailyFocus.Status.PRESENT or 
                    record.status == DailyFocus.Status.PARTIAL):
                    current_streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
    
    # Calculate max streak (all time)
    for record in records_list:
        if (record.status == DailyFocus.Status.PRESENT or 
            record.status == DailyFocus.Status.PARTIAL):
            temp_streak += 1
            max_streak = max(max_streak, temp_streak)
        else:
            temp_streak = 0
    
    return {
        'current': current_streak,
        'max': max_streak
    }


def calculate_weekly_goal_progress(student_profile):
    """
    Calculate weekly goal progress from test attempts.
    
    Args:
        student_profile: StudentProfile instance
    
    Returns:
        dict with 'completed' and 'goal' values
    """
    # Get current week start (Monday)
    today = date.today()
    days_since_monday = today.weekday()
    week_start = today - timedelta(days=days_since_monday)
    week_end = week_start + timedelta(days=6)
    
    # Count completed test attempts this week
    from .models import TestAttempt
    completed_tests = TestAttempt.objects.filter(
        student=student_profile,
        is_completed=True,
        completed_at__date__gte=week_start,
        completed_at__date__lte=week_end
    ).count()
    
    # Get weekly goal from tests_per_week preference
    goal = 2  # Default
    if student_profile.tests_per_week:
        if 'Daily' in student_profile.tests_per_week or 'daily' in student_profile.tests_per_week.lower():
            goal = 7
        elif '3-5' in student_profile.tests_per_week or '3' in student_profile.tests_per_week:
            goal = 4
        elif '1-2' in student_profile.tests_per_week or '1' in student_profile.tests_per_week:
            goal = 2
    
    return {
        'completed': completed_tests,
        'goal': goal
    }

