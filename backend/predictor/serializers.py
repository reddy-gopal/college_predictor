"""
Predictor App Serializers

Design Decisions:
1. Nested serializers for related objects (College → Courses, Exam → Cutoffs)
2. Separate list vs detail serializers for performance
3. Read-only nested fields to prevent accidental updates
4. Validation for rank ranges and score ranges
5. Choice fields return both value and display name
"""
from rest_framework import serializers
from .models import Exam, College, Course, Cutoff, Prediction, ScoreToRank


class ExamSerializer(serializers.ModelSerializer):
    """Serializer for Exam model."""
    
    class Meta:
        model = Exam
        fields = [
            'id',
            'name',
            'code',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CollegeSerializer(serializers.ModelSerializer):
    """Serializer for College model."""
    college_type_display = serializers.CharField(
        source='get_college_type_display',
        read_only=True
    )
    courses_count = serializers.IntegerField(
        source='courses.count',
        read_only=True
    )
    
    class Meta:
        model = College
        fields = [
            'id',
            'name',
            'code',
            'location',
            'state',
            'college_type',
            'college_type_display',
            'is_active',
            'courses_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'courses_count']


class CourseSerializer(serializers.ModelSerializer):
    """Serializer for Course model."""
    college = CollegeSerializer(read_only=True)
    college_id = serializers.PrimaryKeyRelatedField(
        queryset=College.objects.all(),
        source='college',
        write_only=True
    )
    degree_display = serializers.CharField(
        source='get_degree_display',
        read_only=True
    )
    branch_display = serializers.CharField(
        source='get_branch_display',
        read_only=True
    )
    
    class Meta:
        model = Course
        fields = [
            'id',
            'name',
            'college',
            'college_id',
            'duration',
            'degree',
            'degree_display',
            'branch',
            'branch_display',
            'total_seats',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CourseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Course list views."""
    college_name = serializers.CharField(
        source='college.name',
        read_only=True
    )
    college_location = serializers.CharField(
        source='college.location',
        read_only=True
    )
    degree_display = serializers.CharField(
        source='get_degree_display',
        read_only=True
    )
    branch_display = serializers.CharField(
        source='get_branch_display',
        read_only=True
    )
    
    class Meta:
        model = Course
        fields = [
            'id',
            'name',
            'college_name',
            'college_location',
            'duration',
            'degree',
            'degree_display',
            'branch',
            'branch_display',
            'total_seats',
        ]


class CutoffSerializer(serializers.ModelSerializer):
    """Serializer for Cutoff model."""
    exam = ExamSerializer(read_only=True)
    exam_id = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.all(),
        source='exam',
        write_only=True
    )
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.all(),
        source='course',
        write_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    quota_display = serializers.CharField(
        source='get_quota_display',
        read_only=True
    )
    seat_type_display = serializers.CharField(
        source='get_seat_type_display',
        read_only=True
    )
    
    class Meta:
        model = Cutoff
        fields = [
            'id',
            'exam',
            'exam_id',
            'course',
            'course_id',
            'year',
            'category',
            'category_display',
            'quota',
            'quota_display',
            'seat_type',
            'seat_type_display',
            'state',
            'opening_rank',
            'closing_rank',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate that opening_rank <= closing_rank."""
        opening_rank = data.get('opening_rank')
        closing_rank = data.get('closing_rank')
        
        if opening_rank and closing_rank and opening_rank > closing_rank:
            raise serializers.ValidationError({
                'closing_rank': 'Closing rank must be greater than or equal to opening rank.'
            })
        
        return data


class CutoffListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Cutoff list views."""
    exam_name = serializers.CharField(
        source='exam.name',
        read_only=True
    )
    course_name = serializers.CharField(
        source='course.name',
        read_only=True
    )
    college_name = serializers.CharField(
        source='course.college.name',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    class Meta:
        model = Cutoff
        fields = [
            'id',
            'exam_name',
            'course_name',
            'college_name',
            'year',
            'category',
            'category_display',
            'quota',
            'state',
            'opening_rank',
            'closing_rank',
        ]


class PredictionSerializer(serializers.ModelSerializer):
    """Serializer for Prediction model."""
    exam = ExamSerializer(read_only=True)
    exam_id = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.all(),
        source='exam',
        write_only=True
    )
    user_email = serializers.EmailField(
        source='user.email',
        read_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    class Meta:
        model = Prediction
        fields = [
            'id',
            'user',
            'user_email',
            'exam',
            'exam_id',
            'input_rank',
            'category',
            'category_display',
            'state',
            'branch_list',
            'input_snapshot',
            'predicted_result',
            'timestamp',
        ]
        read_only_fields = ['id', 'user', 'timestamp']


class PredictionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating predictions."""
    exam_id = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.filter(is_active=True),
        source='exam'
    )
    
    class Meta:
        model = Prediction
        fields = [
            'exam_id',
            'input_rank',
            'category',
            'state',
            'branch_list',
        ]
    
    def validate_input_rank(self, value):
        """Validate input rank is positive."""
        if value <= 0:
            raise serializers.ValidationError('Input rank must be positive.')
        return value


class ScoreToRankSerializer(serializers.ModelSerializer):
    """Serializer for ScoreToRank model."""
    exam = ExamSerializer(read_only=True)
    exam_id = serializers.PrimaryKeyRelatedField(
        queryset=Exam.objects.all(),
        source='exam',
        write_only=True
    )
    category_display = serializers.CharField(
        source='get_category_display',
        read_only=True
    )
    
    class Meta:
        model = ScoreToRank
        fields = [
            'id',
            'exam',
            'exam_id',
            'year',
            'category',
            'category_display',
            'score_low',
            'score_high',
            'percentile_low',
            'percentile_high',
            'rank_low',
            'rank_high',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate score and rank ranges."""
        score_low = data.get('score_low')
        score_high = data.get('score_high')
        rank_low = data.get('rank_low')
        rank_high = data.get('rank_high')
        
        if score_low and score_high and score_low > score_high:
            raise serializers.ValidationError({
                'score_high': 'Score high must be greater than or equal to score low.'
            })
        
        if rank_low and rank_high and rank_low > rank_high:
            raise serializers.ValidationError({
                'rank_high': 'Rank high must be greater than or equal to rank low.'
            })
        
        percentile_low = data.get('percentile_low')
        percentile_high = data.get('percentile_high')
        
        if percentile_low is not None and percentile_high is not None:
            if percentile_low < 0 or percentile_low > 100:
                raise serializers.ValidationError({
                    'percentile_low': 'Percentile must be between 0 and 100.'
                })
            if percentile_high < 0 or percentile_high > 100:
                raise serializers.ValidationError({
                    'percentile_high': 'Percentile must be between 0 and 100.'
                })
            if percentile_low > percentile_high:
                raise serializers.ValidationError({
                    'percentile_high': 'Percentile high must be greater than or equal to percentile low.'
                })
        
        return data
