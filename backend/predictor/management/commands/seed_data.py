from django.core.management.base import BaseCommand
from predictor.models import (
    CutoffModel, ExamModel, CollegeModel, CourseModel
)
import csv
import os
import re
from django.db import transaction


class Command(BaseCommand):
    help = 'Seed CutoffModel data from input.csv file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--exam-id',
            type=int,
            default=2,
            help='Exam ID to use for all cutoffs (default: 1)'
        )
        parser.add_argument(
            '--year',
            type=int,
            default=2024,
            help='Year to use for all cutoffs (default: 2024)'
        )
        parser.add_argument(
            '--csv-file',
            type=str,
            default='input.csv',
            help='Path to CSV file (default: input.csv)'
        )
    def handle(self, *args, **options):
        exam_id = options['exam_id']
        year = options['year']
        csv_file = options['csv_file']

        # Get or create exam
        try:
            exam = ExamModel.objects.get(id=exam_id)
            self.stdout.write(self.style.SUCCESS(f'Using exam: {exam.name} (ID: {exam_id})'))
        except ExamModel.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Exam with ID {exam_id} does not exist. Please create it first.'))
            return

        # Check if CSV file exists (try relative to backend directory)
        if not os.path.isabs(csv_file):
            # Try in current directory first, then backend directory
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            csv_path = os.path.join(backend_dir, csv_file)
            if os.path.exists(csv_path):
                csv_file = csv_path
            elif not os.path.exists(csv_file):
                self.stdout.write(self.style.ERROR(f'CSV file not found: {csv_file}'))
                self.stdout.write(self.style.ERROR(f'Tried: {csv_path}'))
                return

        # Category mapping
        category_map = {
            'OPEN': 'General',
            'OBC-NCL': 'OBC',
            'SC': 'SC',
            'ST': 'ST',
            'EWS': 'EWS'  
        }

        # Quota mapping - All state-specific quotas map to 'State'
        quota_map = {
            'AI': 'AIQ',   # All India Quota
            'HS': 'State', # Home State
            'OS': 'State', # Other State -> State quota
            'GO': 'State', # Goa -> State quota
            'JK': 'State', # Jammu & Kashmir -> State quota
            'LA': 'State'  # Ladakh -> State quota
        }
        
        # State mapping for state-specific quotas
        state_map = {
            'HS': None,  # Will use location from institute name
            'OS': 'Other State',
            'GO': 'Goa',
            'JK': 'Jammu & Kashmir',
            'LA': 'Ladakh'
        }

        created_count = 0
        skipped_count = 0
        error_count = 0

        self.stdout.write(self.style.SUCCESS(f'Starting to import data from {csv_file}...'))
        self.stdout.write(f'Year: {year}, Exam: {exam.name}')

        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):  # Start at 2 (row 1 is header)
                    try:
                        # Extract data from CSV
                        institute = row['Institute'].strip().strip('"')
                        program_name = row['Academic Program Name'].strip().strip('"')
                        quota_code = row['Quota'].strip()
                        seat_type = row['Seat Type'].strip()
                        gender = row['Gender'].strip()
                        # Clean rank values - remove 'P' suffix if present (e.g., '30P' -> '30')
                        opening_rank_str = str(row['Opening Rank']).strip().rstrip('P')
                        closing_rank_str = str(row['Closing Rank']).strip().rstrip('P')
                        
                        opening_rank = float(opening_rank_str)
                        closing_rank = float(closing_rank_str)

                        # Map category - handle PwD variants by extracting base seat type
                        # "OPEN (PwD)" -> "OPEN" for category mapping, but keep full value for seat_type
                        base_seat_type = seat_type.split(' (')[0]  # Remove "(PwD)" suffix if present
                        
                        if base_seat_type not in category_map:
                            self.stdout.write(
                                self.style.WARNING(f'Row {row_num}: Unknown seat type "{seat_type}", skipping')
                            )
                            skipped_count += 1
                            continue

                        category = category_map[base_seat_type]

                        # Map quota
                        if quota_code not in quota_map:
                            self.stdout.write(
                                self.style.WARNING(f'Row {row_num}: Unknown quota "{quota_code}", skipping')
                            )
                            skipped_count += 1
                            continue

                        quota = quota_map[quota_code]

                        # Extract location from institute name (format: "College Name, Location")
                        if ',' in institute:
                            parts = institute.rsplit(',', 1)
                            college_name = parts[0].strip()
                            location = parts[1].strip()
                        else:
                            college_name = institute
                            location = 'Unknown'

                        # Parse program name to extract course details
                        # Format: "Course Name (Duration Years, Degree)"
                        # Example: "Computer Science and Engineering (4 Years, Bachelor of Technology)"
                        course_info = self.parse_program_name(program_name)
                        course_name = course_info['name']
                        branch = course_info['branch']
                        degree = course_info['degree']
                        duration = course_info['duration']

                        # Get or create college
                        college, _ = CollegeModel.objects.get_or_create(
                            name=college_name,
                            defaults={'location': location, 'college_type': 'Government'}
                        )

                        # Get or create course
                        course, _ = CourseModel.objects.get_or_create(
                            name=course_name,
                            college=college,
                            defaults={
                                'branch': branch,
                                'degree': degree,
                                'duration': duration,
                                'total_seats': 100  # Default, can be updated later
                            }
                        )

                        # Determine state based on quota code
                        if quota == 'AIQ':
                            state = 'All'
                        elif quota_code in state_map:
                            # Use mapped state name for specific quotas
                            mapped_state = state_map[quota_code]
                            if mapped_state:
                                state = mapped_state
                            elif location != 'Unknown':
                                # For HS, use location from institute name
                                state = location
                            else:
                                state = 'All'
                        else:
                            # Default: use location if available
                            state = location if location != 'Unknown' else 'All'

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
                                'opening_rank': int(opening_rank),
                                'closing_rank': int(closing_rank)
                            }
                        )

                        if created:
                            created_count += 1
                        else:
                            # Update existing entry
                            cutoff.opening_rank = int(opening_rank)
                            cutoff.closing_rank = int(closing_rank)
                            cutoff.seat_type = seat_type
                            cutoff.save()

                    except KeyError as e:
                        self.stdout.write(
                            self.style.ERROR(f'Row {row_num}: Missing column - {str(e)}')
                        )
                        error_count += 1
                    except ValueError as e:
                        self.stdout.write(
                            self.style.ERROR(f'Row {row_num}: Invalid value - {str(e)}')
                        )
                        error_count += 1
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'Row {row_num}: Error - {str(e)}')
                        )
                        error_count += 1

        # Summary
        self.stdout.write(self.style.SUCCESS('\n' + '='*50))
        self.stdout.write(self.style.SUCCESS('Import Summary:'))
        self.stdout.write(self.style.SUCCESS(f'  ✅ Created/Updated: {created_count}'))
        self.stdout.write(self.style.WARNING(f'  ⏭️  Skipped: {skipped_count}'))
        self.stdout.write(self.style.ERROR(f'  ❌ Errors: {error_count}'))
        self.stdout.write(self.style.SUCCESS('='*50))

    def parse_program_name(self, program_name):
        """
        Parse program name to extract course name, branch, degree, and duration.
        
        Example: "Computer Science and Engineering (4 Years, Bachelor of Technology)"
        Returns: {
            'name': 'Computer Science and Engineering',
            'branch': 'Computer Science and Engineering',
            'degree': 'Bachelor of Technology',
            'duration': 4
        }
        """
        # Default values
        result = {
            'name': program_name,
            'branch': 'CSE',
            'degree': 'B.Tech',
            'duration': 4
        }

        # Extract information from parentheses
        match = re.search(r'\((\d+)\s+Years?,\s*(.+?)\)', program_name)
        if match:
            duration = int(match.group(1))
            degree_full = match.group(2).strip()
            
            # Map degree
            degree_map = {
                'Bachelor of Technology': 'B.Tech',
                'Master of Technology': 'M.Tech',
                'Bachelor of Science': 'B.Sc',
                'Master of Science': 'M.Sc',
                'Bachelor of Arts': 'B.A',
                'Master of Arts': 'M.A'
            }
            
            result['duration'] = duration
            result['degree'] = degree_map.get(degree_full, 'B.Tech')
            
            # Extract course name (everything before the parentheses)
            course_name = program_name[:program_name.index('(')].strip()
            result['name'] = course_name
            
            # Map branch based on course name
            branch_map = {
                'Computer Science and Engineering': 'CSE',
                'Electronics and Communication Engineering': 'ECE',
                'Electrical and Electronics Engineering': 'EEE',
                'Mechanical Engineering': 'ME',
                'Civil Engineering': 'CE',
                'Agricultural Engineering': 'CSE'  # Default mapping
            }
            
            # Try to find matching branch
            for key, value in branch_map.items():
                if key in course_name:
                    result['branch'] = value
                    break

        return result

