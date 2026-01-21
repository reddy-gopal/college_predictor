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
    PhoneOTP, Exam, DifficultyLevel, MockTest, QuestionBank,
    StudentProfile, TestAttempt, StudentAnswer, MistakeNotebook,
    StudyGuild, XPLog, Leaderboard, DailyFocus,
    Room, RoomParticipant, RoomQuestion, ParticipantAttempt
)


class ExamSerializer(serializers.ModelSerializer):
    """Serializer for Exam."""
    
    class Meta:
        model = Exam
        fields = [
            'id',
            'code',
            'name',
            'logo',
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
        source='test_questions.count',
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
        source='test_questions.count',
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


class QuestionBankSerializer(serializers.ModelSerializer):
    """Serializer for QuestionBank (new canonical question format)."""
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
        model = QuestionBank
        fields = [
            'id',
            'question_type',
            'question_type_display',
            'text',
            'subject',
            'exam',
            'year',
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
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'question_hash', 'created_at', 'updated_at']


class UnifiedQuestionSerializer(serializers.ModelSerializer):
    """
    Unified serializer for QuestionBank.
    """
    question_type_display = serializers.CharField(
        source='get_question_type_display',
        read_only=True
    )
    difficulty_level = DifficultyLevelSerializer(read_only=True)
    question_number = serializers.IntegerField(read_only=True, allow_null=True)
    
    class Meta:
        model = QuestionBank
        fields = [
            'id',
            'question_type',
            'question_type_display',
            'text',
            'subject',
            'exam',
            'year',
            'option_a',
            'option_b',
            'option_c',
            'option_d',
            'correct_option',
            'difficulty_level',
            'topic',
            'explanation',
            'marks',
            'negative_marks',
            'question_number',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuestionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for QuestionBank list."""
    question_type_display = serializers.CharField(
        source='get_question_type_display',
        read_only=True
    )
    difficulty_level_display = serializers.CharField(
        source='difficulty_level.get_level_display',
        read_only=True
    )
    
    class Meta:
        model = QuestionBank
        fields = [
            'id',
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
    question = UnifiedQuestionSerializer(read_only=True, source='get_question')
    question_bank_id = serializers.PrimaryKeyRelatedField(
        queryset=QuestionBank.objects.all(),
        source='question_bank',
        write_only=True
    )
    question_text = serializers.SerializerMethodField()
    question_number = serializers.SerializerMethodField()
    
    def get_question_text(self, obj):
        """Get question text."""
        return obj.question_bank.text if obj.question_bank else ''
    
    def get_question_number(self, obj):
        """Get question number from MockTestQuestion."""
        try:
            # Get the question number from MockTestQuestion for this attempt's mock test
            from .models import MockTestQuestion
            mtq = MockTestQuestion.objects.filter(
                mock_test=obj.attempt.mock_test,
                question=obj.question_bank
            ).first()
            return mtq.question_number if mtq else None
        except Exception:
            return None
    
    class Meta:
        model = StudentAnswer
        fields = [
            'id',
            'attempt',
            'question',
            'question_bank_id',
            'question_text',
            'question_number',
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
            'question_number',
            'created_at',
            'updated_at',
        ]


class StudentAnswerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating student answers."""
    
    class Meta:
        model = StudentAnswer
        fields = [
            'question_bank',
            'selected_option',
            'time_taken_seconds',
        ]


class MistakeNotebookSerializer(serializers.ModelSerializer):
    """Serializer for MistakeNotebook."""
    student_email = serializers.EmailField(
        source='student.user.email',
        read_only=True
    )
    question = UnifiedQuestionSerializer(read_only=True, source='get_question')
    question_text = serializers.SerializerMethodField()
    question_number = serializers.SerializerMethodField()
    question_subject = serializers.SerializerMethodField()
    question_chapter = serializers.SerializerMethodField()
    question_correct_option = serializers.SerializerMethodField()
    question_option_a = serializers.SerializerMethodField()
    question_option_b = serializers.SerializerMethodField()
    question_option_c = serializers.SerializerMethodField()
    question_option_d = serializers.SerializerMethodField()
    question_explanation = serializers.SerializerMethodField()
    test_title = serializers.SerializerMethodField()
    error_type_display = serializers.CharField(
        source='get_error_type_display',
        read_only=True
    )
    
    def get_question_text(self, obj):
        return obj.question_bank.text if obj.question_bank else ''
    
    def get_question_number(self, obj):
        return None  # QuestionBank doesn't have question_number
    
    def get_question_subject(self, obj):
        return obj.question_bank.subject if obj.question_bank else ''
    
    def get_question_chapter(self, obj):
        return ''  # Chapter field doesn't exist
    
    def get_question_correct_option(self, obj):
        return obj.question_bank.correct_option if obj.question_bank else ''
    
    def get_question_option_a(self, obj):
        return (obj.question_bank.option_a or '') if obj.question_bank else ''
    
    def get_question_option_b(self, obj):
        return (obj.question_bank.option_b or '') if obj.question_bank else ''
    
    def get_question_option_c(self, obj):
        return (obj.question_bank.option_c or '') if obj.question_bank else ''
    
    def get_question_option_d(self, obj):
        return (obj.question_bank.option_d or '') if obj.question_bank else ''
    
    def get_question_explanation(self, obj):
        return (obj.question_bank.explanation or '') if obj.question_bank else ''
    
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


class RoomQuestionSerializer(serializers.ModelSerializer):
    """Serializer for RoomQuestion."""
    question = UnifiedQuestionSerializer(read_only=True, source='get_question')
    question_bank_id = serializers.PrimaryKeyRelatedField(
        queryset=QuestionBank.objects.all(),
        source='question_bank',
        write_only=True
    )
    
    class Meta:
        model = RoomQuestion
        fields = [
            'id',
            'room',
            'question',
            'question_bank_id',
            'question_number',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ParticipantAttemptSerializer(serializers.ModelSerializer):
    """Serializer for ParticipantAttempt."""
    room_question = RoomQuestionSerializer(read_only=True)
    room_question_id = serializers.PrimaryKeyRelatedField(
        queryset=RoomQuestion.objects.all(),
        source='room_question',
        write_only=True
    )
    
    class Meta:
        model = ParticipantAttempt
        fields = [
            'id',
            'participant',
            'room_question',
            'room_question_id',
            'selected_option',
            'answer_text',
            'is_correct',
            'marks_obtained',
            'time_spent_seconds',
            'started_at',
            'submitted_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_correct', 'marks_obtained', 'created_at', 'updated_at']


class ParticipantAttemptCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating ParticipantAttempt."""
    
    class Meta:
        model = ParticipantAttempt
        fields = [
            'room_question',
            'selected_option',
            'answer_text',
            'time_spent_seconds',
            'started_at',
            'submitted_at',
        ]


class RoomParticipantSerializer(serializers.ModelSerializer):
    """Serializer for RoomParticipant."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = RoomParticipant
        fields = [
            'id',
            'room',
            'user',
            'user_email',
            'user_name',
            'joined_at',
            'status',
            'status_display',
            'randomization_seed',
        ]
        read_only_fields = ['id', 'joined_at', 'randomization_seed']
    
    def get_user_name(self, obj):
        """Get user's full name or email."""
        if obj.user.first_name or obj.user.last_name:
            return f"{obj.user.first_name or ''} {obj.user.last_name or ''}".strip()
        return obj.user.email


class RoomCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a Room."""
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text="Password for private rooms (leave empty for public rooms)"
    )
    exam = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.all(),
        source='exam_id'
    )
    code = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Room code (auto-generated if not provided)"
    )
    
    class Meta:
        model = Room
        fields = [
            'code',
            'exam',
            'subject_mode',
            'subjects',
            'number_of_questions',
            'time_per_question',
            'time_buffer',
            'difficulty',
            'question_types',
            'question_type_mix',
            'randomization_mode',
            'privacy',
            'password',
            'participant_limit',
            'allow_pause',
            'start_time',
        ]
    
    def validate(self, attrs):
        """Validate room configuration."""
        # Validate password for private rooms
        if attrs.get('privacy') == Room.PRIVATE:
            password = attrs.get('password', '')
            if not password:
                raise serializers.ValidationError({
                    'password': 'Password is required for private rooms.'
                })
        
        # Validate subjects for specific mode
        if attrs.get('subject_mode') == Room.SubjectMode.SPECIFIC:
            subjects = attrs.get('subjects', [])
            if not subjects or len(subjects) == 0:
                raise serializers.ValidationError({
                    'subjects': 'Subjects must be specified when subject_mode is "specific".'
                })
        
        # Validate number of questions
        number_of_questions = attrs.get('number_of_questions', 0)
        if number_of_questions <= 0:
            raise serializers.ValidationError({
                'number_of_questions': 'Number of questions must be greater than 0.'
            })
        
        # Validate time per question
        time_per_question = attrs.get('time_per_question', 0)
        if time_per_question <= 0:
            raise serializers.ValidationError({
                'time_per_question': 'Time per question must be greater than 0.'
            })
        
        return attrs
    
    def create(self, validated_data):
        """Create room with password hashing."""
        from django.contrib.auth.hashers import make_password
        import secrets
        import string
        
        # Generate unique room code
        code = validated_data.pop('code', None)
        if not code:
            while True:
                code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
                if not Room.objects.filter(code=code).exists():
                    break
        
        # Handle password
        password = validated_data.pop('password', None)
        if password and validated_data.get('privacy') == Room.PRIVATE:
            validated_data['password_hash'] = make_password(password)
        elif validated_data.get('privacy') == Room.PUBLIC:
            validated_data['password_hash'] = None
        
        # Set host
        validated_data['host'] = self.context['request'].user
        
        room = Room.objects.create(code=code, **validated_data)
        return room


class RoomListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Room list views."""
    host_email = serializers.EmailField(source='host.email', read_only=True)
    exam_name = serializers.CharField(source='exam_id.name', read_only=True)
    participant_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    privacy_display = serializers.CharField(source='get_privacy_display', read_only=True)
    is_full = serializers.SerializerMethodField()
    
    class Meta:
        model = Room
        fields = [
            'id',
            'code',
            'host',
            'host_email',
            'exam_id',
            'exam_name',
            'number_of_questions',
            'duration',
            'time_per_question',
            'difficulty',
            'privacy',
            'privacy_display',
            'participant_limit',
            'participant_count',
            'is_full',
            'status',
            'status_display',
            'start_time',
            'created_at',
        ]
        read_only_fields = ['id', 'duration', 'created_at']
    
    def get_participant_count(self, obj):
        """Get count of active participants."""
        return obj.participants.filter(status=RoomParticipant.JOINED).count()
    
    def get_is_full(self, obj):
        """Check if room is full."""
        return obj.is_full()


class RoomDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Room."""
    host_email = serializers.EmailField(source='host.email', read_only=True)
    host_name = serializers.SerializerMethodField()
    exam = ExamSerializer(source='exam_id', read_only=True)
    participants = RoomParticipantSerializer(many=True, read_only=True)
    participant_count = serializers.SerializerMethodField()
    questions_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    privacy_display = serializers.CharField(source='get_privacy_display', read_only=True)
    subject_mode_display = serializers.CharField(source='get_subject_mode_display', read_only=True)
    difficulty_display = serializers.CharField(source='get_difficulty_display', read_only=True)
    question_type_mix_display = serializers.CharField(source='get_question_type_mix_display', read_only=True)
    randomization_mode_display = serializers.CharField(source='get_randomization_mode_display', read_only=True)
    is_full = serializers.SerializerMethodField()
    can_be_edited = serializers.SerializerMethodField()
    is_host = serializers.SerializerMethodField()
    
    class Meta:
        model = Room
        fields = [
            'id',
            'code',
            'host',
            'host_email',
            'host_name',
            'exam',
            'exam_id',
            'subject_mode',
            'subject_mode_display',
            'subjects',
            'number_of_questions',
            'time_per_question',
            'duration',
            'time_buffer',
            'difficulty',
            'difficulty_display',
            'question_types',
            'question_type_mix',
            'question_type_mix_display',
            'randomization_mode',
            'randomization_mode_display',
            'privacy',
            'privacy_display',
            'participant_limit',
            'participant_count',
            'is_full',
            'allow_pause',
            'start_time',
            'status',
            'status_display',
            'participants',
            'questions_count',
            'can_be_edited',
            'is_host',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id', 'code', 'host', 'duration', 'status', 'created_at', 'updated_at',
            'participant_count', 'questions_count', 'is_full', 'can_be_edited', 'is_host'
        ]
    
    def get_host_name(self, obj):
        """Get host's full name or email."""
        if obj.host.first_name or obj.host.last_name:
            return f"{obj.host.first_name or ''} {obj.host.last_name or ''}".strip()
        return obj.host.email
    
    def get_participant_count(self, obj):
        """Get count of active participants."""
        return obj.participants.filter(status=RoomParticipant.JOINED).count()
    
    def get_questions_count(self, obj):
        """Get count of questions in room."""
        return obj.room_questions.count()
    
    def get_is_full(self, obj):
        """Check if room is full."""
        return obj.is_full()
    
    def get_can_be_edited(self, obj):
        """Check if room can be edited."""
        return obj.can_be_edited()
    
    def get_is_host(self, obj):
        """Check if current user is the host."""
        request = self.context.get('request')
        if request and request.user:
            return obj.host == request.user
        return False


class RoomJoinSerializer(serializers.Serializer):
    """Serializer for joining a room."""
    code = serializers.CharField(max_length=10, required=True)
    password = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validate join request."""
        code = attrs.get('code', '').upper()
        room = Room.objects.filter(code=code).first()
        
        if not room:
            raise serializers.ValidationError({
                'code': 'Invalid room code.'
            })
        
        # Check if room is full
        if room.is_full():
            raise serializers.ValidationError({
                'code': 'Room is full.'
            })
        
        # Check if test already started
        if room.status != Room.Status.WAITING:
            raise serializers.ValidationError({
                'code': f'Room is {room.get_status_display().lower()}. Cannot join.'
            })
        
        # Validate password for private rooms
        if room.privacy == Room.PRIVATE:
            password = attrs.get('password', '')
            if not password:
                raise serializers.ValidationError({
                    'password': 'Password is required for private rooms.'
                })
            
            from django.contrib.auth.hashers import check_password
            if not check_password(password, room.password_hash):
                raise serializers.ValidationError({
                    'password': 'Incorrect password.'
                })
        
        attrs['room'] = room
        return attrs

