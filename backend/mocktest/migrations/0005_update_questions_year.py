# Generated migration

from django.db import migrations


def update_questions_year(apps, schema_editor):
    """
    Update all questions without a year to 2023.
    """
    Question = apps.get_model('mocktest', 'Question')
    Question.objects.filter(year__isnull=True).update(year=2023)


def reverse_update_questions_year(apps, schema_editor):
    """
    Reverse migration: Set year back to null for questions that were updated.
    Note: This will set ALL questions with year=2023 to null, not just the ones we updated.
    """
    Question = apps.get_model('mocktest', 'Question')
    Question.objects.filter(year=2023).update(year=None)


class Migration(migrations.Migration):

    dependencies = [
        ('mocktest', '0004_alter_question_mock_test'),
    ]

    operations = [
        migrations.RunPython(update_questions_year, reverse_update_questions_year),
    ]
