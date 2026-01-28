"""
Management command to send follow-up notifications to users who were redirected
to scholarship official websites 10 minutes ago.

This command should be run periodically (e.g., every 5 minutes via cron) to check
for users who need to be notified about their scholarship application status.

Usage:
    python manage.py send_scholarship_notifications
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from scholarships.models import ScholarshipInteraction
from accounts.models import Notification


class Command(BaseCommand):
    help = 'Send follow-up notifications to users who were redirected to scholarship websites 10 minutes ago'

    def handle(self, *args, **options):
        # Calculate the time 10 minutes ago
        # We want to send notifications to users who were redirected at least 10 minutes ago
        now = timezone.now()
        ten_minutes_ago = now - timedelta(minutes=10)
        
        # Find interactions that:
        # 1. Have status 'redirected' (still in redirected state)
        # 2. Were redirected at least 10 minutes ago (redirected_at <= 10 minutes ago)
        # 3. Haven't had notification sent yet (notification_sent=False)
        # 
        # Note: We don't set an upper bound because we want to catch all interactions
        # that meet the criteria, even if the command hasn't run for a while.
        # The notification_sent flag ensures we don't send duplicate notifications.
        
        interactions_to_notify = ScholarshipInteraction.objects.filter(
            status=ScholarshipInteraction.Status.REDIRECTED,
            redirected_at__lte=ten_minutes_ago,  # At least 10 minutes ago
            redirected_at__isnull=False,  # Must have a redirected_at timestamp
            notification_sent=False  # Haven't sent notification yet
        ).select_related('student', 'scholarship')
        
        notification_count = 0
        
        for interaction in interactions_to_notify:
            # Create engaging notification message
            scholarship_title = interaction.scholarship.title
            message = f"Have you applied for {scholarship_title}?"
            
            # Create interactive notification with Yes/No action
            Notification.objects.create(
                user=interaction.student,
                category=Notification.Category.SCHOLARSHIP,
                message=message,
                action_type='scholarship_apply_confirm',
                action_data={
                    'interaction_id': interaction.id,
                    'scholarship_id': interaction.scholarship.id,
                    'scholarship_title': scholarship_title
                }
            )
            
            # Mark notification as sent
            interaction.notification_sent = True
            interaction.save(update_fields=['notification_sent'])
            
            notification_count += 1
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Sent notification to {interaction.student.email} for {scholarship_title}'
                )
            )
        
        if notification_count == 0:
            self.stdout.write(self.style.SUCCESS('No notifications to send at this time.'))
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully sent {notification_count} notification(s).'
                )
            )

