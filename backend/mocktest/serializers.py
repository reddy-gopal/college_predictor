"""
Mocktest App Serializers

Design Decisions:
1. Separate list vs detail serializers for performance
2. Create vs read serializers to prevent accidental updates
3. Nested serializers for related objects
4. Read-only fields for calculated values (score, percentile)
5. Validation for test attempts and answers
"""
from rest_framework import serializers
from django.conf import settings
from .models import (
    PhoneOTP, Exam, DifficultyLevel, MockTest, Question,
    StudentProfile, TestAttempt, StudentAnswer, MistakeNotebook,
    StudyGuild, XPLog, Leaderboard, DailyFocus
)


class ExamSerializer(serializers.ModelSerializer):
    """Serializer for Exam."""
    
    class Meta:
        model = Exam
        fields = [
            'id',
            'code',
            'name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DifficultyLevelSerializer(serializers.ModelSerializer):
    """Serializer for DifficultyLevel."""
    level_display = serializers.CharField(
        source='get_level_display',
        read_only=True
    )
    
    class Meta:
        model = DifficultyLevel
        fields = [
            'id',
            'level',
            'level_display',
            'order',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MockTestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for MockTest list views."""
    exam_name = serializers.CharField(
        source='exam.name',
        read_only=True
    )
    test_type_display = serializers.CharField(
        source='get_test_type_display',
        read_only=True
    )
    difficulty_level = serializers.CharField(
        source='difficulty.level',
        read_only=True
    )
    questions_count = serializers.IntegerField(
        source='questions.count',
        read_only=True
    )
    
    class Meta:
        model = MockTest
        fields = [
            'id',
            'title',
            'exam',
            'exam_name',
            'test_type',
            'test_type_display',
            'total_questions',
            'questions_count',
            'total_marks',
            'duration_minutes',
            'difficulty',
            'difficulty_level',
            'is_vip',
            'is_active',
            'created_at',
        ]


class MockTestDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for MockTest."""
    difficulty = DifficultyLevelSerializer(read_only=True)
    difficulty_id = serializers.PrimaryKeyRelatedField(
        queryset=DifficultyLevel.objects.all(),
        source='difficulty',
        write_only=True,
        allow_null=True
    )
    exam_name = serializers.SerializerMethodField()
    
    def get_exam_name(self, obj):
        """Get exam name, return None if exam is not set."""
        return obj.exam.name if obj.exam else None
    test_type_display = serializers.CharField(
        source='get_test_type_display',
        read_only=True
    )
    questions_count = serializers.IntegerField(
        source='questions.count',
        read_only=True
    )
    
    class Meta:
        model = MockTest
        fields = [
            'id',
            'title',
            'exam',
            'exam_name',
            'test_type',
            'test_type_display',
            'total_questions',
            'questions_count',
            'marks_per_question',
            'negative_marks',
            'total_marks',
            'duration_minutes',
            'difficulty',
            'difficulty_id',
            'is_vip',
            'is_active',
            'instructions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'total_marks', 'created_at', 'updated_at', 'questions_count']


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for Question."""
    mock_test_title = serializers.CharField(
        source='mock_test.title',
        read_only=True
    )
    question_type_display = serializers.CharField(
        source='get_question_type_display',
        read_only=True
    )
    difficulty_level = DifficultyLevelSerializer(read_only=True)
    difficulty_level_id = serializers.PrimaryKeyRelatedField(
        queryset=DifficultyLevel.objects.all(),
        source='difficulty_level',
        write_only=True
    )
    
    class Meta:
        model = Question
        fields = [
            'id',
            'mock_test',
            'mock_test_title',
            'question_number',
            'question_type',
            'question_type_display',
            'text',
            'subject',
            'option_a',
            'option_b',
            'option_c',
            'option_d',
            'correct_option',
            'difficulty_level',
            'difficulty_level_id',
            'topic',
            'explanation',
            'marks',
            'negative_marks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Question list."""
    question_type_display = serializers.CharField(
        source='get_question_type_display',
        read_only=True
    )
    difficulty_level_display = serializers.CharField(
        source='difficulty_level.get_level_display',
        read_only=True
    )
    
    class Meta:
        model = Question
        fields = [
            'id',
            'question_number',
            'question_type',
            'question_type_display',
            'text',
            'subject',
            'topic',
            'difficulty_level_display',
            'marks',
        ]


class StudentProfileSerializer(serializers.ModelSerializer):
    """Serializer for StudentProfile."""
    user_email = serializers.EmailField(
        source='user.email',
        read_only=True
    )
    class_level_display = serializers.CharField(
        source='get_class_level_display',
        read_only=True
    )
    exam_target_display = serializers.CharField(
        source='get_exam_target_display',
        read_only=True
    )
    
    class Meta:
        model = StudentProfile
        fields = [
            'id',
            'user',
            'user_email',
            'class_level',
            'class_level_display',
            'exam_target',
            'exam_target_display',
            'total_xp',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'total_xp', 'created_at', 'updated_at']


class StudentProfileCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating StudentProfile."""
    
    class Meta:
        model = StudentProfile
        fields = [
            'class_level',
            'exam_target',
        ]


class TestAttemptListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for TestAttempt list."""
    student_email = serializers.EmailField(
        source='student.user.email',
        read_only=True
    )
    mock_test_title = serializers.CharField(
        source='mock_test.title',
        read_only=True
    )
    
    class Meta:
        model = TestAttempt
        fields = [
            'id',
            'student',
            'student_email',
            'mock_test',
            'mock_test_title',
            'score',
            'percentage',
            'percentile',
            'is_completed',
            'started_at',
            'completed_at',
        ]


class TestAttemptDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for TestAttempt."""
    student = StudentProfileSerializer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset=StudentProfile.objects.all(),
        source='student',
        write_only=True
    )
    mock_test = MockTestDetailSerializer(read_only=True)
    mock_test_id = serializers.PrimaryKeyRelatedField(
        queryset=MockTest.objects.filter(is_active=True),
        source='mock_test',
        write_only=True
    )
    answers_count = serializers.IntegerField(
        source='answers.count',
        read_only=True
    )
    
    class Meta:
        model = TestAttempt
        fields = [
            'id',
            'student',
            'student_id',
            'mock_test',
            'mock_test_id',
            'score',
            'percentage',
            'percentile',
            'correct_count',
            'wrong_count',
            'unanswered_count',
            'started_at',
            'completed_at',
            'is_completed',
            'time_taken_seconds',
            'answers_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'score',
            'percentage',
            'percentile',
            'correct_count',
            'wrong_count',
            'unanswered_count',
            'completed_at',
            'created_at',
            'updated_at',
        ]


class TestAttemptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a test attempt."""
    mock_test_id = serializers.PrimaryKeyRelatedField(
        queryset=MockTest.objects.filter(is_active=True),
        source='mock_test'
    )
    
    class Meta:
        model = TestAttempt
        fields = [
            'mock_test_id',
        ]
    
    def validate(self, data):
        """Check if student already has an active attempt."""
        # Get user from context (either from request or passed directly)
        user = self.context.get('user')
        if not user:
            # Fallback to request.user if user not in context
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
            else:
                # Use default user for development
                from accounts.models import CustomUser
                try:
                    user = CustomUser.objects.get(email='el@gmail.com')
                except CustomUser.DoesNotExist:
                    raise serializers.ValidationError({
                        'non_field_errors': ['User not found. Please ensure default user (el@gmail.com) exists.']
                    })
        
        try:
            student = user.student_profile
        except StudentProfile.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': [f'Student profile not found for user: {user.email}. Please create a student profile.']
            })
        
        # The field is 'mock_test_id' but source is 'mock_test'
        mock_test = data.get('mock_test')  # This is set by the source='mock_test' mapping
        if not mock_test:
            raise serializers.ValidationError({
                'mock_test_id': ['This field is required.']
            })
        
        # Note: We allow resuming existing attempts, so we don't block here
        # The frontend will check for existing attempts and resume them
        return data


class StudentAnswerSerializer(serializers.ModelSerializer):
    """Serializer for StudentAnswer."""
    question = QuestionSerializer(read_only=True)
    question_id = serializers.PrimaryKeyRelatedField(
        queryset=Question.objects.all(),
        source='question',
        write_only=True
    )
    question_text = serializers.CharField(
        source='question.text',
        read_only=True
    )
    
    class Meta:
        model = StudentAnswer
        fields = [
            'id',
            'attempt',
            'question',
            'question_id',
            'question_text',
            'selected_option',
            'is_correct',
            'marks_obtained',
            'time_taken_seconds',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'is_correct',
            'marks_obtained',
            'created_at',
            'updated_at',
        ]


class StudentAnswerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating student answers."""
    
    class Meta:
        model = StudentAnswer
        fields = [
            'question',
            'selected_option',
            'time_taken_seconds',
        ]
    
    def validate(self, data):
        """Validate answer belongs to attempt's test."""
        attempt = self.context['attempt']
        question = data['question']
        
        if question.mock_test != attempt.mock_test:
            raise serializers.ValidationError(
                'Question does not belong to this test.'
            )
        
        return data


class MistakeNotebookSerializer(serializers.ModelSerializer):
    """Serializer for MistakeNotebook."""
    student_email = serializers.EmailField(
        source='student.user.email',
        read_only=True
    )
    question_text = serializers.CharField(
        source='question.text',
        read_only=True
    )
    question_number = serializers.IntegerField(
        source='question.question_number',
        read_only=True
    )
    question_subject = serializers.CharField(
        source='question.subject',
        read_only=True
    )
    question_chapter = serializers.CharField(
        source='question.chapter',
        read_only=True
    )
    question_correct_option = serializers.CharField(
        source='question.correct_option',
        read_only=True
    )
    question_option_a = serializers.CharField(
        source='question.option_a',
        read_only=True
    )
    question_option_b = serializers.CharField(
        source='question.option_b',
        read_only=True
    )
    question_option_c = serializers.CharField(
        source='question.option_c',
        read_only=True
    )
    question_option_d = serializers.CharField(
        source='question.option_d',
        read_only=True
    )
    question_explanation = serializers.CharField(
        source='question.explanation',
        read_only=True
    )
    test_title = serializers.SerializerMethodField()
    error_type_display = serializers.CharField(
        source='get_error_type_display',
        read_only=True
    )
    
    def get_test_title(self, obj):
        """Safely get test title, handling None attempt."""
        if obj.attempt and obj.attempt.mock_test:
            return obj.attempt.mock_test.title
        return None
    
    class Meta:
        model = MistakeNotebook
        fields = [
            'id',
            'student',
            'student_email',
            'question',
            'question_text',
            'question_number',
            'question_subject',
            'question_chapter',
            'question_correct_option',
            'question_option_a',
            'question_option_b',
            'question_option_c',
            'question_option_d',
            'question_explanation',
            'attempt',
            'test_title',
            'error_type',
            'error_type_display',
            'notes',
            'logged_at',
        ]
        read_only_fields = ['id', 'student', 'logged_at']


class StudyGuildSerializer(serializers.ModelSerializer):
    """Serializer for StudyGuild."""
    leader_email = serializers.EmailField(
        source='leader.user.email',
        read_only=True
    )
    members_count = serializers.IntegerField(
        source='members.count',
        read_only=True
    )
    is_unlocked = serializers.BooleanField(
        read_only=True
    )
    members = StudentProfileSerializer(many=True, read_only=True)
    
    class Meta:
        model = StudyGuild
        fields = [
            'id',
            'name',
            'leader',
            'leader_email',
            'members',
            'members_count',
            'description',
            'is_active',
            'is_unlocked',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'members_count', 'is_unlocked']


class XPLogSerializer(serializers.ModelSerializer):
    """Serializer for XPLog."""
    student_email = serializers.EmailField(
        source='student.user.email',
        read_only=True
    )
    
    class Meta:
        model = XPLog
        fields = [
            'id',
            'student',
            'student_email',
            'action',
            'xp_amount',
            'source_type',
            'source_id',
            'logged_at',
        ]
        read_only_fields = fields


class LeaderboardSerializer(serializers.ModelSerializer):
    """Serializer for Leaderboard."""
    student_email = serializers.EmailField(
        source='student.user.email',
        read_only=True
    )
    leaderboard_type_display = serializers.CharField(
        source='get_leaderboard_type_display',
        read_only=True
    )
    
    class Meta:
        model = Leaderboard
        fields = [
            'id',
            'student',
            'student_email',
            'leaderboard_type',
            'leaderboard_type_display',
            'period_start',
            'period_end',
            'total_score',
            'total_tests',
            'average_score',
            'rank',
            'updated_at',
        ]
        read_only_fields = fields


class DailyFocusSerializer(serializers.ModelSerializer):
    """Serializer for DailyFocus."""
    student_email = serializers.EmailField(
        source='student.user.email',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    source_display = serializers.CharField(
        source='get_source_display',
        read_only=True
    )
    
    class Meta:
        model = DailyFocus
        fields = [
            'id',
            'student',
            'student_email',
            'date',
            'status',
            'status_display',
            'source',
            'source_display',
            'created_at',
        ]
        read_only_fields = ['id', 'student', 'created_at']

