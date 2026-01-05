from .views import ExamViewSet, CollegeViewSet, CourseViewSet, CutoffViewSet, PredictionViewSet, predict_college, get_rank_from_score, ScoreToRankViewSet, get_categories
from django.urls import path, include

from rest_framework.routers import DefaultRouter
router = DefaultRouter()

router.register(r'exams', ExamViewSet)
router.register(r'colleges', CollegeViewSet)
router.register(r'courses', CourseViewSet)
router.register(r'cutoffs', CutoffViewSet)
router.register(r'predictions', PredictionViewSet)
router.register(r'score-to-rank', ScoreToRankViewSet)
urlpatterns = [
    path('', include(router.urls)),
    path('predict-college/', predict_college, name='predict_college'),
    path('get-rank-from-score/', get_rank_from_score, name='get_rank_from_score'),
    path('get-categories/', get_categories, name='get_categories'),
]