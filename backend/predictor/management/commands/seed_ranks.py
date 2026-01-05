from django.core.management.base import BaseCommand
from predictor.models import ScoreToRankModel, ExamModel
import csv
import os

class Command(BaseCommand):
    help = 'Seed ScoreToRankModel data from jee_main_score_to_rank.csv file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=int,
            default=1,
            help='Exam ID to use for all entries (default: 1)'
        )
        parser.add_argument(
            '--csv-file',
            type=str,
            default='jee_main_score_to_rank.csv',
            help='Path to CSV file (default: jee_main_score_to_rank.csv)'
        )

    def handle(self, *args, **options):
        exam_id = options['exam_id']
        csv_file = options['csv_file']

        # Get or create exam
        try:
            exam = ExamModel.objects.get(id=exam_id)
            self.stdout.write(self.style.SUCCESS(f'Using exam: {exam.name} (ID: {exam_id})'))
        except ExamModel.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Exam with ID {exam_id} does not exist. Please create it first.'))
            return

        file_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', csv_file)
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'CSV file not found at: {file_path}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Starting data import from {file_path}...'))

        created_count = 0
        error_count = 0
        skipped_count = 0

        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            
            # Skip header row
            next(reader, None)
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    # Validate row has enough columns
                    if len(row) < 8:
                        self.stdout.write(
                            self.style.WARNING(f'Row {row_num}: Insufficient columns, skipping')
                        )
                        skipped_count += 1
                        continue

                    # Parse and convert values
                    score_low = int(float(row[0])) if row[0] and row[0].strip() else None
                    score_high = int(float(row[1])) if row[1] and row[1].strip() else None
                    percentile_low = float(row[2]) if row[2] and row[2].strip() else None
                    percentile_high = float(row[3]) if row[3] and row[3].strip() else None
                    rank_low = int(float(row[4])) if row[4] and row[4].strip() else None
                    rank_high = int(float(row[5])) if row[5] and row[5].strip() else None
                    year = int(row[6]) if row[6] and row[6].strip() else None
                    category = row[7].strip() if row[7] else None

                    # Validate required fields
                    if rank_low is None or rank_high is None or year is None or not category:
                        self.stdout.write(
                            self.style.WARNING(f'Row {row_num}: Missing required fields, skipping')
                        )
                        skipped_count += 1
                        continue

                    # Validate at least one of score or percentile is provided
                    if score_low is None and percentile_low is None:
                        self.stdout.write(
                            self.style.WARNING(f'Row {row_num}: Both score and percentile are missing, skipping')
                        )
                        skipped_count += 1
                        continue

                    # Normalize category to match model choices
                    category = category.strip()
                    category_upper = category.upper()
                    
                    # Map common variations to model choices
                    category_map = {
                        'GENERAL': 'General',
                        'GEN': 'General',
                        'OBC': 'OBC',
                        'OBC-NCL': 'OBC',
                        'SC': 'SC',
                        'ST': 'ST',
                    }
                    
                    # Check if uppercase version exists in map
                    if category_upper in category_map:
                        category = category_map[category_upper]
                    # Check if already in correct format
                    elif category in ['General', 'SC', 'ST', 'OBC']:
                        category = category
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'Row {row_num}: Invalid category "{category}", skipping')
                        )
                        skipped_count += 1
                        continue

                    ScoreToRankModel.objects.create(
                        exam=exam,
                        score_low=score_low,
                        score_high=score_high,
                        percentile_low=percentile_low,
                        percentile_high=percentile_high,
                        rank_low=rank_low,
                        rank_high=rank_high,
                        year=year,
                        category=category
                    )
                    created_count += 1

                except ValueError as e:
                    self.stdout.write(
                        self.style.ERROR(f'Row {row_num}: Invalid value - {e}')
                    )
                    error_count += 1
                    continue
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Row {row_num}: Error - {e}')
                    )
                    error_count += 1
                    continue

        self.stdout.write(self.style.SUCCESS('\n--- Import Summary ---'))
        self.stdout.write(self.style.SUCCESS(f'Total rows processed: {row_num if "row_num" in locals() else 0}'))
        self.stdout.write(self.style.SUCCESS(f'Created entries: {created_count}'))
        self.stdout.write(self.style.WARNING(f'Skipped entries: {skipped_count}'))
        self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('='*50))




        