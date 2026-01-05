from django.core.management.base import BaseCommand
from predictor.models import CutoffModel


class Command(BaseCommand):
    help = 'Clear all CutoffModel entries from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm deletion (required to actually delete)',
        )

    def handle(self, *args, **options):
        count = CutoffModel.objects.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('CutoffModel is already empty.'))
            return
        
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                f'This will delete {count} CutoffModel entries.'
            ))
            self.stdout.write(self.style.WARNING(
                'To confirm deletion, run: python manage.py clear_cutoffs --confirm'
            ))
            return
        
        # Delete all CutoffModel entries
        deleted_count, _ = CutoffModel.objects.all().delete()
        
        self.stdout.write(self.style.SUCCESS(
            f'Successfully deleted {deleted_count} CutoffModel entries.'
        ))

