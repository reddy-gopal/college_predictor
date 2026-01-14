"""
Mocktest App Views

Design Decisions:
1. Use list/detail serializers for performance optimization
2. Separate create serializers to prevent accidental field updates
3. Filter querysets appropriately (active tests, user-specific data)
4. Add custom actions for test-taking workflow
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from rest_framework import serializers
from django.db.models import Q, Count, Avg
from django.utils import timezone

from .models import (
    MockTest, Question, DifficultyLevel, TestCategory, StudentProfile,
    TestAttempt, StudentAnswer, MistakeNotebook, StudyGuild, XPLog, Leaderboard
)
from .serializers import (
    MockTestListSerializer, MockTestDetailSerializer,
    QuestionSerializer, QuestionListSerializer,
    DifficultyLevelSerializer,
    TestCategorySerializer,
    StudentProfileSerializer, StudentProfileCreateSerializer,
    TestAttemptListSerializer, TestAttemptDetailSerializer, TestAttemptCreateSerializer,
    StudentAnswerSerializer, StudentAnswerCreateSerializer,
    MistakeNotebookSerializer,
    StudyGuildSerializer,
    XPLogSerializer,
    LeaderboardSerializer,
)


class MockTestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MockTest.
    - List: Returns lightweight list with basic info
    - Retrieve: Returns detailed test with nested questions
    - Filter: Only active tests by default (can be overridden)
    """
    queryset = MockTest.objects.prefetch_related(
        'questions', 'category', 'difficulty'
    ).select_related('category', 'difficulty')
    
    def get_queryset(self):
        """Filter by active tests by default, unless admin override."""
        queryset = super().get_queryset()
        # Only show active tests in list view unless explicitly requested
        if self.action == 'list' and not self.request.query_params.get('include_inactive'):
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """Use list serializer for list, detail serializer for retrieve/update."""
        if self.action == 'list':
            return MockTestListSerializer
        return MockTestDetailSerializer
    
    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        mock_test = self.get_object()
        questions = mock_test.questions.all().order_by('question_number')
        # Use full QuestionSerializer to include all options
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)


class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Question.
    - List: Returns lightweight list
    - Retrieve: Returns full question details
    """
    queryset = Question.objects.select_related(
        'mock_test', 'difficulty_level'
    ).prefetch_related('mock_test__category')
    
    def get_queryset(self):
        """Filter questions by test if test_id provided."""
        queryset = super().get_queryset()
        test_id = self.request.query_params.get('test_id')
        if test_id:
            queryset = queryset.filter(mock_test_id=test_id)
        return queryset.order_by('mock_test', 'question_number')
    
    def get_serializer_class(self):
        """Use list serializer for list, full serializer for detail."""
        if self.action == 'list':
            return QuestionListSerializer
        return QuestionSerializer


class DifficultyLevelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for DifficultyLevel (read-only).
    """
    queryset = DifficultyLevel.objects.all().order_by('order', 'level')
    serializer_class = DifficultyLevelSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class TestCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for TestCategory.
    """
    queryset = TestCategory.objects.prefetch_related('mock_tests').filter(is_active=True)
    serializer_class = TestCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """Filter by active categories by default."""
        queryset = super().get_queryset()
        if not self.request.query_params.get('include_inactive'):
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')


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
    - List: Returns lightweight list
    - Retrieve: Returns detailed attempt with answers
    - Create: Starts a new test attempt
    - Custom actions: submit, calculate_score
    
    TEMPORARY: Allows unauthenticated access using default user (el@gmail.com) for development.
    """
    permission_classes = [AllowAny]  # Temporary: Allow unauthenticated access
    
    def get_default_user(self):
        """Get default user for development (el@gmail.com)."""
        from accounts.models import CustomUser
        try:
            return CustomUser.objects.get(email='el@gmail.com')
        except CustomUser.DoesNotExist:
            return None
    
    def get_current_user(self):
        """Get current user or default user for development."""
        if self.request.user.is_authenticated:
            return self.request.user
        return self.get_default_user()
    
    def get_queryset(self):
        """Users can only see their own attempts unless staff."""
        queryset = TestAttempt.objects.select_related(
            'student__user', 'mock_test'
        ).prefetch_related('answers__question')
        
        user = self.get_current_user()
        if user and not user.is_staff:
            queryset = queryset.filter(student__user=user)
        elif not user:
            # If no user, return empty queryset
            queryset = queryset.none()
        
        return queryset.order_by('-started_at')
    
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
        context['user'] = self.get_current_user()
        return context
    
    def create(self, request, *args, **kwargs):
        """Override create to return existing attempt if one exists."""
        user = self.get_current_user()
        if not user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'non_field_errors': ['Default user not found. Please create user with email: el@gmail.com']
            })
        
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
        """Create attempt for current user's student profile or default user."""
        user = self.get_current_user()
        if not user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'non_field_errors': ['Default user not found. Please create user with email: el@gmail.com']
            })
        
        try:
            student_profile = user.student_profile
        except StudentProfile.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'non_field_errors': [f'Student profile not found for user: {user.email}. Please create a student profile.']
            })
        
        serializer.save(student=student_profile)
    
    @action(detail=True, methods=['post'])
    def submit_answer(self, request, pk=None):
        """Submit or update an answer for a question in this attempt."""
        attempt = self.get_object()
        user = self.get_current_user()
        
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
            question = serializer.validated_data['question']
            selected_option = serializer.validated_data.get('selected_option', '')
            time_taken = serializer.validated_data.get('time_taken_seconds', 0)
            
            # Get or create answer
            answer, created = StudentAnswer.objects.get_or_create(
                attempt=attempt,
                question=question,
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
            is_correct = (selected_option.upper() == question.correct_option.upper())
            answer.is_correct = is_correct
            
            # Calculate marks
            if is_correct:
                answer.marks_obtained = question.marks
            elif selected_option:  # Wrong answer (not blank)
                answer.marks_obtained = -question.negative_marks
            else:  # Unanswered
                answer.marks_obtained = 0.0
            
            answer.save()
            
            return Response(StudentAnswerSerializer(answer).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit the test attempt and calculate final score."""
        attempt = self.get_object()
        
        # Verify attempt belongs to user (or default user)
        user = self.get_current_user()
        if user and attempt.student.user != user:
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
        
        attempt.save()
        
        # Calculate percentile (simplified - compare with all completed attempts of same test)
        all_attempts = TestAttempt.objects.filter(
            mock_test=attempt.mock_test,
            is_completed=True
        ).exclude(id=attempt.id)
        
        better_scores = all_attempts.filter(score__gt=total_score).count()
        total_completed = all_attempts.count() + 1
        attempt.percentile = (better_scores / total_completed * 100) if total_completed > 0 else 0
        attempt.save()
        
        serializer = TestAttemptDetailSerializer(attempt)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def answers(self, request, pk=None):
        """Get all answers for this attempt."""
        attempt = self.get_object()
        
        user = self.get_current_user()
        if user and attempt.student.user != user and not (user.is_staff if user else False):
            return Response(
                {'detail': 'You do not have permission to view these answers.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        answers = attempt.answers.all().select_related('question').order_by('question__question_number')
        serializer = StudentAnswerSerializer(answers, many=True)
        return Response(serializer.data)


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
            'attempt__student__user', 'question'
        )
        
        if not self.request.user.is_staff:
            queryset = queryset.filter(attempt__student__user=self.request.user)
        
        return queryset.order_by('attempt', 'question__question_number')
    
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
            'student__user', 'question', 'attempt'
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
