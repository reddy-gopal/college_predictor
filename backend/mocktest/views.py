"""
Mocktest App Views

Design Decisions:
1. Use list/detail serializers for performance optimization
2. Separate create serializers to prevent accidental field updates
3. Filter querysets appropriately (active tests, user-specific data)
4. Add custom actions for test-taking workflow
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework import serializers
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
import random

from .models import (
    Exam, MockTest, QuestionBank, MockTestQuestion, DifficultyLevel, StudentProfile,
    TestAttempt, StudentAnswer, MistakeNotebook, StudyGuild, XPLog, Leaderboard, DailyFocus,
    Room, RoomParticipant, RoomQuestion, ParticipantAttempt
)
from .serializers import (
    ExamSerializer,
    MockTestListSerializer, MockTestDetailSerializer,
    UnifiedQuestionSerializer, QuestionListSerializer,
    DifficultyLevelSerializer,
    StudentProfileSerializer, StudentProfileCreateSerializer,
    TestAttemptListSerializer, TestAttemptDetailSerializer, TestAttemptCreateSerializer,
    StudentAnswerSerializer, StudentAnswerCreateSerializer,
    MistakeNotebookSerializer,
    StudyGuildSerializer,
    XPLogSerializer,
    LeaderboardSerializer,
    DailyFocusSerializer,
    RoomCreateSerializer, RoomListSerializer, RoomDetailSerializer, RoomJoinSerializer,
    RoomParticipantSerializer,
    RoomQuestionSerializer,
    ParticipantAttemptSerializer, ParticipantAttemptCreateSerializer,
)
from .question_utils import create_or_get_question_bank
from .room_services import (
    validate_question_pool, generate_room_questions,
    randomize_questions_for_participant, calculate_participant_score
)


class ExamViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Exam (read-only).
    """
    queryset = Exam.objects.filter(is_active=True).order_by('name')
    serializer_class = ExamSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Filter by active exams by default."""
        queryset = super().get_queryset()
        if not self.request.query_params.get('include_inactive'):
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')


class MockTestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MockTest.
    - List: Returns lightweight list with basic info
    - Retrieve: Returns detailed test with nested questions
    - Filter: Only active tests by default (can be overridden)
    - Supports filtering by exam, year, test_type
    """
    queryset = MockTest.objects.prefetch_related(
        'test_questions__question', 'difficulty', 'exam'
    ).select_related('difficulty', 'exam')
    
    def get_queryset(self):
        """
        Filter by active tests and optional exam/year/test_type filters.
        
        Architecture:
        - Full Length tests: Curated tests from MockTest table (test_type='full_length')
        - Practice/Sectional/Custom: Generated tests (test_type in ['practice', 'sectional', 'custom'])
        """
        queryset = super().get_queryset()
        
        # Only show active tests in list view unless explicitly requested
        if self.action == 'list' and not self.request.query_params.get('include_inactive'):
            queryset = queryset.filter(is_active=True)
        
        # Filter by exam
        exam_id = self.request.query_params.get('exam')
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        # Filter by year (check questions in the test via MockTestQuestion)
        year = self.request.query_params.get('year')
        if year:
            try:
                year_int = int(year)
                queryset = queryset.filter(test_questions__question__year=year_int).distinct()
            except ValueError:
                pass
        
        # Filter by test_type
        test_type = self.request.query_params.get('test_type')
        if test_type:
            queryset = queryset.filter(test_type=test_type)
            # For full_length, ensure we only show curated tests (not generated ones)
            # This is implicit since full_length tests are only created via admin/curation
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use list serializer for list, detail serializer for retrieve/update."""
        if self.action == 'list':
            return MockTestListSerializer
        return MockTestDetailSerializer
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        """
        Get questions for a test.
        Returns questions from QuestionBank via MockTestQuestion junction table.
        """
        from .models import MockTestQuestion
        from .serializers import UnifiedQuestionSerializer
        
        mock_test = self.get_object()
        
        # Get questions via MockTestQuestion
        mtq_entries = MockTestQuestion.objects.filter(
            mock_test=mock_test
        ).select_related('question').order_by('question_number')
        
        # Extract questions and question numbers
        questions = [mtq.question for mtq in mtq_entries]
        
        # Serialize questions
        serializer = UnifiedQuestionSerializer(questions, many=True)
        data = serializer.data
        
        # Add question numbers
        for idx, item in enumerate(data):
            item['question_number'] = mtq_entries[idx].question_number
        
        return Response(data)


class QuestionBankViewSet(viewsets.ModelViewSet):
    """
    ViewSet for QuestionBank.
    - List: Returns lightweight list
    - Retrieve: Returns full question details
    """
    queryset = QuestionBank.objects.select_related(
        'exam', 'difficulty_level'
    ).filter(is_active=True)
    
    def get_queryset(self):
        """Filter questions by exam, year, subject if provided."""
        queryset = super().get_queryset()
        exam_id = self.request.query_params.get('exam_id')
        year = self.request.query_params.get('year')
        subject = self.request.query_params.get('subject')
        
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        if year:
            queryset = queryset.filter(year=year)
        if subject:
            queryset = queryset.filter(subject=subject)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use list serializer for list, full serializer for detail."""
        if self.action == 'list':
            return QuestionListSerializer
        return UnifiedQuestionSerializer


class DifficultyLevelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for DifficultyLevel (read-only).
    """
    queryset = DifficultyLevel.objects.all().order_by('order', 'level')
    serializer_class = DifficultyLevelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]




class StudentProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for StudentProfile.
    - Users can only view/edit their own profile
    - Create uses separate serializer
    """
    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own profile unless staff."""
        if self.request.user.is_staff:
            return StudentProfile.objects.select_related('user').all()
        return StudentProfile.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        """Use create serializer for creation."""
        if self.action == 'create':
            return StudentProfileCreateSerializer
        return StudentProfileSerializer
    
    def perform_create(self, serializer):
        """Automatically assign user to profile."""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile."""
        try:
            profile = request.user.student_profile
            serializer = self.get_serializer(profile)
            return Response(serializer.data)
        except StudentProfile.DoesNotExist:
            return Response(
                {'detail': 'Student profile not found. Please create one.'},
                status=status.HTTP_404_NOT_FOUND
            )


class TestAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TestAttempt.
    - List: Returns lightweight list (filtered by authenticated user)
    - Retrieve: Returns detailed attempt with answers
    - Create: Starts a new test attempt
    - Custom actions: submit, calculate_score
    
    Security: Users can only see their own attempts unless staff.
    """
    permission_classes = [IsAuthenticated]  # Require authentication
    
    def get_queryset(self):
        """Users can only see their own attempts unless staff."""
        queryset = TestAttempt.objects.select_related(
            'student__user', 'mock_test'
        ).prefetch_related('answers__question_bank')
        
        user = self.request.user
        if user and not user.is_staff:
            # Filter by the authenticated user's StudentProfile
            queryset = queryset.filter(student__user=user)
        elif not user.is_authenticated:
            # If not authenticated, return empty queryset
            queryset = queryset.none()
        
        return queryset.order_by('-started_at', '-completed_at')
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'create':
            return TestAttemptCreateSerializer
        elif self.action == 'list':
            return TestAttemptListSerializer
        return TestAttemptDetailSerializer
    
    def get_serializer_context(self):
        """Add current user to serializer context."""
        context = super().get_serializer_context()
        context['user'] = self.request.user
        return context
    
    def create(self, request, *args, **kwargs):
        """Override create to return existing attempt if one exists."""
        user = self.request.user
        if not user or not user.is_authenticated:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed('Authentication required.')
        
        try:
            student_profile = user.student_profile
        except StudentProfile.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'non_field_errors': [f'Student profile not found for user: {user.email}. Please create a student profile.']
            })
        
        # Check if there's an existing incomplete attempt
        mock_test_id = request.data.get('mock_test_id')
        if mock_test_id:
            try:
                existing_attempt = TestAttempt.objects.get(
                    student=student_profile,
                    mock_test_id=mock_test_id,
                    is_completed=False
                )
                # Return existing attempt instead of creating new one
                # Use detail serializer to get full attempt data
                serializer = TestAttemptDetailSerializer(existing_attempt)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except TestAttempt.DoesNotExist:
                pass  # No existing attempt, create new one
            except TestAttempt.MultipleObjectsReturned:
                # If multiple exist, get the most recent one
                existing_attempt = TestAttempt.objects.filter(
                    student=student_profile,
                    mock_test_id=mock_test_id,
                    is_completed=False
                ).order_by('-started_at').first()
                serializer = self.get_serializer(existing_attempt)
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        # No existing attempt, create new one
        try:
            return super().create(request, *args, **kwargs)
        except serializers.ValidationError as e:
            # Return validation errors in proper format
            from rest_framework.exceptions import ValidationError
            raise ValidationError(e.detail)
    
    def perform_create(self, serializer):
        """Create attempt for current user's student profile."""
        user = self.request.user
        if not user.is_authenticated:
            from rest_framework.exceptions import AuthenticationFailed
            raise AuthenticationFailed('Authentication required.')
        
        # Check phone verification before allowing test attempts
        if not user.is_phone_verified:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'non_field_errors': ['Please verify your phone number before taking tests. Visit your profile to verify.']
            })
        
        try:
            student_profile = user.student_profile
        except StudentProfile.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'non_field_errors': [f'Student profile not found for user: {user.email}. Please create a student profile.']
            })
        
        # Determine test_mode based on MockTest.test_type
        mock_test = serializer.validated_data.get('mock_test')
        if mock_test:
            # Full length tests are preset, others are custom
            test_mode = 'preset' if mock_test.test_type == 'full_length' else 'custom'
            serializer.save(student=student_profile, test_mode=test_mode)
        else:
            serializer.save(student=student_profile)
    
    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit or update an answer for a question in this attempt."""
        attempt = self.get_object()
        user = self.request.user
        
        # Verify attempt belongs to user (or default user)
        if user and attempt.student.user != user:
            return Response(
                {'detail': 'You do not have permission to modify this attempt.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify attempt is not completed
        if attempt.is_completed:
            return Response(
                {'detail': 'Cannot submit answers to a completed test.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = StudentAnswerCreateSerializer(
            data=request.data,
            context={'attempt': attempt, 'request': request}
        )
        
        if serializer.is_valid():
            question_bank = serializer.validated_data['question_bank']
            selected_option = serializer.validated_data.get('selected_option', '')
            time_taken = serializer.validated_data.get('time_taken_seconds', 0)
            
            # Get or create answer
            answer, created = StudentAnswer.objects.get_or_create(
                attempt=attempt,
                question_bank=question_bank,
                defaults={
                    'selected_option': selected_option,
                    'time_taken_seconds': time_taken,
                }
            )
            
            if not created:
                answer.selected_option = selected_option
                answer.time_taken_seconds = time_taken
                answer.save()
            
            # Check if answer is correct
            is_correct = (selected_option.upper() == question_bank.correct_option.upper())
            answer.is_correct = is_correct
            
            # Calculate marks
            if is_correct:
                answer.marks_obtained = question_bank.marks
            elif selected_option:  # Wrong answer (not blank)
                answer.marks_obtained = -question_bank.negative_marks
            else:  # Unanswered
                answer.marks_obtained = 0.0
            
            answer.save()
            
            return Response(StudentAnswerSerializer(answer).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit the test attempt and calculate final score."""
        attempt = self.get_object()
        
        # Verify attempt belongs to user
        user = self.request.user
        if attempt.student.user != user:
            return Response(
                {'detail': 'You do not have permission to submit this attempt.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verify attempt is not already completed
        if attempt.is_completed:
            return Response(
                {'detail': 'Test has already been submitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate score
        answers = attempt.answers.all()
        total_score = sum(answer.marks_obtained for answer in answers)
        correct_count = answers.filter(is_correct=True).count()
        wrong_count = answers.filter(is_correct=False, selected_option__gt='').count()
        unanswered_count = answers.filter(selected_option='').count()
        
        # Update attempt
        attempt.score = total_score
        attempt.correct_count = correct_count
        attempt.wrong_count = wrong_count
        attempt.unanswered_count = unanswered_count
        attempt.percentage = (total_score / attempt.mock_test.total_marks * 100) if attempt.mock_test.total_marks > 0 else 0
        attempt.is_completed = True
        attempt.completed_at = timezone.now()
        
        # Calculate time taken
        if attempt.started_at:
            time_delta = attempt.completed_at - attempt.started_at
            attempt.time_taken_seconds = int(time_delta.total_seconds())
        
        # Award XP for test completion BEFORE saving (so signal can detect it)
        from .gamification import award_xp, calculate_streaks
        from datetime import date
        today = date.today()
        
        # Check if this is the first test of the day
        today_tests = TestAttempt.objects.filter(
            student=attempt.student,
            is_completed=True,
            completed_at__date=today
        ).exclude(id=attempt.id).count()
        
        # XP Rules:
        # +10 XP for first completed test of the day
        # +5 XP for additional tests (max XP cap per day = 20)
        if today_tests == 0:
            # First test of the day
            base_xp = 10
        else:
            # Additional tests
            base_xp = 5
        
        # Check daily XP cap (max 20 XP per day from tests)
        today_xp = XPLog.objects.filter(
            student=attempt.student,
            source_type='test_completed',
            logged_at__date=today
        ).aggregate(total=Sum('xp_amount'))['total'] or 0
        
        if today_xp + base_xp <= 20:
            award_xp(
                student_profile=attempt.student,
                xp_amount=base_xp,
                action=f"Completed {'custom' if attempt.test_mode == 'custom' else 'mock'} test",
                source_type='test_completed',
                source_id=attempt.id
            )
        
        # Now save the attempt
        attempt.save()
        
        # Award XP for task completion (take-test, weekly-goal) after test is completed
        # Only award "take-test" task XP for first test of the day
        if today_tests == 0:
            # Check if already awarded today
            if not XPLog.objects.filter(
                student=attempt.student,
                source_type='task_completion',
                action__contains='take-test',
                logged_at__date=today
            ).exists():
                award_xp(
                    student_profile=attempt.student,
                    xp_amount=50,
                    action='Completed take-test task (first test of the day)',
                    source_type='task_completion',
                    source_id=None
                )
        
        # Check and award XP for "weekly-goal" task
        from .gamification import calculate_weekly_goal_progress
        from datetime import timedelta
        weekly_progress = calculate_weekly_goal_progress(attempt.student)
        
        # Check if weekly goal was just met (completed == goal)
        if weekly_progress['completed'] == weekly_progress['goal'] and weekly_progress['goal'] > 0:
            # Check if already awarded this week
            week_start = today - timedelta(days=today.weekday())
            if not XPLog.objects.filter(
                student=attempt.student,
                source_type='task_completion',
                action__contains='weekly-goal',
                logged_at__date__gte=week_start
            ).exists():
                award_xp(
                    student_profile=attempt.student,
                    xp_amount=30,
                    action='Completed weekly-goal task',
                    source_type='task_completion',
                    source_id=None
                )
        
        # Calculate percentile (compare with all completed attempts of same test)
        # Percentile = (Number of people who scored LESS than or equal to you / Total number of people) * 100
        # This means: if you scored better than 80% of people, your percentile is 80
        all_attempts = TestAttempt.objects.filter(
            mock_test=attempt.mock_test,
            is_completed=True,
            score__isnull=False
        )
        
        # Include current attempt in the calculation
        total_completed = all_attempts.count()
        
        if total_completed > 0:
            # Count how many people scored less than or equal to this score
            # (including the current attempt itself)
            scores_less_or_equal = all_attempts.filter(score__lte=total_score).count()
            
            # Percentile = (scores_less_or_equal / total_completed) * 100
            # This gives the percentage of people you scored better than or equal to
            attempt.percentile = (scores_less_or_equal / total_completed) * 100
        else:
            # If this is the first attempt, percentile is 100 (you're the best!)
            attempt.percentile = 100.0
        
        attempt.save()
        
        # Check for streak bonuses
        streaks = calculate_streaks(attempt.student)
        current_streak = streaks['current']
        
        # Award streak bonuses (only once per streak milestone)
        if current_streak == 5:
            # Check if 5-day streak bonus already awarded
            if not XPLog.objects.filter(
                student=attempt.student,
                source_type='streak_bonus',
                action__contains='5-day streak',
                logged_at__date=today
            ).exists():
                award_xp(
                    student_profile=attempt.student,
                    xp_amount=25,
                    action="5-day streak bonus",
                    source_type='streak_bonus',
                    source_id=None
                )
        elif current_streak == 10:
            # Check if 10-day streak bonus already awarded
            if not XPLog.objects.filter(
                student=attempt.student,
                source_type='streak_bonus',
                action__contains='10-day streak',
                logged_at__date=today
            ).exists():
                award_xp(
                    student_profile=attempt.student,
                    xp_amount=50,
                    action="10-day streak bonus",
                    source_type='streak_bonus',
                    source_id=None
                )
        
        # Log mistakes to MistakeNotebook
        # Get all incorrect answers (wrong answers and unanswered)
        incorrect_answers = answers.filter(
            Q(is_correct=False) | Q(selected_option='')
        ).select_related('question_bank')
        
        for answer in incorrect_answers:
            # Determine error type based on answer status
            if answer.selected_option == '':
                error_type = MistakeNotebook.ErrorType.NOT_ATTEMPTED
            else:
                # Default to conceptual error for wrong answers
                # Students can update this later
                error_type = MistakeNotebook.ErrorType.CONCEPTUAL
            
            # Check if mistake already exists for this question in this attempt
            # to avoid duplicates
            existing_mistake = MistakeNotebook.objects.filter(
                student=attempt.student,
                question_bank=answer.question_bank,
                attempt=attempt
            ).first()
            
            if not existing_mistake:
                MistakeNotebook.objects.create(
                    student=attempt.student,
                    question_bank=answer.question_bank,
                    attempt=attempt,
                    error_type=error_type,
                    notes=''
                )
        
        # Mark daily focus (attendance) for today
        from datetime import date
        today = date.today()
        
        # Determine source based on test mode
        if attempt.test_mode == 'custom':
            source = DailyFocus.Source.CUSTOM_TEST
        else:
            source = DailyFocus.Source.MOCK_TEST
        
        # Get or create daily focus record for today
        daily_focus, created = DailyFocus.objects.get_or_create(
            student=attempt.student,
            date=today,
            defaults={
                'status': DailyFocus.Status.PRESENT,
                'source': source,
            }
        )
        
        # If record already exists, update source if needed (but keep status as present)
        if not created:
            daily_focus.source = source
            daily_focus.status = DailyFocus.Status.PRESENT
            daily_focus.save()
        
        # Note: XP for test completion and task completion is handled by signals
        # The signal will check if test_completed XP exists and award task XP accordingly
        
        serializer = TestAttemptDetailSerializer(attempt)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def answers(self, request, pk=None):
        """Get all answers for this attempt, ordered by question number."""
        attempt = self.get_object()
        
        user = self.request.user
        if attempt.student.user != user and not user.is_staff:
            return Response(
                {'detail': 'You do not have permission to view these answers.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get answers with question_bank prefetched
        answers = attempt.answers.all().select_related('question_bank')
        
        # Get question numbers from MockTestQuestion and sort answers by question number
        from .models import MockTestQuestion
        mtq_map = {
            mtq.question_id: mtq.question_number
            for mtq in MockTestQuestion.objects.filter(
                mock_test=attempt.mock_test
            ).select_related('question')
        }
        
        # Sort answers by question number
        answers_list = list(answers)
        answers_list.sort(key=lambda a: mtq_map.get(a.question_bank_id, 9999))
        
        serializer = StudentAnswerSerializer(answers_list, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='unattempted')
    def unattempted(self, request, pk=None):
        """Get unattempted questions for this test attempt."""
        attempt = self.get_object()
        
        user = self.request.user
        if attempt.student.user != user and not user.is_staff:
            return Response(
                {'detail': 'You do not have permission to view these questions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all questions from the mock test
        mock_test = attempt.mock_test
        if not mock_test:
            return Response({
                'detail': 'Mock test not found for this attempt.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get all questions for this mock test via MockTestQuestion
        from .models import MockTestQuestion
        mtq_entries = MockTestQuestion.objects.filter(
            mock_test=mock_test
        ).select_related('question').order_by('question_number')
        
        # Get all attempted question IDs
        attempted_question_ids = set(
            attempt.answers.values_list('question_bank_id', flat=True)
        )
        
        # Find unattempted questions
        unattempted_data = []
        for mtq in mtq_entries:
            question = mtq.question
            if question.id not in attempted_question_ids:
                unattempted_data.append({
                    'question_number': mtq.question_number,
                    'question': UnifiedQuestionSerializer(question).data,
                    'correct_option': question.correct_option,
                    'marks': question.marks,
                })
        
        # Sort by question number
        unattempted_data.sort(key=lambda x: x['question_number'])
        
        return Response({
            'attempt_id': attempt.id,
            'total_unattempted': len(unattempted_data),
            'unattempted_questions': unattempted_data
        })
    
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        Get statistics for the authenticated user's test attempts.
        Returns average_score and best_score.
        """
        user = request.user
        if not user.is_authenticated:
            return Response(
                {'detail': 'Authentication required.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            student_profile = user.student_profile
        except StudentProfile.DoesNotExist:
            return Response(
                {'detail': 'Student profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all completed attempts for this student
        completed_attempts = TestAttempt.objects.filter(
            student=student_profile,
            is_completed=True,
            completed_at__isnull=False
        ).exclude(score__isnull=True)
        
        if not completed_attempts.exists():
            return Response({
                'average_score': None,
                'best_score': None
            })
        
        # Calculate average score and best score
        from django.db.models import Avg, Max
        avg_score_result = completed_attempts.aggregate(avg_score=Avg('score'))
        average_score = avg_score_result['avg_score'] if avg_score_result['avg_score'] is not None else None
        
        best_score_result = completed_attempts.aggregate(best_score=Max('score'))
        best_score = best_score_result['best_score'] if best_score_result['best_score'] is not None else None
        
        return Response({
            'average_score': round(average_score, 2) if average_score is not None else None,
            'best_score': round(best_score, 2) if best_score is not None else None
        })


class StudentAnswerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for StudentAnswer.
    - Primarily used through TestAttempt actions
    - Users can only view/edit their own answers
    """
    serializer_class = StudentAnswerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own answers unless staff."""
        queryset = StudentAnswer.objects.select_related(
            'attempt__student__user', 'question_bank'
        )
        
        if not self.request.user.is_staff:
            queryset = queryset.filter(attempt__student__user=self.request.user)
        
        return queryset.order_by('attempt', 'id')
    
    def get_serializer_class(self):
        """Use create serializer for creation."""
        if self.action in ['create', 'update', 'partial_update']:
            return StudentAnswerCreateSerializer
        return StudentAnswerSerializer


class MistakeNotebookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MistakeNotebook.
    - Users can only view/edit their own mistakes
    """
    serializer_class = MistakeNotebookSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own mistakes unless staff."""
        queryset = MistakeNotebook.objects.select_related(
            'student__user', 'question_bank', 'attempt'
        )
        
        if not self.request.user.is_staff:
            queryset = queryset.filter(student__user=self.request.user)
        
        return queryset.order_by('-logged_at')
    
    def perform_create(self, serializer):
        """Automatically assign student to mistake entry."""
        student_profile = self.request.user.student_profile
        serializer.save(student=student_profile)


class StudyGuildViewSet(viewsets.ModelViewSet):
    """
    ViewSet for StudyGuild.
    - Users can view all active guilds
    - Users can create guilds and become leaders
    """
    queryset = StudyGuild.objects.prefetch_related(
        'leader__user', 'members__user'
    ).filter(is_active=True)
    serializer_class = StudyGuildSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def perform_create(self, serializer):
        """Set current user as guild leader."""
        student_profile = self.request.user.student_profile
        serializer.save(leader=student_profile)
    
    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a study guild."""
        guild = self.get_object()
        student_profile = request.user.student_profile
        
        if guild.members.filter(id=student_profile.id).exists():
            return Response(
                {'detail': 'You are already a member of this guild.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        guild.members.add(student_profile)
        serializer = self.get_serializer(guild)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a study guild."""
        guild = self.get_object()
        student_profile = request.user.student_profile
        
        if not guild.members.filter(id=student_profile.id).exists():
            return Response(
                {'detail': 'You are not a member of this guild.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if guild.leader == student_profile:
            return Response(
                {'detail': 'Guild leader cannot leave. Transfer leadership first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        guild.members.remove(student_profile)
        serializer = self.get_serializer(guild)
        return Response(serializer.data)


class XPLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for XPLog (read-only).
    - Users can only view their own XP logs
    """
    serializer_class = XPLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own XP logs unless staff."""
        queryset = XPLog.objects.select_related('student__user')
        
        if not self.request.user.is_staff:
            queryset = queryset.filter(student__user=self.request.user)
        
        return queryset.order_by('-logged_at')


class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Leaderboard (read-only).
    - Public read access
    - Filter by leaderboard_type
    """
    queryset = Leaderboard.objects.select_related('student__user').all()
    serializer_class = LeaderboardSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Filter by leaderboard type if provided."""
        queryset = super().get_queryset()
        leaderboard_type = self.request.query_params.get('type')
        if leaderboard_type:
            queryset = queryset.filter(leaderboard_type=leaderboard_type)
        return queryset.order_by('leaderboard_type', 'rank', '-total_score')


class DailyFocusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for DailyFocus (read-only).
    - Users can only view their own daily focus records
    """
    serializer_class = DailyFocusSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Users can only see their own daily focus records unless staff."""
        queryset = DailyFocus.objects.select_related('student__user')
        
        if not self.request.user.is_staff:
            queryset = queryset.filter(student__user=self.request.user)
        
        return queryset.order_by('-date')
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's focus status for the logged-in user."""
        from datetime import date
        today = date.today()
        
        try:
            student_profile = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return Response(
                {'detail': 'Student profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            daily_focus = DailyFocus.objects.get(
                student=student_profile,
                date=today
            )
            serializer = self.get_serializer(daily_focus)
            return Response(serializer.data)
        except DailyFocus.DoesNotExist:
            return Response({
                'date': today.isoformat(),
                'status': None,
                'status_display': 'Rest Day',
                'source': None,
                'source_display': None,
            })
    
    @action(detail=False, methods=['get'])
    def monthly(self, request):
        """Get monthly attendance calendar for the logged-in user."""
        from datetime import date, timedelta
        from calendar import monthrange
        
        # Get month and year from query params (default to current month)
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        
        try:
            student_profile = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return Response(
                {'detail': 'Student profile not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get first and last day of month
        first_day = date(year, month, 1)
        last_day = date(year, month, monthrange(year, month)[1])
        
        # Get all daily focus records for this month
        daily_focus_records = DailyFocus.objects.filter(
            student=student_profile,
            date__gte=first_day,
            date__lte=last_day
        ).values('date', 'status', 'source')
        
        # Create a dictionary for quick lookup
        focus_dict = {
            str(record['date']): {
                'status': record['status'],
                'source': record['source'],
            }
            for record in daily_focus_records
        }
        
        # Build calendar data
        calendar_data = []
        current_date = first_day
        while current_date <= last_day:
            date_str = current_date.isoformat()
            if date_str in focus_dict:
                calendar_data.append({
                    'date': date_str,
                    'status': focus_dict[date_str]['status'],
                    'status_display': 'Present' if focus_dict[date_str]['status'] == 'present' else 'Partial',
                    'source': focus_dict[date_str]['source'],
                })
            else:
                calendar_data.append({
                    'date': date_str,
                    'status': None,
                    'status_display': 'Rest Day',
                    'source': None,
                })
            current_date += timedelta(days=1)
        
        return Response({
            'year': year,
            'month': month,
            'calendar': calendar_data,
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_test_from_mistakes(request):
    """
    Generate a custom test from the student's mistakes in MistakeNotebook.
    
    Request payload (optional):
    {
        "error_types": ["conceptual", "calculation"],  # Filter by error types
        "question_count": 20  # Max questions to include (default: all available)
    }
    
    Note: Each question has a fixed duration of 4 minutes (not customizable).
    
    Returns:
    {
        "test_id": 123,
        "questions_count": 20,
        "message": "Test generated successfully from your mistakes"
    }
    """
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        return Response(
            {'detail': 'Student profile not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        return Response(
            {'detail': f'Error accessing student profile: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Get optional filters
    error_types = request.data.get('error_types', [])
    question_count = request.data.get('question_count', None)
    # Fixed duration: 4 minutes per question (not customizable)
    time_per_question = 4
    
    # Get mistakes from MistakeNotebook
    mistakes_query = MistakeNotebook.objects.filter(
        student=student_profile
    ).select_related('question_bank', 'question_bank__exam', 'question_bank__difficulty_level')
    
    # Filter by error types if provided
    if error_types:
        mistakes_query = mistakes_query.filter(error_type__in=error_types)
    
    # Get unique questions (avoid duplicates)
    mistakes = mistakes_query.order_by('-logged_at')
    question_ids = []
    unique_mistakes = []
    seen_questions = set()
    
    for mistake in mistakes:
        if mistake.question_bank_id not in seen_questions:
            seen_questions.add(mistake.question_bank_id)
            unique_mistakes.append(mistake)
            question_ids.append(mistake.question_bank_id)
    
    if not unique_mistakes:
        return Response(
            {'detail': 'No mistakes found to generate test from.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Limit question count if specified
    if question_count and question_count < len(unique_mistakes):
        unique_mistakes = unique_mistakes[:question_count]
        question_ids = question_ids[:question_count]
    
    # Get the first question to determine exam
    first_question = unique_mistakes[0].question_bank
    exam = first_question.exam
    
    if not exam:
        return Response(
            {'detail': 'Questions must have an associated exam.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate duration (will be updated after questions are created)
    estimated_question_count = len(unique_mistakes)
    duration_minutes = int(estimated_question_count * time_per_question)
    
    # Create test title (will be updated if question count changes)
    error_type_str = ', '.join(error_types) if error_types else 'All Mistakes'
    test_title = f"Practice Test - {error_type_str.title()} ({estimated_question_count} Questions)"
    
    # Create MockTest
    mock_test = MockTest.objects.create(
        title=test_title,
        exam=exam,
        test_type='custom',
        total_questions=estimated_question_count,
        duration_minutes=duration_minutes,
        marks_per_question=4.0,
        negative_marks=1.0,
        is_active=True
    )
    
    # Create questions for the test (copy from original questions)
    created_questions = 0
    successfully_created_mistake_ids = []
    
    for idx, mistake in enumerate(unique_mistakes, start=1):
        original_question = mistake.question_bank
        
        # Skip if question doesn't have required fields
        if not original_question:
            continue
        if not original_question.difficulty_level:
            continue
        if not original_question.subject:
            continue
        if not original_question.correct_option:
            continue
        
        try:
            # Create MockTestQuestion entry (reuse existing QuestionBank entry)
            MockTestQuestion.objects.create(
                mock_test=mock_test,
                question=original_question,
                question_number=created_questions + 1
            )
            created_questions += 1
            successfully_created_mistake_ids.append(mistake.id)
        except Exception as e:
            # Log the error and continue with next question
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating question {idx} from mistake {mistake.id}: {str(e)}")
            continue
    
    # Update test with actual question count
    if created_questions == 0:
        # Delete the test if no questions were created
        mock_test.delete()
        return Response(
            {'detail': 'Could not create any questions from mistakes. Please check your mistakes have valid questions.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    mock_test.total_questions = created_questions
    mock_test.duration_minutes = int(created_questions * time_per_question)
    
    # Recalculate total_marks from actual question marks
    from django.db.models import Sum
    total_marks = mock_test.test_questions.aggregate(
        total=Sum('question__marks')
    )['total'] or 0.0
    if total_marks > 0:
        mock_test.total_marks = total_marks
        mock_test.save(update_fields=['total_marks'])
    
    # Recalculate total_marks from actual question marks
    from django.db.models import Sum
    total_marks = mock_test.test_questions.aggregate(
        total=Sum('question__marks')
    )['total'] or 0.0
    if total_marks > 0:
        mock_test.total_marks = total_marks
        mock_test.save(update_fields=['total_marks'])
    error_type_str = ', '.join(error_types) if error_types else 'All Mistakes'
    mock_test.title = f"Practice Test - {error_type_str.title()} ({created_questions} Questions)"
    mock_test.save()
    
    # Remove successfully created mistakes from MistakeNotebook
    if successfully_created_mistake_ids:
        MistakeNotebook.objects.filter(id__in=successfully_created_mistake_ids).delete()
    
    # Store generation config
    generation_config = {
        'source': 'mistake_notebook',
        'error_types': error_types if error_types else 'all',
        'mistake_ids': successfully_created_mistake_ids,
        'question_count': created_questions,
        'time_per_question': time_per_question,
    }
    
    return Response({
        'test_id': mock_test.id,
        'questions_count': created_questions,
        'message': f'Test generated successfully from {created_questions} mistake(s). Mistakes have been removed from your notebook.',
        'generation_config': generation_config
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_task(request):
    """
    Mark a task as complete and award XP.
    
    Note: "take-test" and "weekly-goal" tasks are automatically completed via signals
    when tests are submitted. This endpoint only handles "review-questions" task.
    
    Request payload:
    {
        "task_id": "review-questions"
    }
    
    Returns:
    {
        "message": "Task completed successfully",
        "xp_awarded": 20,
        "total_xp": 150
    }
    """
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        return Response(
            {'detail': 'Student profile not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    task_id = request.data.get('task_id')
    if not task_id:
        return Response(
            {'detail': 'task_id is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Only allow "review-questions" task to be completed manually
    # "take-test" and "weekly-goal" are completed automatically via signals when tests are submitted
    if task_id == 'review-questions':
        xp_amount = 20
        
        # Check if already awarded today
        today = date.today()
        if XPLog.objects.filter(
            student=student_profile,
            source_type='task_completion',
            action__contains='review-questions',
            logged_at__date=today
        ).exists():
            return Response(
                {'detail': 'Task already completed today.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Award XP
        from .gamification import award_xp
        
        award_xp(
            student_profile=student_profile,
            xp_amount=xp_amount,
            action='Completed review mistakes task',
            source_type='task_completion',
            source_id=None
        )
        
        # Refresh student profile to get updated total_xp
        student_profile.refresh_from_db()
        
        return Response({
            'message': 'Task completed successfully',
            'xp_awarded': xp_amount,
            'total_xp': student_profile.total_xp,
        }, status=status.HTTP_200_OK)
    elif task_id in ['take-test', 'weekly-goal']:
        return Response(
            {'detail': f'Task "{task_id}" is automatically completed when you finish a test. No manual completion needed.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    else:
        return Response(
            {'detail': f'Invalid task_id: {task_id}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_todays_tasks(request):
    """
    Get today's available tasks for the logged-in user.
    Returns tasks that can actually be completed and their XP rewards.
    
    Returns:
    {
        "tasks": [
            {
                "id": "take-test",
                "title": "Take a practice test",
                "description": "Complete a mock test to track your progress",
                "xp_reward": 50,
                "href": "/mock-tests",
                "cta": "Start Test",
                "priority": "high",
                "available": true
            },
            ...
        ]
    }
    """
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        return Response(
            {'detail': 'Student profile not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from datetime import date, timedelta
    from .gamification import calculate_weekly_goal_progress
    from .models import TestAttempt
    
    today = date.today()
    tasks = []
    
    # Check if user has taken a test today
    today_tests = TestAttempt.objects.filter(
        student=student_profile,
        is_completed=True,
        completed_at__date=today
    ).count()
    
    # Task 1: Take practice test (if not taken today)
    if today_tests == 0:
        # Check if "take-test" task XP was already awarded today
        take_test_xp_awarded = XPLog.objects.filter(
            student=student_profile,
            source_type='task_completion',
            action__contains='take-test',
            logged_at__date=today
        ).exists()
        
        if not take_test_xp_awarded:
            tasks.append({
                'id': 'take-test',
                'title': 'Take a practice test',
                'description': 'Complete a mock test to track your progress',
                'xp_reward': 50,
                'href': '/mock-tests',
                'cta': 'Start Test',
                'priority': 'high',
                'available': True,
            })
    
    # Task 2: Weekly goal check
    weekly_progress = calculate_weekly_goal_progress(student_profile)
    if weekly_progress['completed'] < weekly_progress['goal']:
        remaining = weekly_progress['goal'] - weekly_progress['completed']
        
        # Check if "weekly-goal" task XP was already awarded this week
        week_start = today - timedelta(days=today.weekday())
        weekly_goal_xp_awarded = XPLog.objects.filter(
            student=student_profile,
            source_type='task_completion',
            action__contains='weekly-goal',
            logged_at__date__gte=week_start
        ).exists()
        
        if not weekly_goal_xp_awarded:
            tasks.append({
                'id': 'weekly-goal',
                'title': f"Complete weekly goal ({remaining} {remaining == 1 and 'test' or 'tests'} left)",
                'description': f"You've completed {weekly_progress['completed']}/{weekly_progress['goal']} tests this week",
                'xp_reward': 30,
                'href': '/mock-tests',
                'cta': 'Take Test',
                'priority': 'medium',
                'available': True,
            })
    
    # Task 3: Review wrong questions (if tests exist)
    recent_tests = TestAttempt.objects.filter(
        student=student_profile,
        is_completed=True
    ).order_by('-completed_at')[:1]
    
    if recent_tests.exists():
        # Check if "review-questions" task XP was already awarded today
        review_xp_awarded = XPLog.objects.filter(
            student=student_profile,
            source_type='task_completion',
            action__contains='review-questions',
            logged_at__date=today
        ).exists()
        
        if not review_xp_awarded:
            tasks.append({
                'id': 'review-questions',
                'title': 'Review weak questions',
                'description': 'Go through questions you got wrong to improve',
                'xp_reward': 20,
                'href': '/mistake-notebook',
                'cta': 'Review',
                'priority': 'low',
                'available': True,
            })
    
    return Response({
        'tasks': tasks
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gamification_summary(request):
    """
    Get gamification summary for the logged-in user.
    Returns: total_xp, current_level, current_streak, best_streak, weekly_goal_progress
    """
    try:
        student_profile = request.user.student_profile
    except StudentProfile.DoesNotExist:
        return Response(
            {'detail': 'Student profile not found.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    from .gamification import calculate_streaks, calculate_weekly_goal_progress
    
    # Calculate streaks
    streaks = calculate_streaks(student_profile)
    
    # Calculate weekly goal progress
    weekly_progress = calculate_weekly_goal_progress(student_profile)
    
    # Calculate level from total_xp (500 XP per level)
    total_xp = student_profile.total_xp or 0
    current_level = (total_xp // 500) + 1
    xp_in_current_level = total_xp % 500
    xp_for_next_level = 500
    level_progress = (xp_in_current_level / xp_for_next_level * 100) if xp_for_next_level > 0 else 0
    
    return Response({
        'total_xp': total_xp,
        'current_level': current_level,
        'xp_in_current_level': xp_in_current_level,
        'xp_for_next_level': xp_for_next_level,
        'level_progress': round(level_progress, 2),
        'current_streak': streaks['current'],
        'best_streak': streaks['max'],
        'weekly_goal': {
            'completed': weekly_progress['completed'],
            'goal': weekly_progress['goal'],
            'percentage': round((weekly_progress['completed'] / weekly_progress['goal'] * 100) if weekly_progress['goal'] > 0 else 0, 2)
        }
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_exam_years(request):
    """
    Get distinct years available for an exam from Questions table.
    
    Query params:
    - exam_id: required
    
    Returns:
    {
        "years": [2020, 2021, 2022, 2023, 2024]
    }
    """
    exam_id = request.query_params.get('exam_id')
    
    if not exam_id:
        return Response(
            {'detail': 'exam_id is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        exam = Exam.objects.get(id=exam_id, is_active=True)
    except Exam.DoesNotExist:
        return Response(
            {'detail': 'Exam not found or inactive.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get distinct years from QuestionBank for this exam
    years = QuestionBank.objects.filter(
        exam=exam,
        year__isnull=False,
        is_active=True
    ).values_list('year', flat=True).distinct().order_by('-year')
    
    years_list = list(years)
    
    return Response({'years': years_list}, status=status.HTTP_200_OK)


@api_view(['GET'])
def get_available_questions_count(request):
    """
    Get count of available questions based on filters.
    
    Query params:
    - exam_id: required (integer)
    - years: comma-separated list (e.g., "2022,2023") or can be empty
    - subjects: comma-separated list (optional, e.g., "Physics,Chemistry")
    - difficulty: comma-separated list (optional, e.g., "easy,medium,hard")
    
    Returns:
    {
        "count": 150
    }
    """
    exam_id = request.query_params.get('exam_id')
    years_str = request.query_params.get('years', '')
    subjects_str = request.query_params.get('subjects', '')
    difficulty_str = request.query_params.get('difficulty', '')
    
    # Validate exam_id
    if not exam_id:
        return Response(
            {'detail': 'exam_id is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        exam_id = int(exam_id)
    except (ValueError, TypeError):
        return Response(
            {'detail': 'exam_id must be a valid integer.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get exam
    try:
        exam = Exam.objects.get(id=exam_id, is_active=True)
    except Exam.DoesNotExist:
        return Response(
            {'detail': 'Exam not found or inactive.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Parse years - handle empty string, comma-separated values, and array-like strings
    years = []
    if years_str:
        try:
            # Handle both comma-separated strings and potential array formats
            years_list = years_str.split(',') if isinstance(years_str, str) else years_str
            years = [int(y.strip()) for y in years_list if y and y.strip()]
        except (ValueError, AttributeError):
            return Response(
                {'detail': 'Invalid years format. Expected comma-separated integers (e.g., "2022,2023").'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    # Build base query - query QuestionBank directly (questions can be reused across tests)
    query = Q(exam=exam, is_active=True)
    
    # Add year filter if years are provided
    if years:
        query &= Q(year__in=years)
    else:
        # If no years specified, include all years (but still filter by exam)
        pass
    
    # Parse and filter by subjects
    if subjects_str:
        subjects = [s.strip() for s in subjects_str.split(',') if s and s.strip()]
        if subjects:
            # Case-insensitive subject matching
            query &= Q(subject__in=subjects)
    
    # Parse and filter by difficulty
    if difficulty_str:
        difficulty_list = [d.strip().lower() for d in difficulty_str.split(',') if d and d.strip()]
        if difficulty_list:
            # Get difficulty levels - normalize to lowercase for matching
            # The level field stores values like 'easy', 'medium', 'hard', 'very_hard'
            difficulty_levels = DifficultyLevel.objects.filter(
                level__in=difficulty_list
            )
            
            if difficulty_levels.exists():
                query &= Q(difficulty_level__in=difficulty_levels)
            else:
                # If requested difficulty levels don't exist, return 0
                return Response({'count': 0}, status=status.HTTP_200_OK)
    
    # Count available questions from QuestionBank
    try:
        count = QuestionBank.objects.filter(query).count()
    except Exception as e:
        # Log error for debugging
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Error counting questions: {str(e)}")
        traceback.print_exc()
        return Response(
            {'detail': 'Error counting questions. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({'count': count}, status=status.HTTP_200_OK)


@api_view(['POST'])
def generate_test(request):
    """
    Generate a test dynamically from Question table based on exam, years, test_type, and filters.
    
    Architecture:
    - Source: Question table (standalone questions where mock_test__isnull=True)
    - Creates temporary MockTest for consistency with TestAttempt
    - Sets test_mode='custom' in TestAttempt
    - Stores generation_config for tracking
    
    Request payload:
    {
        "exam": 1,  # or "exam_id": 1 (both supported)
        "years": [2022, 2023],
        "test_type": "practice" | "sectional" | "custom",
        "subjects": ["Physics", "Chemistry"],  # Required for sectional/custom
        "difficulty": ["medium", "hard"],  # Optional
        "question_count": 30,
        "time_per_question": 2  # minutes, max 4
    }
    
    Returns:
    {
        "test_id": 123
    }
    """
    # Get current user (or default user for development)
    user = request.user if request.user.is_authenticated else None
    if not user:
        from accounts.models import CustomUser
        try:
            user = CustomUser.objects.get(email='el@gmail.com')
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'User not found. Please authenticate or create default user.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    # Get student profile
    try:
        student_profile = user.student_profile
    except StudentProfile.DoesNotExist:
        return Response(
            {'detail': 'Student profile not found. Please create a student profile.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate request data
    # Support both "exam" and "exam_id" for compatibility
    exam_id = request.data.get('exam') or request.data.get('exam_id')
    years = request.data.get('years', [])
    test_type = request.data.get('test_type')
    subjects = request.data.get('subjects', [])
    difficulty = request.data.get('difficulty', [])
    question_count = request.data.get('question_count', 30)
    time_per_question = request.data.get('time_per_question', 2)
    
    if not exam_id:
        return Response(
            {'detail': 'exam (or exam_id) is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not years or len(years) == 0:
        return Response(
            {'detail': 'At least one year is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not test_type:
        return Response(
            {'detail': 'test_type is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate test_type (must not be full_length)
    if test_type == 'full_length':
        return Response(
            {'detail': 'Full length tests must be selected from predefined tests.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate test_type
    valid_test_types = ['practice', 'sectional', 'custom', 'topic_wise']
    if test_type not in valid_test_types:
        return Response(
            {'detail': f'Invalid test_type. Must be one of: {", ".join(valid_test_types)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Subject is required for sectional and custom
    if test_type in ['sectional', 'custom'] and not subjects:
        return Response(
            {'detail': 'subjects are required for sectional and custom tests.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate time_per_question (max 4 minutes)
    if time_per_question > 4:
        return Response(
            {'detail': 'time_per_question cannot exceed 4 minutes.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if time_per_question < 0.5:
        return Response(
            {'detail': 'time_per_question must be at least 0.5 minutes.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Calculate duration
    duration_minutes = int(question_count * time_per_question)
    
    # Get exam
    try:
        exam = Exam.objects.get(id=exam_id, is_active=True)
    except Exam.DoesNotExist:
        return Response(
            {'detail': 'Exam not found or inactive.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Build query to filter questions
    query = Q(exam=exam, year__in=years)
    
    if subjects:
        query &= Q(subject__in=subjects)
    
    if difficulty:
        # Normalize difficulty values to lowercase for matching
        # The level field stores values like 'easy', 'medium', 'hard', 'very_hard'
        difficulty_normalized = [d.lower() if isinstance(d, str) else d for d in difficulty]
        # Get difficulty level objects
        difficulty_levels = DifficultyLevel.objects.filter(level__in=difficulty_normalized)
        if difficulty_levels.exists():
            query &= Q(difficulty_level__in=difficulty_levels)
    
    # Filter questions from QuestionBank
    available_questions = QuestionBank.objects.filter(
        query,
        is_active=True
    ).select_related('difficulty_level')
    
    if not available_questions.exists():
        return Response(
            {'detail': f'No questions found matching the criteria.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Randomly select questions
    question_list = list(available_questions)
    if len(question_list) < question_count:
        # If not enough questions, use all available
        selected_questions = question_list
        question_count = len(question_list)
        duration_minutes = int(question_count * time_per_question)
    else:
        selected_questions = random.sample(question_list, question_count)
    
    # Create test title
    year_str = f"{min(years)}-{max(years)}" if len(years) > 1 else str(years[0])
    test_title = f"{exam.name} {test_type.replace('_', ' ').title()} Test ({year_str})"
    
    # Create MockTest (no category needed - exam is the organization)
    mock_test = MockTest.objects.create(
        title=test_title,
        exam=exam,
        test_type=test_type,
        total_questions=question_count,
        duration_minutes=duration_minutes,
        marks_per_question=4.0,
        negative_marks=1.0,
        is_active=True
    )
    
    # Create MockTestQuestion entries (link questions to test)
    for idx, question in enumerate(selected_questions, start=1):
        MockTestQuestion.objects.create(
            mock_test=mock_test,
            question=question,
            question_number=idx
        )
    
    # Create generation config
    generation_config = {
        'exam_id': exam_id,
        'exam_name': exam.name,
        'years': years,
        'test_type': test_type,
        'subjects': subjects,
        'difficulty': difficulty,
        'question_count': question_count,
        'time_per_question': time_per_question,
        'duration_minutes': duration_minutes
    }
    
    # Create TestAttempt
    attempt = TestAttempt.objects.create(
        student=student_profile,
        mock_test=mock_test,
        test_mode='custom',
        generation_config=generation_config
    )
    
    return Response({
        'test_id': mock_test.id
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def generate_custom_test(request):
    """
    Generate a custom test from QuestionBank.
    Uses QuestionBank and MockTestQuestion to link questions to tests.
    """
    """
    Generate a custom test based on exam, years, subjects, difficulty, etc.
    
    Request payload:
    {
        "exam": "jee_main",
        "years": [2022, 2023],
        "test_type": "practice",
        "subjects": ["Physics"],
        "difficulty": ["medium", "hard"],
        "question_count": 30,
        "duration_minutes": 60
    }
    
    Returns:
    {
        "test_id": 123,
        "attempt_id": 456
    }
    """
    # Get current user (or default user for development)
    user = request.user if request.user.is_authenticated else None
    if not user:
        from accounts.models import CustomUser
        try:
            user = CustomUser.objects.get(email='el@gmail.com')
        except CustomUser.DoesNotExist:
            return Response(
                {'detail': 'User not found. Please authenticate or create default user.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    # Get student profile
    try:
        student_profile = user.student_profile
    except StudentProfile.DoesNotExist:
        return Response(
            {'detail': 'Student profile not found. Please create a student profile.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate request data
    exam = request.data.get('exam')
    years = request.data.get('years', [])
    test_type = request.data.get('test_type', 'practice')
    subjects = request.data.get('subjects', [])
    difficulty = request.data.get('difficulty', [])
    question_count = request.data.get('question_count', 30)
    duration_minutes = request.data.get('duration_minutes', 60)
    
    if not exam:
        return Response(
            {'detail': 'Exam is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not years:
        return Response(
            {'detail': 'At least one year is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Validate test_type
    valid_test_types = [choice[0] for choice in MockTest.TestType.choices]
    if test_type not in valid_test_types:
        return Response(
            {'detail': f'Invalid test_type. Must be one of: {", ".join(valid_test_types)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Build query to filter questions (only standalone questions for generation)
    query = Q(exam=exam_obj, year__in=years, mock_test__isnull=True)
    
    if subjects:
        query &= Q(subject__in=subjects)
    
    if difficulty:
        # Normalize difficulty values to lowercase for matching
        # The level field stores values like 'easy', 'medium', 'hard', 'very_hard'
        difficulty_normalized = [d.lower() if isinstance(d, str) else d for d in difficulty]
        # Get difficulty level objects
        difficulty_levels = DifficultyLevel.objects.filter(level__in=difficulty_normalized)
        if difficulty_levels.exists():
            query &= Q(difficulty_level__in=difficulty_levels)
    
    # Get all matching questions from QuestionBank
    available_questions = QuestionBank.objects.filter(query, is_active=True).select_related('difficulty_level')
    
    if not available_questions.exists():
        return Response(
            {'detail': 'No questions found matching the criteria.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Randomly select questions
    question_list = list(available_questions)
    if len(question_list) < question_count:
        # If not enough questions, use all available
        selected_questions = question_list
        question_count = len(question_list)
    else:
        selected_questions = random.sample(question_list, question_count)
    
    # Get exam object
    try:
        exam_obj = Exam.objects.get(id=exam, is_active=True)
    except Exam.DoesNotExist:
        return Response(
            {'detail': 'Invalid exam ID.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Create test title
    year_str = f"{min(years)}-{max(years)}" if len(years) > 1 else str(years[0])
    test_title = f"{exam_obj.name} {test_type.replace('_', ' ').title()} Test ({year_str})"
    
    # Create MockTest (no category needed - exam is the organization)
    mock_test = MockTest.objects.create(
        title=test_title,
        exam=exam_obj,
        test_type=test_type,
        total_questions=question_count,
        duration_minutes=duration_minutes,
        marks_per_question=4.0,
        negative_marks=1.0,
        is_active=True
    )
    
    # Create MockTestQuestion entries (link questions to test)
    for idx, question in enumerate(selected_questions, start=1):
        MockTestQuestion.objects.create(
            mock_test=mock_test,
            question=question,
            question_number=idx
        )
    
    # Recalculate total_marks from actual question marks
    from django.db.models import Sum
    total_marks = mock_test.test_questions.aggregate(
        total=Sum('question__marks')
    )['total'] or 0.0
    if total_marks > 0:
        mock_test.total_marks = total_marks
        mock_test.save(update_fields=['total_marks'])
    
    # Create generation config
    generation_config = {
        'exam_id': exam,
        'exam_name': exam_obj.name,
        'years': years,
        'test_type': test_type,
        'subjects': subjects,
        'difficulty': difficulty,
        'question_count': question_count,
        'duration_minutes': duration_minutes
    }
    
    # Create TestAttempt
    attempt = TestAttempt.objects.create(
        student=student_profile,
        mock_test=mock_test,
        test_mode='custom',
        generation_config=generation_config
    )
    
    return Response({
        'test_id': mock_test.id,
        'attempt_id': attempt.id
    }, status=status.HTTP_201_CREATED)


class RoomViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Room (Tournament-style test rooms).
    
    Endpoints:
    - POST /api/rooms/ - Create room
    - GET /api/rooms/ - List rooms
    - GET /api/rooms/{code}/ - Get room details
    - POST /api/rooms/join/ - Join a room
    - GET /api/rooms/{code}/participants/ - Get participants
    - POST /api/rooms/{code}/kick/{user_id}/ - Kick participant (host only)
    - POST /api/rooms/{code}/start/ - Start test (host only)
    - POST /api/rooms/{code}/end/ - End test (host only)
    - GET /api/rooms/{code}/questions/ - Get questions for participant
    """
    queryset = Room.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'create':
            return RoomCreateSerializer
        elif self.action == 'list':
            return RoomListSerializer
        elif self.action == 'retrieve':
            return RoomDetailSerializer
        return RoomListSerializer
    
    def get_queryset(self):
        """Filter rooms based on user and status."""
        from datetime import timedelta
        
        queryset = Room.objects.all()
        
        # Auto-complete expired rooms
        expired_rooms = queryset.filter(
            status__in=[Room.Status.WAITING, Room.Status.ACTIVE]
        ).exclude(
            created_at__gt=timezone.now() - timedelta(hours=24)
        )
        if expired_rooms.exists():
            expired_rooms.update(status=Room.Status.COMPLETED)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Exclude by status (e.g., exclude completed rooms from other filters)
        exclude_status = self.request.query_params.get('exclude_status')
        if exclude_status:
            queryset = queryset.exclude(status=exclude_status)
        
        # For completed rooms: Only show rooms where the user is a participant or host
        # This ensures users only see their own completed rooms, not others'
        if status_filter == Room.Status.COMPLETED:
            queryset = queryset.filter(
                Q(participants__user=self.request.user, participants__status=RoomParticipant.JOINED) |
                Q(host=self.request.user)
            ).distinct()
        
        # Filter by exam
        exam_id = self.request.query_params.get('exam_id')
        if exam_id:
            queryset = queryset.filter(exam_id=exam_id)
        
        # Filter by privacy
        privacy = self.request.query_params.get('privacy')
        if privacy:
            queryset = queryset.filter(privacy=privacy)
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'], url_path='my-active-room')
    def my_active_room(self, request):
        """Get the current user's active room (if they're a participant and haven't submitted)."""
        # Find rooms where user is a participant and room is waiting or active
        participant = RoomParticipant.objects.filter(
            user=request.user,
            status=RoomParticipant.JOINED
        ).select_related('room').filter(
            room__status__in=[Room.Status.WAITING, Room.Status.ACTIVE]
        ).order_by('-room__created_at').first()
        
        if not participant:
            return Response({
                'has_active_room': False,
                'room': None
            })
        
        room = participant.room
        
        # Check if room is expired - if so, mark as completed and exclude from active rooms
        if room.is_expired():
            if room.status != Room.Status.COMPLETED:
                room.status = Room.Status.COMPLETED
                room.save()
            return Response({
                'has_active_room': False,
                'room': None
            })
        
        # Check if user has already submitted all questions
        total_questions = room.room_questions.count()
        answered_count = participant.attempts.count()
        has_submitted_all = answered_count >= total_questions
        
        # If user has submitted all questions, don't show the banner
        if has_submitted_all:
            return Response({
                'has_active_room': False,
                'room': None
            })
        
        serializer = RoomListSerializer(room, context={'request': request})
        
        return Response({
            'has_active_room': True,
            'room': serializer.data,
            'room_code': room.code
        })
    
    def create(self, request, *args, **kwargs):
        """Create a new room."""
        # Check if user has enough room credits
        if request.user.room_credits < 1:
            return Response({
                'detail': 'Insufficient room credits. You need at least 1 credit to create a room. Refer friends to earn credits!',
                'room_credits': request.user.room_credits,
                'credits_required': 1
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Validate question pool before creating
        room_data = serializer.validated_data.copy()
        room_data['host'] = request.user
        
        # Remove 'password' field - it's not a model field, only used in serializer
        # The model uses 'password_hash' which is set in serializer.create()
        room_data.pop('password', None)
        
        # The serializer uses 'exam' with source='exam_id', so validated_data has 'exam'
        # but the model field is 'exam_id'. Convert it.
        if 'exam' in room_data:
            exam_obj = room_data.pop('exam')
            room_data['exam_id'] = exam_obj
        
        # Create temporary room for validation
        temp_room = Room(**room_data)
        validation = validate_question_pool(temp_room)
        
        if not validation['valid']:
            return Response({
                'detail': validation['message'],
                'available_count': validation['available_count'],
                'requested_count': validation['requested_count'],
                'suggestion': 'Consider reducing number_of_questions or changing subject/difficulty filters'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create room
        room = serializer.save()
        
        # Generate questions for the room
        success, message, count = generate_room_questions(room)
        if not success:
            room.delete()
            return Response({
                'detail': f'Failed to generate questions: {message}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Deduct 1 room credit from user
        request.user.room_credits -= 1
        request.user.save()
        
        # Add host as participant
        RoomParticipant.objects.create(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        )
        
        # Keep room in WAITING status until host starts it
        # Room will be activated when host calls /start endpoint
        room.status = Room.Status.WAITING
        room.save()
        
        response_serializer = RoomDetailSerializer(room, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    def retrieve(self, request, *args, **kwargs):
        """Get room details by code."""
        code = kwargs.get('pk', '').upper()
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Auto-complete expired rooms
        if room.is_expired() and room.status != Room.Status.COMPLETED:
            room.status = Room.Status.COMPLETED
            room.save()
        
        serializer = self.get_serializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='join')
    def join(self, request, pk=None):
        """Join a room."""
        code = pk.upper() if pk else request.data.get('code', '').upper()
        
        join_serializer = RoomJoinSerializer(data=request.data)
        join_serializer.is_valid(raise_exception=True)
        
        room = join_serializer.validated_data['room']
        
        # Check if room is expired
        if room.is_expired():
            return Response({
                'detail': 'This room has expired (24 hours after creation).'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user already joined
        existing_participant = RoomParticipant.objects.filter(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        ).first()
        
        if existing_participant:
            return Response({
                'detail': 'You have already joined this room.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Allow joining if room is not expired and is in WAITING status
        # Room will be activated when host starts it (not on join)
        # Create participant
        participant = RoomParticipant.objects.create(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        )
        
        serializer = RoomParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], url_path='participants')
    def participants(self, request, pk=None):
        """Get list of participants in a room."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant or host
        is_host = room.host == request.user
        is_participant = room.participants.filter(
            user=request.user,
            status=RoomParticipant.JOINED
        ).exists()
        
        # Allow access if user is host OR participant OR room is active/completed
        if not is_host and not is_participant and room.status == Room.Status.WAITING:
            return Response({
                'detail': 'You must be a participant or host to view participants.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        participants = room.participants.filter(status=RoomParticipant.JOINED)
        serializer = RoomParticipantSerializer(participants, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='kick/(?P<user_id>[^/.]+)')
    def kick(self, request, pk=None, user_id=None):
        """Kick a participant from the room (host only)."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Only host can kick
        if room.host != request.user:
            return Response({
                'detail': 'Only the host can kick participants.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Cannot kick if test has started
        if room.status != Room.Status.WAITING:
            return Response({
                'detail': 'Cannot kick participants after test has started.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Find participant
        try:
            from accounts.models import CustomUser
            user = CustomUser.objects.get(id=user_id)
            participant = RoomParticipant.objects.get(
                room=room,
                user=user,
                status=RoomParticipant.JOINED
            )
        except (CustomUser.DoesNotExist, RoomParticipant.DoesNotExist):
            return Response({
                'detail': 'Participant not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Cannot kick host
        if participant.user == room.host:
            return Response({
                'detail': 'Cannot kick the host.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status
        participant.status = RoomParticipant.KICKED
        participant.save()
        
        return Response({
            'detail': f'Participant {participant.user.email} has been kicked.'
        })
    
    @action(detail=True, methods=['post'], url_path='start')
    def start(self, request, pk=None):
        """Start the test (host only)."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if room is expired
        if room.is_expired():
            return Response({
                'detail': 'This room has expired (24 hours after creation).'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Only host can start
        if room.host != request.user:
            return Response({
                'detail': 'Only the host can start the test.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if already started
        if room.status != Room.Status.WAITING:
            return Response({
                'detail': f'Room is already {room.get_status_display().lower()}.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if questions are generated
        if room.room_questions.count() == 0:
            return Response({
                'detail': 'No questions generated for this room. Please regenerate questions.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if questions are generated
        if room.room_questions.count() == 0:
            return Response({
                'detail': 'No questions generated for this room. Please regenerate questions.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Start the test
        room.status = Room.Status.ACTIVE
        
        # For ALL_AT_ONCE mode, set start_time to now
        # For INDIVIDUAL mode, only activate the room (don't set start_time)
        if room.attempt_mode == Room.AttemptMode.ALL_AT_ONCE:
            room.start_time = timezone.now()
        # For INDIVIDUAL mode, room is active but participants start individually
        
        room.save()
        
        serializer = RoomDetailSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='end')
    def end(self, request, pk=None):
        """End the test (host only). Results become available immediately."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Only host can end
        if room.host != request.user:
            return Response({
                'detail': 'Only the host can end the test.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if active
        if room.status != Room.Status.ACTIVE:
            return Response({
                'detail': f'Room is not active. Current status: {room.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # End the test - mark as completed so results are immediately available
        room.status = Room.Status.COMPLETED
        room.save()
        
        # Create notifications for all participants that results are ready
        from accounts.models import Notification
        participants = room.participants.filter(status=RoomParticipant.JOINED)
        for participant in participants:
            # Check if notification already exists to avoid duplicates
            existing_notification = Notification.objects.filter(
                user=participant.user,
                category=Notification.Category.GUILD,
                message=f'Your Guild results for Room {room.code} are out!'
            ).first()
            
            if not existing_notification:
                Notification.objects.create(
                    user=participant.user,
                    category=Notification.Category.GUILD,
                    message=f'Your Guild results for Room {room.code} are out!'
                )
        
        serializer = RoomDetailSerializer(room, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='questions')
    def questions(self, request, pk=None):
        """Get questions for the current participant."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if room is expired - treat as completed
        if room.is_expired():
            return Response({
                'detail': 'This room has expired (24 hours after creation).'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is a participant
        participant = RoomParticipant.objects.filter(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        ).first()
        
        if not participant:
            return Response({
                'detail': 'You are not a participant in this room.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if room is active (rooms are active immediately when first user joins)
        if room.status != Room.Status.ACTIVE:
            return Response({
                'detail': f'Room is not active. Current status: {room.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For INDIVIDUAL mode, set participant start time on first access
        participant_start_time = None
        if room.attempt_mode == Room.AttemptMode.INDIVIDUAL:
            # Check if participant already has a start time
            if participant.participant_start_time:
                participant_start_time = participant.participant_start_time
            else:
                # First access - set participant start time to now
                participant_start_time = timezone.now()
                participant.participant_start_time = participant_start_time
                participant.save()
        
        # Get randomized questions for this participant
        questions = randomize_questions_for_participant(participant)
        
        # Serialize questions
        question_data = []
        for rq in questions:
            question = rq.question_bank
            question_num = getattr(rq, '_display_number', rq.question_number)
            
            # Get participant's attempt if exists
            attempt = ParticipantAttempt.objects.filter(
                participant=participant,
                room_question=rq
            ).first()
            
            question_data.append({
                'room_question_id': rq.id,
                'question_number': question_num,
                'question': UnifiedQuestionSerializer(question).data,
                'attempt': ParticipantAttemptSerializer(attempt).data if attempt else None,
                'time_per_question_minutes': room.time_per_question,
                'total_duration_minutes': room.duration,
            })
        
        # Calculate remaining time based on attempt mode
        total_duration_seconds = room.duration * 60
        
        if room.attempt_mode == Room.AttemptMode.ALL_AT_ONCE:
            # ALL_AT_ONCE: Use room start_time
            if not room.start_time:
                return Response({
                    'detail': 'Room start time not set. Host must start the test first.'
                }, status=status.HTTP_400_BAD_REQUEST)
            elapsed_seconds = (timezone.now() - room.start_time).total_seconds()
            start_time_iso = room.start_time.isoformat()
        else:
            # INDIVIDUAL: Use participant start time (set above if first access)
            if not participant_start_time:
                return Response({
                    'detail': 'Participant start time not set.'
                }, status=status.HTTP_400_BAD_REQUEST)
            elapsed_seconds = (timezone.now() - participant_start_time).total_seconds()
            start_time_iso = participant_start_time.isoformat()
        
        remaining_seconds = max(0, total_duration_seconds - elapsed_seconds)
        
        return Response({
            'room_code': room.code,
            'total_questions': len(question_data),
            'time_per_question': room.time_per_question,
            'total_duration': room.duration,
            'start_time': start_time_iso,
            'remaining_seconds': int(remaining_seconds),
            'questions': question_data
        })
    
    @action(detail=True, methods=['get'], url_path='test-summary')
    def test_summary(self, request, pk=None):
        """Get test summary for an existing room."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant (for results access)
        participant = None
        if request.user.is_authenticated:
            participant = RoomParticipant.objects.filter(
                room=room,
                user=request.user,
                status=RoomParticipant.JOINED
            ).first()
        
        # If requesting results summary, allow if room is manually ended (COMPLETED) OR expired
        is_manually_ended = room.status == Room.Status.COMPLETED
        is_expired = room.is_expired()
        
        if participant and not is_manually_ended and not is_expired:
            return Response({
                'detail': 'Results are not ready yet. Please wait for 24 hours after room creation to see final results.',
                'results_ready': False
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validate question pool
        validation = validate_question_pool(room)
        
        return Response({
            'summary': {
                'total_questions': room.number_of_questions,
                'time_per_question': room.time_per_question,
                'total_duration_minutes': room.duration,
                'subject_mode': room.subject_mode,
                'subjects': room.subjects if room.subject_mode == Room.SubjectMode.SPECIFIC else None,
                'difficulty': room.difficulty,
                'question_type_mix': room.question_type_mix,
                'question_types': room.question_types if room.question_types else None,
            },
            'validation': validation,
            'suggestions': {
                'auto_adjust_available': not validation['valid'],
                'available_count': validation['available_count'],
                'requested_count': validation['requested_count'],
            },
            'results_ready': room.is_expired()
        })
    
    @action(detail=True, methods=['get'], url_path='submission-status')
    def submission_status(self, request, pk=None):
        """Check submission status for all participants."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check status for active or completed rooms
        if room.status not in [Room.Status.ACTIVE, Room.Status.COMPLETED]:
            return Response({
                'detail': f'Test is not active or completed. Current status: {room.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        participants = room.participants.filter(status=RoomParticipant.JOINED)
        total_questions = room.room_questions.count()
        
        submission_data = []
        submitted_count = 0
        
        for participant in participants:
            # Count how many questions this participant has answered
            answered_count = participant.attempts.count()
            has_submitted_all = answered_count >= total_questions
            
            if has_submitted_all:
                submitted_count += 1
            
            submission_data.append({
                'participant_id': participant.id,
                'user_email': participant.user.email,
                'user_name': f"{participant.user.first_name or ''} {participant.user.last_name or ''}".strip() or participant.user.email,
                'answered_count': answered_count,
                'total_questions': total_questions,
                'has_submitted_all': has_submitted_all,
            })
        
        all_submitted = submitted_count == participants.count()
        
        # Don't auto-complete room - wait for 24-hour expiry
        # Room will be marked as completed when expired (handled in leaderboard/retrieve endpoints)
        
        return Response({
            'room_code': room.code,
            'total_participants': participants.count(),
            'submitted_count': submitted_count,
            'pending_count': participants.count() - submitted_count,
            'all_submitted': all_submitted,
            'room_status': room.status,
            'results_ready': room.status == Room.Status.COMPLETED or room.is_expired(),
            'submissions': submission_data
        })
    
    @action(detail=True, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request, pk=None):
        """Get leaderboard for completed room."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Different logic based on attempt_mode
        is_manually_ended = room.status == Room.Status.COMPLETED
        is_expired = room.is_expired()
        
        if room.attempt_mode == Room.AttemptMode.ALL_AT_ONCE:
            # For ALL_AT_ONCE: Allow if manually ended OR all participants have submitted
            participants = room.participants.filter(status=RoomParticipant.JOINED)
            total_participants = participants.count()
            
            if total_participants == 0:
                return Response({
                    'detail': 'No participants in this room.',
                    'results_ready': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Count how many participants have submitted all questions
            submitted_count = 0
            for participant in participants:
                total_questions = room.room_questions.count()
                answered_count = participant.attempts.count()
                if answered_count >= total_questions:
                    submitted_count += 1
            
            all_submitted = submitted_count == total_participants
            
            if not is_manually_ended and not all_submitted:
                return Response({
                    'detail': 'Results will be available once all participants have submitted their tests.',
                    'results_ready': False,
                    'submitted_count': submitted_count,
                    'total_participants': total_participants
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            # For INDIVIDUAL: Allow if manually ended OR expired (24 hours after creation)
            if not is_manually_ended and not is_expired:
                return Response({
                    'detail': 'Results are not ready yet. Please wait for 24 hours after room creation to see final results.',
                    'results_ready': False
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Treat expired rooms as completed (if not already)
        if is_expired and room.status != Room.Status.COMPLETED:
            room.status = Room.Status.COMPLETED
            room.save()
            
            # Create notifications for all participants that results are ready (only once)
            from accounts.models import Notification
            participants = room.participants.filter(status=RoomParticipant.JOINED)
            for participant in participants:
                # Check if notification already exists to avoid duplicates
                existing_notification = Notification.objects.filter(
                    user=participant.user,
                    category=Notification.Category.GUILD,
                    message=f'Your Guild results for Room {room.code} are out!'
                ).first()
                
                if not existing_notification:
                    Notification.objects.create(
                        user=participant.user,
                        category=Notification.Category.GUILD,
                        message=f'Your Guild results for Room {room.code} are out!'
                    )
        
        # Calculate scores for all participants
        participants = room.participants.filter(status=RoomParticipant.JOINED)
        leaderboard_data = []
        
        for participant in participants:
            score_data = calculate_participant_score(participant)
            
            # Get total time taken (sum of all time_spent_seconds)
            total_time_seconds = sum(
                attempt.time_spent_seconds 
                for attempt in participant.attempts.all()
            )
            
            leaderboard_data.append({
                'participant_id': participant.id,
                'user_email': participant.user.email,
                'user_name': f"{participant.user.first_name or ''} {participant.user.last_name or ''}".strip() or participant.user.email,
                'total_score': score_data['total_score'],
                'total_marks': score_data['total_marks'],
                'percentage': score_data['percentage'],
                'correct_count': score_data['correct_count'],
                'wrong_count': score_data['wrong_count'],
                'unanswered_count': score_data['unanswered_count'],
                'total_time_seconds': total_time_seconds,
                'total_time_minutes': round(total_time_seconds / 60, 2),
            })
        
        # Sort by score (descending), then by time (ascending - faster is better)
        leaderboard_data.sort(key=lambda x: (-x['total_score'], x['total_time_seconds']))
        
        # Add rank
        for idx, entry in enumerate(leaderboard_data, start=1):
            entry['rank'] = idx
        
        return Response({
            'room_code': room.code,
            'room_title': f"Room {room.code}",
            'total_participants': len(leaderboard_data),
            'leaderboard': leaderboard_data
        })
    
    @action(detail=True, methods=['get'], url_path='review')
    def review(self, request, pk=None):
        """Get wrong answers for the current user to review."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant
        participant = RoomParticipant.objects.filter(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        ).first()
        
        if not participant:
            return Response({
                'detail': 'You are not a participant in this room.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Different logic based on attempt_mode
        is_manually_ended = room.status == Room.Status.COMPLETED
        is_expired = room.is_expired()
        
        if room.attempt_mode == Room.AttemptMode.ALL_AT_ONCE:
            # For ALL_AT_ONCE: Allow if manually ended OR all participants have submitted
            participants = room.participants.filter(status=RoomParticipant.JOINED)
            total_participants = participants.count()
            
            if total_participants == 0:
                return Response({
                    'detail': 'No participants in this room.',
                    'results_ready': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Count how many participants have submitted all questions
            submitted_count = 0
            for participant in participants:
                total_questions = room.room_questions.count()
                answered_count = participant.attempts.count()
                if answered_count >= total_questions:
                    submitted_count += 1
            
            all_submitted = submitted_count == total_participants
            
            if not is_manually_ended and not all_submitted:
                return Response({
                    'detail': 'Review is only available after all participants have submitted their tests.',
                    'results_ready': False
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            # For INDIVIDUAL: Allow if manually ended OR expired (24 hours after creation)
            if not is_manually_ended and not is_expired:
                return Response({
                    'detail': 'Results are not ready yet. Please wait for 24 hours after room creation to see final results.',
                    'results_ready': False
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Treat expired rooms as completed
        if room.status != Room.Status.COMPLETED:
            room.status = Room.Status.COMPLETED
            room.save()
        
        # Get all wrong answers for this participant
        wrong_attempts = participant.attempts.filter(is_correct=False)
        
        review_data = []
        for attempt in wrong_attempts:
            question = attempt.room_question.question_bank
            room_question = attempt.room_question
            
            review_data.append({
                'attempt_id': attempt.id,
                'question_number': room_question.question_number,
                'question': UnifiedQuestionSerializer(question).data,
                'selected_option': attempt.selected_option,
                'answer_text': attempt.answer_text,
                'correct_option': question.correct_option,
                'marks_obtained': attempt.marks_obtained,
                'time_spent_seconds': attempt.time_spent_seconds,
            })
        
        # Sort by question number
        review_data.sort(key=lambda x: x['question_number'])
        
        return Response({
            'room_code': room.code,
            'total_wrong': len(review_data),
            'wrong_answers': review_data
        })
    
    @action(detail=True, methods=['get'], url_path='unattempted')
    def unattempted(self, request, pk=None):
        """Get unattempted questions for the current user to review."""
        code = pk.upper() if pk else ''
        room = Room.objects.filter(code=code).first()
        
        if not room:
            return Response({
                'detail': 'Room not found.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if user is a participant
        participant = RoomParticipant.objects.filter(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        ).first()
        
        if not participant:
            return Response({
                'detail': 'You are not a participant in this room.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Different logic based on attempt_mode
        is_manually_ended = room.status == Room.Status.COMPLETED
        is_expired = room.is_expired()
        
        if room.attempt_mode == Room.AttemptMode.ALL_AT_ONCE:
            # For ALL_AT_ONCE: Allow if manually ended OR all participants have submitted
            participants = room.participants.filter(status=RoomParticipant.JOINED)
            total_participants = participants.count()
            
            if total_participants == 0:
                return Response({
                    'detail': 'No participants in this room.',
                    'results_ready': False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Count how many participants have submitted all questions
            submitted_count = 0
            for participant in participants:
                total_questions = room.room_questions.count()
                answered_count = participant.attempts.count()
                if answered_count >= total_questions:
                    submitted_count += 1
            
            all_submitted = submitted_count == total_participants
            
            if not is_manually_ended and not all_submitted:
                return Response({
                    'detail': 'Unattempted questions are only available after all participants have submitted their tests.',
                    'results_ready': False
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            # For INDIVIDUAL: Allow if manually ended OR expired (24 hours after creation)
            if not is_manually_ended and not is_expired:
                return Response({
                    'detail': 'Unattempted questions are only available after test completion (24 hours after room creation or when host ends the test).',
                    'results_ready': False
                }, status=status.HTTP_403_FORBIDDEN)
        
        # Treat expired rooms as completed (if not already)
        if is_expired and room.status != Room.Status.COMPLETED:
            room.status = Room.Status.COMPLETED
            room.save()
        
        # Get all room questions
        room_questions = room.room_questions.all().order_by('question_number')
        
        # Get all attempted question IDs for this participant
        attempted_question_ids = set(
            participant.attempts.values_list('room_question_id', flat=True)
        )
        
        # Find unattempted questions
        unattempted_data = []
        for room_question in room_questions:
            if room_question.id not in attempted_question_ids:
                question = room_question.question_bank
                
                unattempted_data.append({
                    'question_number': room_question.question_number,
                    'question': UnifiedQuestionSerializer(question).data,
                    'correct_option': question.correct_option,
                    'marks': question.marks,
                })
        
        # Sort by question number
        unattempted_data.sort(key=lambda x: x['question_number'])
        
        return Response({
            'room_code': room.code,
            'total_unattempted': len(unattempted_data),
            'unattempted_questions': unattempted_data
        })


class ParticipantAttemptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ParticipantAttempt (participant answers).
    
    Endpoints:
    - POST /api/attempts/submit/ - Submit answer for a question
    """
    queryset = ParticipantAttempt.objects.all()
    serializer_class = ParticipantAttemptSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'], url_path='submit')
    def submit(self, request):
        """Submit an answer for a question."""
        serializer = ParticipantAttemptCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        room_question_id = serializer.validated_data['room_question'].id
        room_question = RoomQuestion.objects.get(id=room_question_id)
        room = room_question.room
        
        # Check if user is a participant
        participant = RoomParticipant.objects.filter(
            room=room,
            user=request.user,
            status=RoomParticipant.JOINED
        ).first()
        
        if not participant:
            return Response({
                'detail': 'You are not a participant in this room.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if room is expired - treat as completed
        if room.is_expired():
            return Response({
                'detail': 'This room has expired (24 hours after creation). Cannot submit answers.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if test is active
        if room.status != Room.Status.ACTIVE:
            return Response({
                'detail': f'Test is not active. Current status: {room.get_status_display()}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate remaining time based on attempt mode
        total_duration_seconds = room.duration * 60
        current_time = timezone.now()
        
        if room.attempt_mode == Room.AttemptMode.ALL_AT_ONCE:
            # ALL_AT_ONCE: Validate based on room start_time
            if not room.start_time:
                return Response({
                    'detail': 'Room start time not set. Host must start the test first.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            elapsed_seconds = (current_time - room.start_time).total_seconds()
            remaining_seconds = total_duration_seconds - elapsed_seconds
            
            if remaining_seconds <= 0:
                return Response({
                    'detail': 'Time has expired. Cannot submit answers.'
                }, status=status.HTTP_400_BAD_REQUEST)
        else:
            # INDIVIDUAL: Validate based on participant start time
            participant_start_time = participant.participant_start_time
            
            if participant_start_time:
                elapsed_seconds = (current_time - participant_start_time).total_seconds()
                remaining_seconds = total_duration_seconds - elapsed_seconds
                
                if remaining_seconds <= 0:
                    return Response({
                        'detail': 'Time has expired for your attempt.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                # If participant hasn't started yet, set start time now (first submission)
                participant_start_time = current_time
                participant.participant_start_time = participant_start_time
                participant.save()
        
        # Get or create attempt
        # For INDIVIDUAL mode, use participant start time if set, otherwise use now
        if room.attempt_mode == Room.AttemptMode.INDIVIDUAL:
            attempt_started_at = participant.participant_start_time or timezone.now()
        else:
            attempt_started_at = serializer.validated_data.get('started_at') or timezone.now()
        
        attempt, created = ParticipantAttempt.objects.get_or_create(
            participant=participant,
            room_question=room_question,
            defaults={
                'selected_option': serializer.validated_data.get('selected_option'),
                'answer_text': serializer.validated_data.get('answer_text'),
                'time_spent_seconds': serializer.validated_data.get('time_spent_seconds', 0),
                'started_at': attempt_started_at,
                'submitted_at': timezone.now(),
            }
        )
        
        if not created:
            # Update existing attempt
            attempt.selected_option = serializer.validated_data.get('selected_option', attempt.selected_option)
            attempt.answer_text = serializer.validated_data.get('answer_text', attempt.answer_text)
            attempt.time_spent_seconds = serializer.validated_data.get('time_spent_seconds', attempt.time_spent_seconds)
            if not attempt.started_at:
                attempt.started_at = attempt_started_at
            attempt.submitted_at = timezone.now()
            attempt.save()
        
        # Calculate correctness and marks
        question = room_question.question_bank
        is_correct = False
        marks_obtained = 0.0
        
        if question.question_type == QuestionBank.QuestionType.MCQ:
            # MCQ: Compare selected option with correct option
            selected = attempt.selected_option
            if selected and selected.strip() and selected.upper().strip() == question.correct_option.upper().strip():
                is_correct = True
                marks_obtained = question.marks
            elif selected and selected.strip():
                # Wrong answer: apply negative marks
                marks_obtained = -question.negative_marks
            else:
                # Unanswered: 0 marks
                is_correct = None
                marks_obtained = 0.0
        else:
            # Integer/Numerical: Compare answer text
            answer_text = attempt.answer_text
            if not answer_text or not answer_text.strip():
                # Unanswered: 0 marks
                is_correct = None
                marks_obtained = 0.0
            else:
                try:
                    # Try to compare as numbers
                    answer_float = float(answer_text.strip())
                    correct_float = float(question.correct_option.strip())
                    if abs(answer_float - correct_float) < 0.01:  # Allow small floating point differences
                        is_correct = True
                        marks_obtained = question.marks
                    else:
                        is_correct = False
                        marks_obtained = -question.negative_marks
                except (ValueError, AttributeError):
                    # Text comparison
                    if answer_text.strip().upper() == question.correct_option.strip().upper():
                        is_correct = True
                        marks_obtained = question.marks
                    else:
                        is_correct = False
                        marks_obtained = -question.negative_marks
        
        # Update attempt
        attempt.is_correct = is_correct
        attempt.marks_obtained = marks_obtained
        attempt.save()
        
        # Check if participant has submitted all questions
        total_questions = room.room_questions.count()
        answered_count = participant.attempts.count()
        has_submitted_all = answered_count >= total_questions
        
        response_data = {
            'attempt': ParticipantAttemptSerializer(attempt).data,
            'has_submitted_all': has_submitted_all,
        }
        
        # If all questions submitted, check if room is expired
        if has_submitted_all:
            if room.is_expired():
                # Room expired - results are ready
                response_data['message'] = 'Your results are ready! Check the leaderboard.'
            else:
                # Room not expired - show wait message
                response_data['message'] = 'Thanks for submitting! Please wait for 24 hours to see final results.'
        
        return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_room_test_summary(request):
    """
    Preview test summary before creating a room.
    This endpoint validates room configuration and returns a summary without requiring a room code.
    """
    exam_id = request.query_params.get('exam_id')
    subject_mode = request.query_params.get('subject_mode', Room.SubjectMode.RANDOM)
    subjects = request.query_params.getlist('subjects') or []
    number_of_questions = int(request.query_params.get('number_of_questions', 10))
    time_per_question = float(request.query_params.get('time_per_question', 2.0))
    difficulty = request.query_params.get('difficulty', Room.Difficulty.MIXED)
    question_types = request.query_params.getlist('question_types') or []
    question_type_mix = request.query_params.get('question_type_mix', Room.QuestionTypeMix.MIXED)
    
    if not exam_id:
        return Response({
            'detail': 'exam_id is required.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        exam = Exam.objects.get(id=exam_id)
    except Exam.DoesNotExist:
        return Response({
            'detail': 'Exam not found.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Create temporary room for validation (don't save to DB)
    temp_room = Room(
        exam_id=exam,
        subject_mode=subject_mode,
        subjects=subjects if subjects else None,
        number_of_questions=number_of_questions,
        time_per_question=time_per_question,
        difficulty=difficulty,
        question_types=question_types if question_types else None,
        question_type_mix=question_type_mix,
    )
    
    # Validate question pool
    validation = validate_question_pool(temp_room)
    
    # Calculate duration
    total_duration = int(number_of_questions * time_per_question)
    
    return Response({
        'summary': {
            'total_questions': number_of_questions,
            'time_per_question': time_per_question,
            'total_duration_minutes': total_duration,
            'subject_mode': subject_mode,
            'subjects': subjects if subject_mode == Room.SubjectMode.SPECIFIC else None,
            'difficulty': difficulty,
            'question_type_mix': question_type_mix,
            'question_types': question_types if question_types else None,
        },
        'validation': validation,
        'suggestions': {
            'auto_adjust_available': not validation['valid'],
            'available_count': validation['available_count'],
            'requested_count': validation['requested_count'],
        }
    })

from datetime import timedelta
from django.db.models import Avg, Count
from django.db.models.functions import TruncDay

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_performance_summary(request):

    user = request.user
    if not user.is_authenticated:
        return Response({
            'detail': 'Authentication required.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    student_profile = StudentProfile.objects.get(user=user)
    today = timezone.now().date()
    last_7_days = today - timedelta(days=7)
    attempts = TestAttempt.objects.filter(student=student_profile ,is_completed=True, started_at__gte=last_7_days, started_at__lte=today)
    total_attempts = attempts.count()
    daily_average_score = (attempts.annotate(day = TruncDay('started_at')).values('day').annotate(avg_score = Avg('score'), total_attempts = Count('id')).order_by('day'))
     
    today_avg_score = TestAttempt.objects.filter(
        student=student_profile,
        is_completed=True,
        completed_at__date=today
    ).aggregate(avg_score=Avg('score'))['avg_score']
    
    return Response({
        'total_attempts': total_attempts,
        'today_avg_score': today_avg_score if today_avg_score else 0,
        'daily_average_score': daily_average_score
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_questions_performance_overview(request):
    """
    Get performance overview based on student's attempted questions.
    Returns all attempts (not unique, includes duplicates if same question attempted multiple times).
    Returns:
    - total_available_questions: Total number of questions available in QuestionBank
    - total_correct_questions: Total number of questions correctly attempted (all attempts)
    - total_attempted_questions: Total number of questions attempted (all attempts)
    - difficulty_breakdown: Breakdown of correct questions by difficulty level (all attempts)
    - accuracy_by_difficulty: Accuracy breakdown by difficulty level (all attempts)
    """
    user = request.user
    if not user.is_authenticated:
        return Response({
            'detail': 'Authentication required.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    try:
        student_profile = StudentProfile.objects.get(user=user)
    except StudentProfile.DoesNotExist:
        return Response({
            'detail': 'Student profile not found.'
        }, status=status.HTTP_404_NOT_FOUND)
    
    # Get total available questions from QuestionBank
    total_available_questions = QuestionBank.objects.filter(is_active=True).count()
    
    # Get all completed test attempts for this student
    completed_attempts = TestAttempt.objects.filter(
        student=student_profile,
        is_completed=True
    ).values_list('id', flat=True)
    
    if not completed_attempts:
        # No completed attempts, return empty data
        all_difficulty_levels = DifficultyLevel.objects.all().order_by('order')
        difficulty_breakdown = {}
        accuracy_by_difficulty = {}
        
        for difficulty_level in all_difficulty_levels:
            difficulty_breakdown[difficulty_level.level] = {
                'level': difficulty_level.level,
                'display_name': difficulty_level.get_level_display(),
                'count': 0,
                'percentage': 0
            }
            accuracy_by_difficulty[difficulty_level.level] = {
                'level': difficulty_level.level,
                'display_name': difficulty_level.get_level_display(),
                'total_attempted': 0,
                'correct': 0,
                'wrong': 0,
                'accuracy': 0
            }
        
        return Response({
            'total_available_questions': total_available_questions,
            'total_correct_questions': 0,
            'total_attempted_questions': 0,
            'total_wrong_questions': 0,
            'overall_accuracy': 0,
            'difficulty_breakdown': difficulty_breakdown,
            'accuracy_by_difficulty': accuracy_by_difficulty
        }, status=status.HTTP_200_OK)
    
    # Get all answers for completed attempts (not unique, includes all attempts)
    all_answers = StudentAnswer.objects.filter(
        attempt_id__in=completed_attempts
    ).exclude(selected_option='').select_related('question_bank', 'question_bank__difficulty_level')
    
    # Get all correct answers (all attempts, not unique)
    correct_answers = all_answers.filter(is_correct=True)
    
    # Calculate total correct questions (all attempts)
    total_correct_questions = correct_answers.count()
    
    # Calculate total attempted questions (all attempts)
    total_attempted_questions = all_answers.count()
    total_wrong_questions = total_attempted_questions - total_correct_questions
    
    # Get all difficulty levels to ensure we include all levels even if count is 0
    all_difficulty_levels = DifficultyLevel.objects.all().order_by('order')
    
    # Group by difficulty level for correct questions (all attempts)
    difficulty_breakdown = {}
    for difficulty_level in all_difficulty_levels:
        # Count all correct answers for this difficulty level
        count = correct_answers.filter(
            question_bank__difficulty_level=difficulty_level
        ).count()
        
        difficulty_breakdown[difficulty_level.level] = {
            'level': difficulty_level.level,
            'display_name': difficulty_level.get_level_display(),
            'count': count,
            'percentage': round((count / total_correct_questions * 100) if total_correct_questions > 0 else 0, 2)
        }
    
    # Calculate accuracy by difficulty level (all attempts)
    accuracy_by_difficulty = {}
    for difficulty_level in all_difficulty_levels:
        # Get all attempted answers for this difficulty level
        difficulty_answers = all_answers.filter(
            question_bank__difficulty_level=difficulty_level
        )
        total_difficulty_attempted = difficulty_answers.count()
        
        # Get correct answers for this difficulty level
        correct_difficulty_count = difficulty_answers.filter(is_correct=True).count()
        wrong_difficulty_count = total_difficulty_attempted - correct_difficulty_count
        
        accuracy_by_difficulty[difficulty_level.level] = {
            'level': difficulty_level.level,
            'display_name': difficulty_level.get_level_display(),
            'total_attempted': total_difficulty_attempted,
            'correct': correct_difficulty_count,
            'wrong': wrong_difficulty_count,
            'accuracy': round((correct_difficulty_count / total_difficulty_attempted * 100) if total_difficulty_attempted > 0 else 0, 2)
        }
    
    return Response({
        'total_available_questions': total_available_questions,
        'total_correct_questions': total_correct_questions,
        'total_attempted_questions': total_attempted_questions,
        'total_wrong_questions': total_wrong_questions,
        'overall_accuracy': round((total_correct_questions / total_attempted_questions * 100) if total_attempted_questions > 0 else 0, 2),
        'difficulty_breakdown': difficulty_breakdown,
        'accuracy_by_difficulty': accuracy_by_difficulty
    }, status=status.HTTP_200_OK)
