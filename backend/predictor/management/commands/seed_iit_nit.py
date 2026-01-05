from django.core.management.base import BaseCommand
from predictor.models import (
    CutoffModel, ExamModel, CollegeModel, CourseModel
)
import csv
import os
from django.db import transaction


class Command(BaseCommand):
    help = 'Seed CutoffModel data from iit-and-nit-colleges-admission-criteria-version-2.csv file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=int,
            default=2,
            help='Exam ID to use for all cutoffs (default: 1)'
        )
        parser.add_argument(
            '--csv-file',
            type=str,
            default='iit-and-nit-colleges-admission-criteria-version-2.csv',
            help='Path to CSV file (default: iit-and-nit-colleges-admission-criteria-version-2.csv)'
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
        updated_count = 0
        skipped_count = 0
        error_count = 0

        # Category mapping from CSV to model - keep IIT/NIT categories as-is
        category_map = {
            'GEN': 'General',
            'GEN-EWS': 'GEN-EWS',
            'GEN-EWS-PWD': 'GEN-EWS-PWD',
            'GEN-PWD': 'GEN-PWD',
            'OBC-NCL': 'OBC-NCL',
            'OBC-NCL-PWD': 'OBC-NCL-PWD',
            'SC': 'SC',
            'SC-PWD': 'SC-PWD',
            'ST': 'ST',
            'ST-PWD': 'ST-PWD',
        }

        # Seat type mapping
        seat_type_map = {
            'GEN': 'OPEN',
            'GEN-EWS': 'OPEN',  # EWS is a sub-category, seat type is OPEN
            'GEN-EWS-PWD': 'OPEN (PwD)',
            'GEN-PWD': 'OPEN (PwD)',
            'OBC-NCL': 'OBC-NCL',
            'OBC-NCL-PWD': 'OBC-NCL (PwD)',
            'SC': 'SC',
            'SC-PWD': 'SC (PwD)',
            'ST': 'ST',
            'ST-PWD': 'ST (PwD)',
        }

        # Quota mapping - map state-specific quotas to 'State' quota, keep AI as 'AI'
        quota_map = {
            'AI': 'AI',  # All India - keep as AI
            'AP': 'State',  # Andhra Pradesh -> State quota
            'GO': 'State',  # Goa -> State quota
            'HS': 'State',  # Home State -> State quota
            'JK': 'State',  # Jammu & Kashmir -> State quota
            'LA': 'State',  # Ladakh -> State quota
            'OS': 'State',  # Other State -> State quota
        }
        
        # State mapping for state-specific quotas
        state_map = {
            'AP': 'Andhra Pradesh',
            'GO': 'Goa',
            'HS': None,  # Will use location from institute if available
            'JK': 'Jammu & Kashmir',
            'LA': 'Ladakh',
            'OS': 'Other State',
        }

        # Degree mapping
        degree_map = {
            'B.Tech': 'Bachelor of Technology',
            'M.Tech': 'Master of Technology',
            'B.Sc': 'Bachelor of Science',
            'M.Sc': 'Master of Science',
            'B.A': 'Bachelor of Arts',
            'M.A': 'Master of Arts',
        }

        with open(file_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):
                    try:
                        # Extract data from CSV
                        year = int(row['year'])
                        institute_type = row['institute_type'].strip()
                        institute_short = row['institute_short'].strip()
                        program_name = row['program_name'].strip()
                        program_duration = int(row['program_duration'].split()[0])  # Extract number from "4 Years"
                        degree_short = row['degree_short'].strip()
                        category_csv = row['category'].strip()
                        quota_csv = row['quota'].strip()
                        opening_rank_str = row['opening_rank'].strip()
                        closing_rank_str = row['closing_rank'].strip()

                        # Map category
                        if category_csv not in category_map:
                            self.stdout.write(
                                self.style.WARNING(f'Row {row_num}: Unknown category "{category_csv}", skipping')
                            )
                            skipped_count += 1
                            continue

                        category = category_map[category_csv]
                        seat_type = seat_type_map.get(category_csv, 'OPEN')

                        # Map quota
                        if quota_csv not in quota_map:
                            self.stdout.write(
                                self.style.WARNING(f'Row {row_num}: Unknown quota "{quota_csv}", skipping')
                            )
                            skipped_count += 1
                            continue

                        quota = quota_map[quota_csv]

                        # Determine state based on quota
                        if quota == 'AI':
                            state = 'All'
                        elif quota_csv in state_map:
                            # Use mapped state name for specific quotas
                            mapped_state = state_map[quota_csv]
                            if mapped_state:
                                state = mapped_state
                            else:
                                # For HS, use institute_type as state
                                state = institute_type
                        else:
                            state = 'All'

                        # Clean rank values - remove 'P' suffix if present
                        opening_rank_str = opening_rank_str.rstrip('P')
                        closing_rank_str = closing_rank_str.rstrip('P')
                        opening_rank = int(float(opening_rank_str))
                        closing_rank = int(float(closing_rank_str))

                        # Create or get college
                        # Use institute_short as college name, institute_type for location/type
                        college_name = institute_short
                        location = institute_type  # IIT or NIT
                        
                        college, _ = CollegeModel.objects.get_or_create(
                            name=college_name,
                            defaults={
                                'location': location,
                                'college_type': 'Government'
                            }
                        )

                        # Create or get course
                        # Map degree_short to full degree name
                        degree = degree_map.get(degree_short, 'Bachelor of Technology')
                        
                        # Extract branch from program_name (e.g., "Aerospace Engineering" -> branch)
                        # For now, use program_name as course name
                        course_name = program_name
                        
                        # Map to branch choices (simplified - you may need to adjust)
                        branch = 'CSE'  # Default
                        if 'computer' in program_name.lower() or 'cse' in program_name.lower():
                            branch = 'Computer Science and Engineering'
                        elif 'electrical' in program_name.lower() and 'electronics' in program_name.lower():
                            branch = 'Electrical and Electronics Engineering'
                        elif 'electronics' in program_name.lower() and 'communication' in program_name.lower():
                            branch = 'Electronics and Communication Engineering'
                        elif 'mechanical' in program_name.lower():
                            branch = 'Mechanical Engineering'
                        elif 'civil' in program_name.lower():
                            branch = 'Civil Engineering'
                        elif 'aerospace' in program_name.lower():
                            branch = 'Aerospace Engineering'  # Add if in choices
                        elif 'chemical' in program_name.lower():
                            branch = 'Chemical Engineering'  # Add if in choices

                        course, _ = CourseModel.objects.get_or_create(
                            name=course_name,
                            college=college,
                            defaults={
                                'duration': program_duration,
                                'degree': degree,
                                'branch': branch,
                                'total_seats': 0
                            }
                        )

                        # Create cutoff entry
                        cutoff, created = CutoffModel.objects.get_or_create(
                            exam=exam,
                            course=course,
                            year=year,
                            category=category,
                            quota=quota,
                            state=state,
                            seat_type=seat_type,
                            defaults={
                                'opening_rank': opening_rank,
                                'closing_rank': closing_rank
                            }
                        )

                        if created:
                            created_count += 1
                        else:
                            updated_count += 1

                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Error processing row {row_num}: {e}')
                        )
                        error_count += 1
                        continue

        self.stdout.write(self.style.SUCCESS('\n--- Import Summary ---'))
        self.stdout.write(self.style.SUCCESS(f'Total rows processed: {row_num if "row_num" in locals() else 0}'))
        self.stdout.write(self.style.SUCCESS(f'Created Cutoff entries: {created_count}'))
        self.stdout.write(self.style.SUCCESS(f'Updated Cutoff entries: {updated_count}'))
        self.stdout.write(self.style.WARNING(f'Skipped entries: {skipped_count}'))
        self.stdout.write(self.style.ERROR(f'Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('----------------------'))

