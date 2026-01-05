from rest_framework import serializers

from .models import ExamModel, CollegeModel, CourseModel, CutoffModel, Prediction, ScoreToRankModel

class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamModel
        fields = '__all__'

class CollegeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollegeModel
        fields = '__all__'


class CourseSerializer(serializers.ModelSerializer):
    college = CollegeSerializer(read_only=True)
    class Meta:
        model = CourseModel
        fields = ('id', 'name', 'college', 'duration', 'degree', 'branch', 'total_seats')


class CutoffSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    class Meta:
        model = CutoffModel
        fields = ('id', 'exam', 'course', 'year', 'category', 'quota', 'state', 'opening_rank', 'closing_rank')

class PredictionSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    class Meta:
        model = Prediction
        fields = ('id', 'input_rank', 'exam', 'category', 'state', 'branch_list', 'timestamp', 'predicted_result')



class ScoreToRankSerializer(serializers.ModelSerializer):
    exam = ExamSerializer(read_only=True)
    class Meta:
        model = ScoreToRankModel
        fields = ('id', 'exam', 'score_low', 'score_high', 'percentile_low', 'percentile_high', 'rank_low', 'rank_high', 'year', 'category')